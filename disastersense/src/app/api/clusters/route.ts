import { withApi, jsonOk } from "@/lib/http";
import * as repo from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/** GET /api/clusters - area risk clusters for the map. */
export const GET = withApi(async () => {
  const items = await repo.listClusters();
  return jsonOk({ items, total: items.length });
});
