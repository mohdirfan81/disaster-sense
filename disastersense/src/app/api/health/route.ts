import { jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/health - liveness probe. */
export const GET = async () =>
  jsonOk({
    status: "ok",
    service: "disastersense-api",
    env: process.env.NODE_ENV ?? "development",
    time: new Date().toISOString(),
    disclaimer: "Decision-support prototype. Does not dispatch real emergency services.",
  });
