import type {
  Coordinates,
  DisasterType,
  FacilityType,
  Incident,
  Severity,
} from "@/types/domain";
import { bearingDegrees, compassDirection, haversineKm } from "@/lib/geo";

/**
 * Pure "safety watch" logic: given the device's live GPS position, work out
 * which incidents are dangerously close and which shelters/hospitals are the
 * nearest refuges. No browser or network access here so it stays testable and
 * reusable by the field app / server later.
 */

/** Anything within this radius of the device triggers a proximity alert. */
export const DANGER_RADIUS_KM = 5;

/** Minimal shape we need from an incident to judge proximity. */
export type SafetyIncidentInput = Pick<
  Incident,
  | "id"
  | "title"
  | "disasterType"
  | "severity"
  | "status"
  | "coordinates"
  | "zoneName"
  | "peopleAffected"
> & { code?: string };

export interface SafetyAlert {
  id: string;
  code: string;
  title: string;
  disasterType: DisasterType;
  severity: Severity;
  status: Incident["status"];
  coordinates: Coordinates;
  zoneName: string;
  peopleAffected: number;
  /** Straight-line distance from the device to the incident, in km. */
  distanceKm: number;
  /** 0 = north, clockwise. */
  bearingDeg: number;
  /** Compass point the incident lies in relative to the device. */
  direction: string;
}

export interface NearbyPlace {
  name: string;
  type: FacilityType;
  coordinates: Coordinates;
  distanceKm: number;
  bearingDeg: number;
  direction: string;
}

/**
 * Incidents within `radiusKm` of the device, nearest first. Resolved incidents
 * are ignored - they are no longer a live threat.
 */
export function findNearbyIncidents(
  position: Coordinates,
  incidents: SafetyIncidentInput[],
  radiusKm: number = DANGER_RADIUS_KM,
): SafetyAlert[] {
  return incidents
    .filter((incident) => incident.status !== "resolved")
    .map((incident) => {
      const distanceKm = haversineKm(position, incident.coordinates);
      const bearingDeg = bearingDegrees(position, incident.coordinates);
      return {
        id: incident.id,
        code: incident.code ?? incident.id,
        title: incident.title,
        disasterType: incident.disasterType,
        severity: incident.severity,
        status: incident.status,
        coordinates: incident.coordinates,
        zoneName: incident.zoneName,
        peopleAffected: incident.peopleAffected,
        distanceKm: Number(distanceKm.toFixed(2)),
        bearingDeg,
        direction: compassDirection(bearingDeg),
      };
    })
    .filter((alert) => alert.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Nearest refuges (shelters, hospitals, fire & police stations) to the device. */
export function findNearestPlaces(
  position: Coordinates,
  facilities: Array<{ name: string; type: FacilityType; coordinates: Coordinates }>,
  limit = 4,
  types?: FacilityType[],
): NearbyPlace[] {
  return facilities
    .filter((facility) => !types || types.includes(facility.type))
    .map((facility) => {
      const bearingDeg = bearingDegrees(position, facility.coordinates);
      return {
        name: facility.name,
        type: facility.type,
        coordinates: facility.coordinates,
        distanceKm: Number(haversineKm(position, facility.coordinates).toFixed(2)),
        bearingDeg,
        direction: compassDirection(bearingDeg),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/** Overall threat band for the device's surroundings, worst alert wins. */
export function threatLevel(alerts: SafetyAlert[]): Severity | "none" {
  const order: Severity[] = ["low", "medium", "high", "critical"];
  let worst: Severity | "none" = "none";
  for (const alert of alerts) {
    if (worst === "none" || order.indexOf(alert.severity) > order.indexOf(worst)) {
      worst = alert.severity;
    }
  }
  return worst;
}

/** One-line status text for the safety banner. */
export function threatHeadline(level: Severity | "none", count: number): string {
  if (level === "none") return "No active incidents within the alert radius";
  const noun = count === 1 ? "incident" : "incidents";
  switch (level) {
    case "critical":
      return `CRITICAL: ${count} ${noun} near your location`;
    case "high":
      return `High risk: ${count} ${noun} near your location`;
    case "medium":
      return `Advisory: ${count} ${noun} within range`;
    default:
      return `${count} minor ${noun} within range`;
  }
}
