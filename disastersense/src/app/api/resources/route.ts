import { withDb, jsonOk } from "@/lib/http";
import * as repo from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/** GET /api/resources - resource pool with availability. */
export const GET = withDb(async () => {
  const items = await repo.listResources();
  return jsonOk({ items, total: items.length });
});
