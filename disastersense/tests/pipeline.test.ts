import { beforeEach, describe, expect, it } from "vitest";
import * as repo from "@/lib/db/repository";
import { runPipelineForReport, buildSituationReport } from "@/lib/agents/pipeline";
import { runSimulation } from "@/lib/simulation";

describe("pipeline + simulation (integration)", () => {
  beforeEach(() => {
    repo.resetAll();
  });

  it("runs all seven agents for a single report and produces a complete incident", async () => {
    const report = await repo.createReport({
      reporterName: "Integration Tester",
      reporterContact: "+91 12345 67890",
      disasterType: "flood",
      // Note: no critical urgency keywords here, so the declared "high" severity is
      // preserved and the incident flows through to "in_progress" without gating.
      description: "River water entering homes, 80 people on rooftops, current rising fast",
      address: "Gandhi Street, Riverside Ward",
      coordinates: { lat: 17.4021, lng: 78.4482 },
      severity: "high",
      peopleAffected: 40,
      mediaUrls: [],
      contactNumber: "+91 12345 67890",
      isSos: false,
      isSimulation: false,
    });

    const incident = await runPipelineForReport(report);

    expect(incident.intake).not.toBeNull();
    expect(incident.classification).not.toBeNull();
    expect(incident.geospatial).not.toBeNull();
    expect(incident.risk).not.toBeNull();
    expect(incident.resources.length).toBeGreaterThan(0);
    expect(incident.communication?.alerts.length).toBeGreaterThanOrEqual(3);
    expect(incident.status).toBe("in_progress");

    const logs = await repo.listAgentLogs(incident.id);
    const agents = new Set(logs.map((l) => l.agentName));
    for (const name of ["intake", "classification", "geospatial", "risk", "resource", "communication", "report"]) {
      expect(agents.has(name as never)).toBe(true);
    }
  });

  it("flags critical incidents for human approval and blocks dispatch until approved", async () => {
    const report = await repo.createReport({
      reporterName: "Critical Tester",
      reporterContact: "",
      disasterType: "fire",
      description: "Apartment fire, people trapped on balconies, cylinder explosion risk",
      address: "Hillview Colony",
      coordinates: { lat: 17.4215, lng: 78.5312 },
      severity: "critical",
      peopleAffected: 90,
      mediaUrls: [],
      contactNumber: "",
      isSos: true,
      isSimulation: false,
    });

    const incident = await runPipelineForReport(report);
    expect(incident.humanApprovalRequired).toBe(true);
    expect(incident.status).toBe("awaiting_approval"); // not dispatched until a human approves
    expect(incident.approvedBy).toBeNull();
  });

  it("keeps missing-person reports distinct and marks them unverified", async () => {
    const report = await repo.createReport({
      reportKind: "missing_person",
      reporterName: "Concerned Reporter",
      reporterContact: "",
      disasterType: "other",
      description: "MISSING PERSON REPORT\nPerson: Demo Person\nLast seen: 2026-10-13\nDescription: Wearing a blue jacket",
      address: "Riverside Ward",
      coordinates: { lat: 17.4021, lng: 78.4482 },
      severity: "high",
      peopleAffected: 1,
      mediaUrls: [],
      contactNumber: "",
      isSos: false,
      isSimulation: false,
    });

    const incident = await runPipelineForReport(report);
    expect(incident.reportKind).toBe("missing_person");
    expect(incident.title).toContain("Missing person");
    expect(incident.reportIds).toEqual([report.id]);
  });

  it("merges duplicate reports into the same incident", async () => {
    const shared = { lat: 17.3869, lng: 78.4891 };
    const first = await repo.createReport({
      reporterName: "A", reporterContact: "", disasterType: "fire",
      description: "Fire in the market building, smoke everywhere",
      address: "Central Station Area", coordinates: shared, severity: "high",
      peopleAffected: 20, mediaUrls: [], contactNumber: "", isSos: false, isSimulation: false,
    });
    const second = await repo.createReport({
      reporterName: "B", reporterContact: "", disasterType: "fire",
      description: "Same market fire seen from the other side, flames spreading",
      address: "Central Station Area", coordinates: { lat: 17.3872, lng: 78.4894 },
      severity: "high", peopleAffected: 15, mediaUrls: [], contactNumber: "",
      isSos: false, isSimulation: false,
    });

    const incA = await runPipelineForReport(first);
    const incB = await runPipelineForReport(second);
    expect(incB.id).toBe(incA.id);
    expect(incB.reportIds).toHaveLength(2);
    expect(incB.peopleAffected).toBe(35);
  });

  it("does not merge an ordinary report into a missing-person incident", async () => {
    const shared = { lat: 17.4021, lng: 78.4482 };
    const mp = await repo.createReport({
      reportKind: "missing_person",
      reporterName: "Reporter MP",
      reporterContact: "",
      disasterType: "other",
      description: "MISSING PERSON REPORT\nPerson: Demo Person\nLast seen: 2026-10-13",
      address: "Riverside Ward",
      coordinates: shared,
      severity: "high",
      peopleAffected: 1,
      mediaUrls: [],
      contactNumber: "",
      isSos: false,
      isSimulation: false,
    });
    const mpIncident = await runPipelineForReport(mp);

    // An ordinary "other" report at the same spot/time: without the cross-kind
    // guard this would collide with the missing-person incident (same type,
    // nearby, recent) and wrongly merge into it.
    const ordinary = await repo.createReport({
      reporterName: "Reporter Ordinary",
      reporterContact: "",
      disasterType: "other",
      description: "Unclassified situation reported near the riverside ward.",
      address: "Riverside Ward",
      coordinates: shared,
      severity: "high",
      peopleAffected: 3,
      mediaUrls: [],
      contactNumber: "",
      isSos: false,
      isSimulation: false,
    });
    const ordinaryIncident = await runPipelineForReport(ordinary);

    expect(ordinaryIncident.id).not.toBe(mpIncident.id);
    expect(ordinaryIncident.reportKind).toBe("incident");
    expect(ordinaryIncident.reportIds).toEqual([ordinary.id]);
    // The missing-person incident is left untouched.
    const mpAfter = await repo.getIncident(mpIncident.id);
    expect(mpAfter?.reportIds).toEqual([mp.id]);
  });

  it("does not merge a missing-person report into an ordinary incident", async () => {
    const shared = { lat: 17.4021, lng: 78.4482 };
    const ordinary = await repo.createReport({
      reporterName: "Reporter Ordinary",
      reporterContact: "",
      disasterType: "other",
      description: "Unclassified situation reported near the riverside ward.",
      address: "Riverside Ward",
      coordinates: shared,
      severity: "high",
      peopleAffected: 3,
      mediaUrls: [],
      contactNumber: "",
      isSos: false,
      isSimulation: false,
    });
    const ordinaryIncident = await runPipelineForReport(ordinary);

    // A missing-person report at the same spot/time must stay isolated rather
    // than merging into the existing ordinary incident.
    const mp = await repo.createReport({
      reportKind: "missing_person",
      reporterName: "Reporter MP",
      reporterContact: "",
      disasterType: "other",
      description: "MISSING PERSON REPORT\nPerson: Demo Person\nLast seen: 2026-10-13",
      address: "Riverside Ward",
      coordinates: shared,
      severity: "high",
      peopleAffected: 1,
      mediaUrls: [],
      contactNumber: "",
      isSos: false,
      isSimulation: false,
    });
    const mpIncident = await runPipelineForReport(mp);

    expect(mpIncident.id).not.toBe(ordinaryIncident.id);
    expect(mpIncident.reportKind).toBe("missing_person");
    expect(mpIncident.reportIds).toEqual([mp.id]);
  });

  it("runs a simulation with >= 8 reports incl. flood, fire and earthquake", async () => {
    const result = await runSimulation();
    expect(result.scenariosRun).toBeGreaterThanOrEqual(8);
    expect(result.incidentIds.length).toBeGreaterThanOrEqual(3);

    const incidents = await repo.listIncidents();
    const types = new Set(incidents.map((i) => i.disasterType));
    expect(types.has("flood")).toBe(true);
    expect(types.has("fire")).toBe(true);
    expect(types.has("earthquake")).toBe(true);
  }, 30_000);

  it("builds a situation report reflecting current state", async () => {
    await runSimulation(8);
    const sitrep = await buildSituationReport();
    expect(sitrep.activeIncidents).toBeGreaterThan(0);
    expect(sitrep.summary.length).toBeGreaterThan(0);
    expect(sitrep.recommendedActions.length).toBeGreaterThan(0);
  }, 30_000);
});
