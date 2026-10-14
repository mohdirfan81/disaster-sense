import { withApi, jsonOk } from "@/lib/http";
import * as repo from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/** GET /api/kpis - dashboard KPI snapshot. */
export const GET = withApi(async () => {
  const snapshot = await repo.kpiSnapshot();
  return jsonOk(snapshot);
});
