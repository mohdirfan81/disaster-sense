import { describe, expect, it } from "vitest";
import { classifyIncident } from "@/lib/agents/classification";
import type { IntakeExtraction } from "@/types/domain";

function extraction(overrides: Partial<IntakeExtraction> = {}): IntakeExtraction {
  return {
    disasterType: "fire",
    severity: "high",
    peopleAffected: 20,
    locationText: "Market Road",
    coordinates: { lat: 17.372, lng: 78.475 },
    urgencyKeywords: ["spreading"],
    hazards: ["gas"],
    cleanedDescription: "Fire spreading",
    confidence: 0.9,
    ...overrides,
  };
}

describe("classification agent", () => {
  it("assigns category and urgency from severity", () => {
    const result = classifyIncident(extraction(), new Date().toISOString(), []);
    expect(result.category).toBe("Urban Fire");
    expect(result.urgencyLevel).toBe(4);
    expect(result.severity).toBe("high");
  });

  it("detects a duplicate incident within radius, same type and time window", () => {
    const now = new Date().toISOString();
    const result = classifyIncident(extraction(), now, [
      { id: "inc_nearby", disasterType: "fire", coordinates: { lat: 17.3725, lng: 78.4755 }, createdAt: now },
    ]);
    expect(result.duplicateOf).toContain("inc_nearby");
  });

  it("does not merge different disaster types", () => {
    const now = new Date().toISOString();
    const result = classifyIncident(extraction(), now, [
      { id: "inc_flood", disasterType: "flood", coordinates: { lat: 17.372, lng: 78.475 }, createdAt: now },
    ]);
    expect(result.duplicateOf).toHaveLength(0);
  });

  it("does not merge incidents beyond the cluster radius", () => {
    const now = new Date().toISOString();
    const result = classifyIncident(extraction(), now, [
      { id: "inc_far", disasterType: "fire", coordinates: { lat: 17.5, lng: 78.6 }, createdAt: now },
    ]);
    expect(result.duplicateOf).toHaveLength(0);
  });

  it("produces a stable cluster key per type + grid cell", () => {
    const a = classifyIncident(extraction(), new Date().toISOString(), []);
    const b = classifyIncident(extraction({ coordinates: { lat: 17.373, lng: 78.476 } }), new Date().toISOString(), []);
    expect(a.clusterKey).toBe(b.clusterKey);
  });
});
