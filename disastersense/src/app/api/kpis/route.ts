import { withDb, jsonOk } from "@/lib/http";
import * as repo from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/** GET /api/kpis - dashboard KPI snapshot. */
export const GET = withDb(async () => {
  const snapshot = await repo.kpiSnapshot();
  return jsonOk(snapshot);
});
