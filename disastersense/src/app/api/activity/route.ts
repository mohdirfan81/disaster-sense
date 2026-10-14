import { withApi, jsonOk } from "@/lib/http";
import * as repo from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/** GET /api/activity - recent agent actions across all incidents (live feed). */
export const GET = withApi(async (request: Request) => {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 40);
  const logs = await repo.listRecentAgentLogs(Math.min(Math.max(limit, 1), 200));
  return jsonOk({ items: logs, total: logs.length });
});
