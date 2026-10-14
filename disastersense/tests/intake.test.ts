import { describe, expect, it } from "vitest";
import { intakeExtract, cleanText } from "@/lib/agents/intake";
import type { IncidentReport } from "@/types/domain";

function makeReport(overrides: Partial<IncidentReport> = {}): IncidentReport {
  return {
    id: "rep_test_1",
    reportKind: "incident",
    reporterName: "Test User",
    reporterContact: "+91 00000 00000",
    disasterType: "other",
    description: "Water entering homes near the bridge, several people trapped on rooftops",
    address: "Old Bridge Road, Riverside Ward",
    coordinates: { lat: 17.4, lng: 78.45 },
    severity: "medium",
    peopleAffected: 5,
    mediaUrls: [],
    contactNumber: "+91 00000 00000",
    isSos: false,
    isSimulation: false,
    timestamp: new Date().toISOString(),
    status: "received",
    incidentId: null,
    ...overrides,
  };
}

describe("intake agent", () => {
  it("detects flood from free text when type is 'other'", () => {
    const result = intakeExtract(makeReport({ description: "Severe flooding, water rising fast in the streets" }));
    expect(result.disasterType).toBe("flood");
  });

  it("escalates severity when urgency keywords are present but never de-escalates", () => {
    const result = intakeExtract(
      makeReport({ severity: "critical", description: "Small smoke, minor damage only" }),
    );
    expect(result.severity).toBe("critical"); // reporter's critical is preserved
  });

  it("extracts people affected from text when higher than declared", () => {
    const result = intakeExtract(
      makeReport({ peopleAffected: 3, description: "About 40 people trapped in the building" }),
    );
    expect(result.peopleAffected).toBe(40);
  });

  it("collects urgency and hazard keywords", () => {
    const result = intakeExtract(
      makeReport({
        disasterType: "fire",
        description: "Fire spreading, gas cylinder explosion risk, people trapped inside",
      }),
    );
    expect(result.urgencyKeywords).toContain("trapped");
    expect(result.hazards).toContain("gas");
  });

  it("strips control characters when cleaning text", () => {
    expect(cleanText("hello\u0000\u0001 world")).toBe("hello world");
  });
});
