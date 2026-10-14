import { withApi, jsonOk } from "@/lib/http";
import { reportCreateSchema } from "@/lib/validation";
import * as repo from "@/lib/db/repository";
import { runPipelineForReport } from "@/lib/agents/pipeline";
import { incidentCode } from "@/lib/id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/reports - citizen (or simulation) report intake, runs the agent pipeline. */
export const POST = withApi(async (request: Request) => {
  const body = reportCreateSchema.parse(await request.json());
  const report = await repo.createReport(body);
  const incident = await runPipelineForReport(report);
  return jsonOk(
    {
      report,
      incident: {
        id: incident.id,
        code: incidentCode(incident.id),
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        humanApprovalRequired: incident.humanApprovalRequired,
      },
      message: `Report received. Incident ${incidentCode(incident.id)} created.`,
    },
    { status: 201 },
  );
});

/** GET /api/reports - recent citizen reports. */
export const GET = withApi(async () => {
  const reports = await repo.listReports();
  return jsonOk({ items: reports.slice(0, 100), total: reports.length });
});
