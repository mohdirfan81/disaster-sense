import { beforeEach, describe, expect, it } from "vitest";
import * as repo from "@/lib/db/repository";
import { runPipelineForReport } from "@/lib/agents/pipeline";
import { reportCreateSchema, statusUpdateSchema } from "@/lib/validation";
import { POST as approveHandler } from "@/app/api/incidents/[incidentId]/approve/route";
import { PATCH as incidentPatchHandler } from "@/app/api/incidents/[incidentId]/route";

/**
 * Approval workflow + server-side SOS severity rules.
 * Exercises the real route handlers so the API contract (not just the repo)
 * is covered: pending approval, approval, rejection, and the dispatch guard.
 */

function makeReportInput(overrides: Record<string, unknown> = {}) {
  return {
    reporterName: "Approval Tester",
    reporterContact: "",
    disasterType: "flood",
    description: "Water entering homes near the bridge, residents stranded",
    address: "Old Bridge Road",
    coordinates: { lat: 17.4011, lng: 78.4742 },
    severity: "low",
    peopleAffected: 5,
    isSos: false,
    isSimulation: false,
    ...overrides,
  };
}

async function createPendingCriticalIncident() {
  // Client submits severity "low" but flags the report as an SOS: the schema
  // (and repository) escalate it to critical before the pipeline runs.
  const body = reportCreateSchema.parse(
    makeReportInput({ isSos: true, description: "People stranded on a rooftop as water rises fast" }),
  );
  const report = await repo.createReport(body);
  const incident = await runPipelineForReport(report);
  return { report, incident };
}

function callApprove(incidentId: string, body: Record<string, unknown>) {
  return approveHandler(
    new Request("http://test", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({ incidentId }) },
  );
}

describe("server-side SOS severity", () => {
  it("forces severity to critical in the API schema when isSos is true", () => {
    const parsed = reportCreateSchema.parse(makeReportInput({ isSos: true, severity: "low" }));
    expect(parsed.severity).toBe("critical");
  });

  it("keeps the submitted severity for non-SOS reports", () => {
    const parsed = reportCreateSchema.parse(makeReportInput({ severity: "medium" }));
    expect(parsed.severity).toBe("medium");
  });

  it("stores an SOS report as critical even when created directly", async () => {
    repo.resetAll();
    const report = await repo.createReport(
      makeReportInput({ isSos: true, severity: "low" }) as never,
    );
    expect(report.severity).toBe("critical");
  });

  it("processes an SOS report into a critical incident requiring approval", async () => {
    repo.resetAll();
    const { report, incident } = await createPendingCriticalIncident();
    expect(report.severity).toBe("critical");
    expect(incident.severity).toBe("critical");
    expect(incident.humanApprovalRequired).toBe(true);
    expect(incident.status).toBe("awaiting_approval");
    expect(incident.approvedBy).toBeNull();
    expect(incident.assignedTeams).toHaveLength(0);
  });

  it("keeps a non-SOS report at its normal severity with no approval gate", async () => {
    repo.resetAll();
    const body = reportCreateSchema.parse(
      makeReportInput({ severity: "low", description: "Small localized waterlogging on one street" }),
    );
    const report = await repo.createReport(body);
    const incident = await runPipelineForReport(report);
    expect(report.severity).toBe("low");
    expect(incident.severity).toBe("low");
    expect(incident.humanApprovalRequired).toBe(false);
    expect(incident.status).toBe("in_progress");
  });
});

describe("approval workflow transitions", () => {
  beforeEach(() => {
    repo.resetAll();
  });

  it("accepts awaiting_approval as a valid operator status", () => {
    expect(statusUpdateSchema.safeParse({ status: "awaiting_approval" }).success).toBe(true);
  });

  it("blocks a manual dispatch while approval is pending", async () => {
    const { incident } = await createPendingCriticalIncident();
    const res = await incidentPatchHandler(
      new Request("http://test", { method: "PATCH", body: JSON.stringify({ status: "dispatched" }) }),
      { params: Promise.resolve({ incidentId: incident.id }) },
    );
    expect(res.status).toBe(400);
    const stillPending = await repo.getIncident(incident.id);
    expect(stillPending?.status).toBe("awaiting_approval");
  });

  it("approval assigns demo resources and marks the incident dispatched", async () => {
    const { incident } = await createPendingCriticalIncident();
    const res = await callApprove(incident.id, { decision: "approve", operatorName: "Ops One" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { incident: { status: string; approvedBy: string | null } };
    expect(body.incident.status).toBe("dispatched");
    expect(body.incident.approvedBy).toBe("Ops One");

    const stored = await repo.getIncident(incident.id);
    expect(stored?.humanApprovalRequired).toBe(false);
    expect(stored?.assignedTeams.length).toBeGreaterThan(0);

    const logs = await repo.listAgentLogs(incident.id);
    const approvalLog = logs.find((l) => l.action.includes("APPROVED"));
    expect(approvalLog).toBeDefined();
    expect(approvalLog?.output).toContain("Simulated assignment");
  });

  it("rejection is recorded and keeps the incident active for reassessment", async () => {
    const { incident } = await createPendingCriticalIncident();
    const res = await callApprove(incident.id, {
      decision: "reject",
      operatorName: "Ops Two",
      note: "Verify with field team first.",
    });
    expect(res.status).toBe(200);

    const stored = await repo.getIncident(incident.id);
    expect(stored?.status).toBe("awaiting_approval"); // still queued, not dispatched
    expect(stored?.humanApprovalRequired).toBe(true);
    expect(stored?.approvedBy).toBeNull();
    expect(stored?.assignedTeams).toHaveLength(0);
    expect(stored?.status).not.toBe("resolved"); // remains active

    const logs = await repo.listAgentLogs(incident.id);
    const rejectLog = logs.find((l) => l.action.includes("REJECTED"));
    expect(rejectLog).toBeDefined();
    expect(rejectLog?.output).toContain("no resources were assigned");
    expect(rejectLog?.output).toContain("Verify with field team first.");
  });
});