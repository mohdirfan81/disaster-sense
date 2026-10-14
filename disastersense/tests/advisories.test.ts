import { describe, expect, it } from "vitest";
import {
  highestAdvisoryLevel,
  riverAdvisories,
  seismicAdvisories,
  weatherAdvisories,
} from "@/lib/advisories";
import type { EarthquakeData, WaterLevelData, WeatherData } from "@/lib/openmeteo";

function weather(overrides: Partial<WeatherData["current"]> = {}, precip: number[] = []): WeatherData {
  return {
    current: {
      temperature: 28,
      windspeed: 12,
      winddirection: 90,
      weathercode: 1,
      precipitation: 0,
      time: new Date().toISOString(),
      ...overrides,
    },
    hourly: {
      time: Array.from({ length: 24 }, (_, i) => new Date(Date.now() + i * 3600_000).toISOString()),
      temperature_2m: new Array(24).fill(28),
      precipitation: precip.length ? precip : new Array(24).fill(0),
      windspeed_10m: new Array(24).fill(12),
    },
  };
}

function river(discharge: Array<number | null>): WaterLevelData {
  return {
    coordinates: { lat: 17.4, lng: 78.4 },
    daily: {
      time: discharge.map((_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`),
      river_discharge: discharge,
    },
    fetchedAt: new Date().toISOString(),
    source: "Open-Meteo / GloFAS",
  };
}

function quake(magnitude: number): EarthquakeData {
  return {
    id: `us${magnitude}`,
    coordinates: { lat: 17.4, lng: 78.4 },
    url: "https://earthquake.usgs.gov/event/1",
    magnitude,
    depth: 10,
    location: "10 km NW of Demo",
    time: new Date().toISOString(),
  };
}

describe("weatherAdvisories", () => {
  it("is silent for calm conditions", () => {
    expect(weatherAdvisories(weather())).toEqual([]);
  });

  it("raises a danger level for storm-force wind", () => {
    const out = weatherAdvisories(weather({ windspeed: 70 }));
    expect(out).toHaveLength(1);
    expect(out[0].level).toBe("danger");
  });

  it("raises a danger level for thunderstorm codes", () => {
    const out = weatherAdvisories(weather({ weathercode: 95 }));
    expect(out.some((a) => a.id === "storm" && a.level === "danger")).toBe(true);
  });

  it("sums the next six hourly precipitation values", () => {
    const sixHours = [10, 10, 10, 10, 10, 10, 0, 0];
    const out = weatherAdvisories(weather({}, sixHours));
    expect(out.some((a) => a.id === "precip6h" && a.level === "warning")).toBe(true);
  });
});

describe("riverAdvisories", () => {
  it("flags a doubling of modeled discharge as danger", () => {
    const out = riverAdvisories(river([100, 130, 170, 210, 300]));
    expect(out.some((a) => a.id === "river-rise" && a.level === "danger")).toBe(true);
  });

  it("flags a moderate rise as a warning", () => {
    const out = riverAdvisories(river([100, 110, 125, 140, 150]));
    expect(out.some((a) => a.id === "river-rise" && a.level === "warning")).toBe(true);
  });

  it("treats a flat forecast as stable info", () => {
    const out = riverAdvisories(river([100, 101, 99, 100]));
    expect(out.some((a) => a.id === "river-stable" && a.level === "info")).toBe(true);
  });

  it("never reports a rise when the provider returns only nulls", () => {
    const out = riverAdvisories(river([null, null]));
    expect(out.some((a) => a.id === "river-data")).toBe(true);
    expect(out.some((a) => a.id === "river-rise")).toBe(false);
  });

  it("flags a rise from a zero baseline instead of calling it stable", () => {
    // A zero baseline makes a percentage change meaningless, so a climb to a
    // positive discharge must be reported as a rise, not described as stable.
    const out = riverAdvisories(river([0, 0, 5, 20, 40]));
    expect(out.some((a) => a.id === "river-rise" && a.level === "warning")).toBe(true);
    expect(out.some((a) => a.id === "river-stable")).toBe(false);
  });

  it("flags positive discharge even if it returns to zero by the end", () => {
    const out = riverAdvisories(river([0, 30, 0]));
    expect(out.some((a) => a.id === "river-rise" && a.level === "warning")).toBe(true);
    expect(out.some((a) => a.id === "river-stable")).toBe(false);
  });

  it("describes an all-zero forecast as stable, not a rise", () => {
    const out = riverAdvisories(river([0, 0, 0, 0]));
    expect(out.some((a) => a.id === "river-stable" && a.level === "info")).toBe(true);
    expect(out.some((a) => a.id === "river-rise")).toBe(false);
  });
});

describe("seismicAdvisories", () => {
  it("returns nothing when there are no recent quakes", () => {
    expect(seismicAdvisories([])).toEqual([]);
  });

  it("ignores small events below M4", () => {
    expect(seismicAdvisories([quake(3.2)]).some((a) => a.id === "quake")).toBe(false);
  });

  it("escalates M5+ to danger using the strongest event", () => {
    const out = seismicAdvisories([quake(3.1), quake(5.4)]);
    expect(out).toHaveLength(1);
    expect(out[0].level).toBe("danger");
    expect(out[0].title).toContain("5.4");
  });
});

describe("highestAdvisoryLevel", () => {
  it("returns null for an empty list", () => {
    expect(highestAdvisoryLevel([])).toBeNull();
  });

  it("picks the worst level regardless of order", () => {
    const out = weatherAdvisories(weather({ windspeed: 70, weathercode: 1 }));
    expect(highestAdvisoryLevel(out)).toBe("danger");
  });
});