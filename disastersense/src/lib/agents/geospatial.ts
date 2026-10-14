import type {
  Coordinates,
  DisasterType,
  GeospatialResult,
  NearbyFacility,
} from "@/types/domain";
import { AFFECTED_RADIUS_KM, haversineKm, zoneFor } from "@/lib/geo";
import { FACILITIES } from "@/lib/db/seed-data";

/**
 * GEOSPATIAL AGENT
 * Resolves the incident's operational zone, computes the affected radius for
 * the disaster type, and finds the nearest shelters / hospitals / fire and
 * police stations.
 *
 * Mock logic: haversine over a static facility list. Replace with a real
 * places/geocoding API later - the output shape stays the same.
 */

const MAX_FACILITIES = 4;
const MAX_FACILITY_DISTANCE_KM = 8;

export function geospatialAnalyze(
  coordinates: Coordinates,
  disasterType: DisasterType,
): GeospatialResult {
  const zone = zoneFor(coordinates);

  const nearby: NearbyFacility[] = FACILITIES.map((f) => ({
    name: f.name,
    type: f.type,
    coordinates: f.coordinates,
    distanceKm: Number(haversineKm(coordinates, f.coordinates).toFixed(2)),
  }))
    .filter((f) => f.distanceKm <= MAX_FACILITY_DISTANCE_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_FACILITIES);

  return {
    coordinates,
    zoneName: zone.name,
    affectedRadiusKm: AFFECTED_RADIUS_KM[disasterType],
    nearbyFacilities: nearby,
    clusterId: null, // assigned by the pipeline when the cluster is upserted
  };
}
