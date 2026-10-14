import { z } from "zod";

/** Provider data is validated; missing measurements are never replaced with zero. */

export interface WeatherData {
  current: {
    precipitation: number;
    temperature: number;
    /** "Feels like" (apparent temperature); omitted if the provider does not return it. */
    feelsLike?: number;
    /** Relative humidity at 2 m (%); omitted if the provider does not return it. */
    humidity?: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    windspeed_10m: number[];
  };
}

export interface EarthquakeData {
  id: string;
  coordinates: { lat: number; lng: number };
  url: string;
  magnitude: number;
  depth: number;
  location: string;
  time: string;
}

export interface WaterLevelData {
  coordinates: { lat: number; lng: number };
  daily: { time: string[]; river_discharge: (number | null)[] };
  fetchedAt: string;
  source: "Open-Meteo / GloFAS";
}

const OPENMETEO_BASE = "https://api.open-meteo.com/v1";

/**
 * Fetch current weather data for a location
 */
export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherData> {
  const url = `${OPENMETEO_BASE}/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation&hourly=temperature_2m,precipitation,wind_speed_10m&forecast_hours=24&timezone=GMT`;
  const data = z.object({
    current: z.object({ temperature_2m: z.number(), apparent_temperature: z.number().optional(), relative_humidity_2m: z.number().optional(), wind_speed_10m: z.number(), wind_direction_10m: z.number(), weather_code: z.number(), precipitation: z.number(), time: z.string() }),
    hourly: z.object({ time: z.array(z.string()), temperature_2m: z.array(z.number()), precipitation: z.array(z.number()), wind_speed_10m: z.array(z.number()) }),
  }).parse(await providerJson(url));
  return {
    current: {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windspeed: data.current.wind_speed_10m,
      winddirection: data.current.wind_direction_10m,
      weathercode: data.current.weather_code,
      precipitation: data.current.precipitation,
      time: `${data.current.time}Z`,
    },
    hourly: {
      time: data.hourly.time.map((time) => `${time}Z`),
      temperature_2m: data.hourly.temperature_2m,
      precipitation: data.hourly.precipitation,
      windspeed_10m: data.hourly.wind_speed_10m,
    },
  };
}

/**
 * Fetch a provider payload with validation-friendly error behaviour.
 *
 * Retries transient failures (connection timeouts / 5xx) up to 3 times —
 * some networks reach Open-Meteo only intermittently, and a single attempt
 * would surface as a 502 in the UI. Client errors (4xx, e.g. bad query
 * parameters) are never retried.
 */
async function providerJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000), next: { revalidate: 300 } });
      if (!response.ok) {
        const error = new Error(`Data provider returned ${response.status}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      const status = (error as { status?: number }).status;
      const permanent = typeof status === "number" && status >= 400 && status < 500;
      if (permanent || attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
}

/** Reviewed and automatic USGS events in the past 24 hours; not predictions. */
export async function fetchEarthquakes(
  lat: number,
  lng: number,
  radiusKm: number = 100,
): Promise<EarthquakeData[]> {
  const start = new Date(Date.now() - 86_400_000).toISOString();
  const data = z.object({ features: z.array(z.object({
    id: z.string(),
    properties: z.object({ mag: z.number().nullable(), place: z.string().nullable(), time: z.number(), url: z.string().url() }),
    geometry: z.object({ coordinates: z.tuple([z.number(), z.number(), z.number()]) }),
  })) }).parse(await providerJson(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=${radiusKm}&starttime=${start}&minmagnitude=2.5&orderby=time&limit=100`));
  return data.features.flatMap((event) => event.properties.mag === null ? [] : [{
    id: event.id, magnitude: event.properties.mag, depth: event.geometry.coordinates[2],
    coordinates: { lat: event.geometry.coordinates[1], lng: event.geometry.coordinates[0] },
    location: event.properties.place ?? "Location not provided", time: new Date(event.properties.time).toISOString(), url: event.properties.url,
  }]);
}

/**
 * Daily modeled discharge, NOT observed water height or a flood warning.
 */
export async function fetchWaterLevels(
  lat: number,
  lng: number,
): Promise<WaterLevelData> {
  const data = z.object({ latitude: z.number(), longitude: z.number(), daily: z.object({
    time: z.array(z.string()).min(1), river_discharge: z.array(z.number().nonnegative().nullable()).min(1),
  }) }).parse(await providerJson(`https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge&forecast_days=7&timezone=GMT`));
  if (data.daily.time.length !== data.daily.river_discharge.length) throw new Error("Incomplete river forecast");
  return { coordinates: { lat: data.latitude, lng: data.longitude }, daily: data.daily, fetchedAt: new Date().toISOString(), source: "Open-Meteo / GloFAS" };
}

/**
 * Get weather description from WMO code
 */
export function getWeatherDescription(code: number): string {
  const codes: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
  };

  return codes[code] || "Unknown";
}
