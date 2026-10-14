import type { EarthquakeData, WaterLevelData, WeatherData } from "@/lib/openmeteo";

/**
 * Pure advisory rules over live provider data (Open-Meteo weather/river
 * discharge, USGS seismic events). Thresholds are conservative demo heuristics,
 * NOT official warnings — official agencies (IMD/CWC/NDMA) remain authoritative.
 */

export type AdvisoryLevel = "info" | "warning" | "danger";

export interface Advisory {
  id: string;
  level: AdvisoryLevel;
  title: string;
  detail: string;
  source: string;
}

const LEVEL_ORDER: Record<AdvisoryLevel, number> = { info: 0, warning: 1, danger: 2 };

/** Worst level across advisories, or null when there are none. */
export function highestAdvisoryLevel(advisories: Advisory[]): AdvisoryLevel | null {
  let worst: AdvisoryLevel | null = null;
  for (const a of advisories) {
    if (worst === null || LEVEL_ORDER[a.level] > LEVEL_ORDER[worst]) worst = a.level;
  }
  return worst;
}

/** Severe WMO weather codes that warrant immediate attention. */
const SEVERE_CODES = new Set([95, 96, 97, 99]);
const HEAVY_RAIN_CODES = new Set([65, 66, 67, 82]);

export function weatherAdvisories(weather: WeatherData): Advisory[] {
  const out: Advisory[] = [];
  const { current, hourly } = weather;

  if (current.windspeed >= 63) {
    out.push({
      id: "wind",
      level: "danger",
      title: `Dangerous wind: ${Math.round(current.windspeed)} km/h`,
      detail: "Move indoors, away from windows. Avoid open ground and tall structures.",
      source: "Open-Meteo",
    });
  } else if (current.windspeed >= 40) {
    out.push({
      id: "wind",
      level: "warning",
      title: `Strong wind: ${Math.round(current.windspeed)} km/h`,
      detail: "Secure loose objects; outdoor movement may become difficult.",
      source: "Open-Meteo",
    });
  }

  if (SEVERE_CODES.has(current.weathercode)) {
    out.push({
      id: "storm",
      level: "danger",
      title: "Thunderstorm reported at your location",
      detail: "Shelter indoors now; avoid electrical equipment and water bodies.",
      source: "Open-Meteo",
    });
  } else if (HEAVY_RAIN_CODES.has(current.weathercode)) {
    out.push({
      id: "rain",
      level: "warning",
      title: "Heavy rain at your location",
      detail: "Waterlogging and reduced visibility possible; avoid underpasses.",
      source: "Open-Meteo",
    });
  }

  // Sum of the next 6 hourly precipitation values (mm).
  const nextSixHours = hourly.precipitation.slice(0, 6).reduce((sum, v) => sum + (v ?? 0), 0);
  if (nextSixHours >= 80) {
    out.push({
      id: "precip6h",
      level: "danger",
      title: `${Math.round(nextSixHours)} mm rain forecast in 6 hours`,
      detail: "Flash-flood conditions possible; move to higher ground if near a river.",
      source: "Open-Meteo",
    });
  } else if (nextSixHours >= 30) {
    out.push({
      id: "precip6h",
      level: "warning",
      title: `${Math.round(nextSixHours)} mm rain forecast in 6 hours`,
      detail: "Monitor drains and nearby river levels; avoid low-lying roads.",
      source: "Open-Meteo",
    });
  }

  return out;
}

/**
 * River-discharge trend from the GloFAS daily forecast. Discharge is a model
 * output in m³/s at ~5 km resolution — it is not a live gauge reading.
 */
export function riverAdvisories(river: WaterLevelData): Advisory[] {
  const values = river.daily.river_discharge.filter((v): v is number => v !== null);
  if (values.length < 2) {
    return [{
      id: "river-data",
      level: "info",
      title: "No reliable river forecast for this cell",
      detail: "GloFAS has no usable discharge value near this coordinate; check official CWC bulletins.",
      source: river.source,
    }];
  }

  const first = values[0];
  const last = values[values.length - 1];
  const peak = Math.max(...values);

  const out: Advisory[] = [];
  // A zero (or non-positive) baseline makes a percentage change meaningless, so
  // handle it explicitly instead of letting it fall through to "stable". Any
  // positive discharge anywhere in the forecast is flagged as a rise; only an
  // all-zero forecast is described as stable.
  if (first <= 0) {
    if (peak > 0) {
      out.push({
        id: "river-rise",
        level: "warning",
        title: `Modeled discharge increases from a zero baseline (peak ${peak.toFixed(1)} m³/s)`,
        detail:
          "The forecast includes positive discharge after a zero baseline, so a percentage change is not meaningful. Monitor official CWC/IMD bulletins and be ready to move to higher ground.",
        source: river.source,
      });
    } else {
      out.push({
        id: "river-stable",
        level: "info",
        title: "No modeled discharge for this cell",
        detail: "7-day GloFAS forecast stays at zero discharge near your coordinates.",
        source: river.source,
      });
    }
    return out;
  }

  const changePct = ((last - first) / first) * 100;
  if (changePct >= 100) {
    out.push({
      id: "river-rise",
      level: "danger",
      title: `Modeled river discharge may more than double (${changePct.toFixed(0)}%)`,
      detail: "Rising discharge upstream can precede flooding. Move away from the riverbank.",
      source: river.source,
    });
  } else if (changePct >= 40) {
    out.push({
      id: "river-rise",
      level: "warning",
      title: `Modeled river discharge rising (${changePct.toFixed(0)}% over forecast)`,
      detail: "Monitor official CWC/IMD bulletins and be ready to move to higher ground.",
      source: river.source,
    });
  } else {
    out.push({
      id: "river-stable",
      level: "info",
      title: `Modeled discharge stable — peak ${peak.toFixed(1)} m³/s`,
      detail: "7-day GloFAS forecast shows no sharp rise near your coordinates.",
      source: river.source,
    });
  }
  return out;
}

/** USGS reviewed/automatic events near the user in the last 24 hours. */
export function seismicAdvisories(quakes: EarthquakeData[]): Advisory[] {
  if (quakes.length === 0) return [];
  const strongest = quakes.reduce((a, b) => (b.magnitude > a.magnitude ? b : a));
  const level: AdvisoryLevel = strongest.magnitude >= 5 ? "danger" : strongest.magnitude >= 4 ? "warning" : "info";
  if (level === "info") return [];
  return [{
    id: "quake",
    level,
    title: `M${strongest.magnitude.toFixed(1)} earthquake — ${strongest.location}`,
    detail: "Aftershocks possible. Move away from damaged structures and follow official instructions.",
    source: "USGS",
  }];
}