import { withDb, jsonOk, ApiError } from "@/lib/http";
import { statusUpdateSchema } from "@/lib/validation";
import * as repo from "@/lib/db/repository";
import { getPipelineState } from "@/lib/agents/pipeline";
import { incidentCode } from "@/lib/id";
import { AGENT_LABELS } from "@/lib/config";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ incidentId: string }> };

/** GET /api/incidents/{id} - full detail: incident + agent logs + pipeline state. */
export const GET = withDb(async (_request: Request, ctx: Ctx) => {
  const { incidentId } = await ctx.params;
  const incident = await repo.getIncident(incidentId);
  if (!incident) throw new ApiError("not_found", "Incident not found.");
  const [logs, reports] = await Promise.all([
    repo.listAgentLogs(incidentId),
    Promise.all(incident.reportIds.map((id) => repo.getReport(id))),
  ]);
  return jsonOk({
    incident: { ...incident, code: incidentCode(incident.id) },
    logs: logs.map((l) => ({ ...l, agentLabel: l.agentLabel || AGENT_LABELS[l.agentName] })),
    reports: reports.filter(Boolean),
    pipeline: getPipelineState(incidentId),
  });
});

/** PATCH /api/incidents/{id} - operator status change. */
export const PATCH = withDb(async (request: Request, ctx: Ctx) => {
  const { incidentId } = await ctx.params;
  const body = statusUpdateSchema.parse(await request.json());
  const incident = await repo.getIncident(incidentId);
  if (!incident) throw new ApiError("not_found", "Incident not found.");
  if (body.status === "dispatched" && incident.humanApprovalRequired && !incident.approvedBy) {
    throw new ApiError("bad_request", "Human approval required before dispatch. Use /approve.");
  }
  const updated = await repo.updateIncident(incidentId, { status: body.status });
  await repo.appendAgentLog({
    incidentId,
    agentName: "report",
    agentLabel: AGENT_LABELS.report,
    action: `Operator set status to ${body.status.toUpperCase()}`,
    output: `Manual status update via control room.`,
    status: "completed",
  });
  return jsonOk({ incident: updated });
});
