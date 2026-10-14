import { describe, expect, it } from "vitest";
import { riskAnalyze } from "@/lib/agents/risk";
import { recommendResources, requiresHumanApproval } from "@/lib/agents/resource";
import { haversineKm, zoneFor } from "@/lib/geo";

describe("risk agent", () => {
  it("scores a critical multi-factor incident in the high band", () => {
    const risk = riskAnalyze({
      disasterType: "flood",
      severity: "critical",
      peopleAffected: 300,
      urgencyLevel: 5,
      nearbyIncidentCount: 4,
      hazards: ["dam", "overflow"],
      zoneName: "Riverside Ward",
    });
    expect(risk.riskScore).toBeGreaterThanOrEqual(60);
    expect(["high", "critical"]).toContain(risk.riskLevel);
    expect(risk.escalationRisks.length).toBeGreaterThan(0);
    expect(risk.predictedSpreadKm).toBeGreaterThan(0);
  });

  it("scores a low-severity isolated incident lower than a critical one", () => {
    const low = riskAnalyze({
      disasterType: "medical",
      severity: "low",
      peopleAffected: 2,
      urgencyLevel: 2,
      nearbyIncidentCount: 0,
      hazards: [],
      zoneName: "Central Station Area",
    });
    expect(low.riskScore).toBeLessThan(60);
  });
});

describe("resource agent", () => {
  const risk = riskAnalyze({
    disasterType: "flood",
    severity: "critical",
    peopleAffected: 300,
    urgencyLevel: 5,
    nearbyIncidentCount: 2,
    hazards: [],
    zoneName: "Riverside Ward",
  });

  it("recommends water-rescue resources for floods", () => {
    const recs = recommendResources("flood", "critical", 300, risk);
    const types = recs.map((r) => r.type);
    expect(types).toContain("rescue_boat");
    expect(types).toContain("ambulance");
  });

  it("recommends fire brigades for fires", () => {
    const recs = recommendResources("fire", "high", 40, risk);
    expect(recs.map((r) => r.type)).toContain("fire_brigade");
  });

  it("scales quantity with people affected", () => {
    const few = recommendResources("flood", "high", 10, risk);
    const many = recommendResources("flood", "high", 400, risk);
    const fewBoats = few.find((r) => r.type === "rescue_boat")!.quantity;
    const manyBoats = many.find((r) => r.type === "rescue_boat")!.quantity;
    expect(manyBoats).toBeGreaterThan(fewBoats);
  });

  it("requires human approval for critical severity", () => {
    const recs = recommendResources("flood", "critical", 300, risk);
    expect(requiresHumanApproval("critical", recs)).toBe(true);
  });

  it("does not require approval for low severity", () => {
    const recs = recommendResources("medical", "low", 2, risk);
    expect(requiresHumanApproval("low", recs)).toBe(false);
  });
});

describe("geo helpers", () => {
  it("computes haversine distance between known points", () => {
    const d = haversineKm({ lat: 17.385, lng: 78.4867 }, { lat: 17.4021, lng: 78.4482 });
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(10);
  });

  it("maps coordinates to the nearest named zone", () => {
    const zone = zoneFor({ lat: 17.4021, lng: 78.4482 });
    expect(zone.name).toBe("Riverside Ward");
    expect(zone.distanceKm).toBeLessThan(0.5);
  });
});
