import { withApi, jsonOk } from "@/lib/http";
import { runSimulation } from "@/lib/simulation";
import { buildSituationReport } from "@/lib/agents/pipeline";
import * as repo from "@/lib/db/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/simulation - run a sample scenario batch through the pipeline. */
export const POST = withApi(async (request: Request) => {
  const body = (await request.json().catch(() => ({}))) as { count?: number };
  const result = await runSimulation(body.count);
  const sitrep = await buildSituationReport();
  await repo.saveSituationReport(sitrep);
  return jsonOk({ ...result, situationReport: sitrep }, { status: 201 });
});
