import { withApi, jsonOk } from "@/lib/http";
import { incidentFilterSchema } from "@/lib/validation";
import * as repo from "@/lib/db/repository";
import { incidentCode } from "@/lib/id";

export const dynamic = "force-dynamic";

/** GET /api/incidents - filtered incident list for the dashboard. */
export const GET = withApi(async (request: Request) => {
  const query = incidentFilterSchema.parse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  const incidents = await repo.listIncidents(query);
  return jsonOk({
    items: incidents.map((i) => ({ ...i, code: incidentCode(i.id) })),
    total: incidents.length,
  });
});

