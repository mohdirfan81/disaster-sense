import { withApi, jsonOk, ApiError } from "@/lib/http";
import { approveSchema } from "@/lib/validation";
import * as repo from "@/lib/db/repository";
import { AGENT_LABELS } from "@/lib/config";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ incidentId: string }> };

/**
 * POST /api/incidents/{id}/approve - human sign-off for critical dispatch.
 * Approve simulates assigning the recommended demo resources and marks the
 * incident dispatched; reject records the decision and keeps the incident
 * active for reassessment. Nothing here contacts real services or notifies
 * responders - assignments are demo records only.
 */
export const POST = withApi(async (request: Request, ctx: Ctx) => {
  const { incidentId } = await ctx.params;
  const body = approveSchema.parse(await request.json());
  const incident = await repo.getIncident(incidentId);
  if (!incident) throw new ApiError("not_found", "Incident not found.");

  if (body.decision === "reject") {
    const updated = await repo.updateIncident(incidentId, {
      // Rejection is recorded but keeps the approval gate in place: the
      // incident stays active (awaiting_approval) so an operator can
      // reassess and approve later. No dispatch is implied.
      status: "awaiting_approval",
      humanApprovalRequired: true,
    });
    await repo.appendAgentLog({
      incidentId,
      agentName: "resource",
      agentLabel: AGENT_LABELS.resource,
      action: `Dispatch REJECTED by ${body.operatorName}`,
      output: `${body.note ? `${body.note} — ` : ""}no resources were assigned and no notifications were sent. Incident remains active for reassessment.`,
      status: "needs_review",
    });
    return jsonOk({ incident: updated, decision: "reject" });
  }

  const deployed = await repo.assignResources(
    incidentId,
    incident.resources.map((r) => ({ type: r.type, quantity: r.quantity })),
  );
  const teams = deployed.map((d) => d.label);
  const updated = await repo.updateIncident(incidentId, {
    status: "dispatched",
    humanApprovalRequired: false,
    approvedBy: body.operatorName,
    approvedAt: new Date().toISOString(),
    assignedTeams: teams,
  });
  await repo.appendAgentLog({
    incidentId,
    agentName: "resource",
    agentLabel: AGENT_LABELS.resource,
    action: `Dispatch APPROVED by ${body.operatorName}`,
    output: `Simulated assignment (demo only, no real teams dispatched): ${teams.join(", ") || "no units available"}. ${body.note}`.trim(),
    status: "completed",
  });

  return jsonOk({ incident: updated, deployed, decision: "approve" });
});
