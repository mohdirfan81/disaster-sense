import type {
  ClassificationResult,
  DisasterType,
  IntakeExtraction,
  Severity,
} from "@/types/domain";
import { haversineKm } from "@/lib/geo";

/**
 * CLASSIFICATION AGENT
 * Assigns a category and 1-5 urgency level, detects duplicate/related
 * reports by proximity + type + time, and produces the cluster key used to
 * group similar reports into one active incident.
 *
 * Mock logic: rule table. Replace with an LLM classification call later.
 */

const CATEGORY_BY_TYPE: Record<DisasterType, string> = {
  flood: "Hydrological Emergency",
  fire: "Urban Fire",
  earthquake: "Seismic Event",
  cyclone: "Windstorm / Cyclone",
  industrial: "Hazmat / Industrial Accident",
  medical: "Medical Emergency",
  other: "Unclassified Emergency",
};

const URGENCY_BY_SEVERITY: Record<Severity, 1 | 2 | 3 | 4 | 5> = {
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

/** Same cluster if within CLUSTER_RADIUS_KM, same type, within 6 hours. */
const CLUSTER_RADIUS_KM = 1.6;
const CLUSTER_WINDOW_MS = 6 * 60 * 60 * 1000;

export interface ExistingIncidentLite {
  id: string;
  disasterType: DisasterType;
  coordinates: { lat: number; lng: number };
  createdAt: string;
}

export function classifyIncident(
  extraction: IntakeExtraction,
  reportTimestamp: string,
  existingIncidents: ExistingIncidentLite[],
): ClassificationResult {
  const severity = extraction.severity;
  const urgencyLevel = URGENCY_BY_SEVERITY[severity];

  // Duplicate detection: nearby + same type + recent.
  const duplicates: string[] = [];
  if (extraction.coordinates) {
    for (const incident of existingIncidents) {
      if (incident.disasterType !== extraction.disasterType) continue;
      // Use the absolute time gap: a report submitted just before the existing
      // incident's pipeline ran (e.g. batched intake) is still "recent" and
      // should merge. Only reject reports far outside the clustering window.
      const age = Math.abs(
        new Date(reportTimestamp).getTime() - new Date(incident.createdAt).getTime(),
      );
      if (age > CLUSTER_WINDOW_MS) continue;
      const distance = haversineKm(extraction.coordinates, incident.coordinates);
      if (distance <= CLUSTER_RADIUS_KM) duplicates.push(incident.id);
    }
  }

  // Cluster key groups by type + rounded grid cell (≈1.8 km cells).
  const gridLat = extraction.coordinates ? (extraction.coordinates.lat * 10).toFixed(1) : "na";
  const gridLng = extraction.coordinates ? (extraction.coordinates.lng * 10).toFixed(1) : "na";
  const clusterKey = `${extraction.disasterType}:${gridLat},${gridLng}`;

  const rationaleParts = [
    `Category "${CATEGORY_BY_TYPE[extraction.disasterType]}" from type "${extraction.disasterType}".`,
    `Urgency ${urgencyLevel}/5 (severity "${severity}"${extraction.urgencyKeywords.length ? `, keywords: ${extraction.urgencyKeywords.slice(0, 3).join(", ")}` : ""}).`,
  ];
  if (duplicates.length > 0) {
    rationaleParts.push(`${duplicates.length} related active incident(s) within ${CLUSTER_RADIUS_KM} km - merged.`);
  } else {
    rationaleParts.push("No nearby duplicates - new incident.");
  }

  return {
    category: CATEGORY_BY_TYPE[extraction.disasterType],
    urgencyLevel,
    severity,
    duplicateOf: duplicates,
    clusterKey,
    rationale: rationaleParts.join(" "),
  };
}
