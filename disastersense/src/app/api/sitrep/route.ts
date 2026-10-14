import { withApi, jsonOk } from "@/lib/http";
import * as repo from "@/lib/db/repository";
import { buildSituationReport, situationReportToMarkdown } from "@/lib/agents/pipeline";

export const dynamic = "force-dynamic";

/** GET /api/sitrep - latest situation report (or null). */
export const GET = withApi(async () => {
  const report = await repo.latestSituationReport();
  return jsonOk({ report });
});

/** POST /api/sitrep - generate a fresh situation report. */
export const POST = withApi(async () => {
  const report = await buildSituationReport();
  await repo.saveSituationReport(report);
  return jsonOk({ report, markdown: situationReportToMarkdown(report) }, { status: 201 });
});
