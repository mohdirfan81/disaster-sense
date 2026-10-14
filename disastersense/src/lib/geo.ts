import type { Coordinates, DisasterType, Severity } from "@/types/domain";

/**
 * Geospatial helpers. Pure functions so the Geospatial and Risk agents (and
 * their tests) never depend on a map SDK. Swap for a real routing/geocoding
 * API later without touching agent logic.
 */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function centroid(points: Coordinates[]): Coordinates {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/**
 * Demo operations area: a fictional coastal/metro region ("Vasanthapuram
 * Metro") around Hyderabad coordinates so the map has realistic spacing.
 * All seed and simulation data lives inside this bounding box.
 */
export const OPS_CENTER: Coordinates = { lat: 17.385, lng: 78.4867 };

export const ZONE_DEFINITIONS: Array<{
  name: string;
  center: Coordinates;
  radiusKm: number;
}> = [
  { name: "Riverside Ward", center: { lat: 17.4021, lng: 78.4482 }, radiusKm: 2.4 },
  { name: "Old Market District", center: { lat: 17.3724, lng: 78.4758 }, radiusKm: 1.8 },
  { name: "Industrial Belt North", center: { lat: 17.4935, lng: 78.4988 }, radiusKm: 3.1 },
  { name: "Tech Corridor", center: { lat: 17.4435, lng: 78.3772 }, radiusKm: 2.8 },
  { name: "Harbor Settlement", center: { lat: 17.3312, lng: 78.5112 }, radiusKm: 2.2 },
  { name: "Central Station Area", center: { lat: 17.3869, lng: 78.4891 }, radiusKm: 1.5 },
  { name: "Hillview Colony", center: { lat: 17.4215, lng: 78.5312 }, radiusKm: 2.0 },
  { name: "Airport Perimeter", center: { lat: 17.2403, lng: 78.4294 }, radiusKm: 2.6 },
];

export function zoneFor(coordinates: Coordinates): { name: string; distanceKm: number } {
  let best = ZONE_DEFINITIONS[0];
  let bestDist = Infinity;
  for (const zone of ZONE_DEFINITIONS) {
    const d = haversineKm(coordinates, zone.center);
    if (d < bestDist) {
      bestDist = d;
      best = zone;
    }
  }
  return { name: best.name, distanceKm: bestDist };
}

export function jitterAround(center: Coordinates, radiusKm: number): Coordinates {
  // Rough local approximation - fine at city scale.
  const angle = Math.random() * 2 * Math.PI;
  const dist = Math.random() * radiusKm;
  const dLat = (dist * Math.cos(angle)) / 111;
  const dLng = (dist * Math.sin(angle)) / (111 * Math.cos((center.lat * Math.PI) / 180));
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

export const AFFECTED_RADIUS_KM: Record<DisasterType, number> = {
  flood: 1.8,
  fire: 0.6,
  earthquake: 2.5,
  cyclone: 3.2,
  industrial: 1.4,
  medical: 0.3,
  other: 0.8,
};

/**
 * Initial bearing (degrees, 0 = north, clockwise) from `a` to `b`. Used to tell
 * a person which way an approaching hazard lies ("1.2 km NE of you").
 */
export function bearingDegrees(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

/** Snap a bearing to one of 16 compass points. */
export function compassDirection(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 22.5) % 16];
}

/** Human-readable WGS84 coordinate, e.g. `17.38500° N, 78.48670° E`. */
export function formatCoordinate(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lng).toFixed(5)}° ${ew}`;
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}
