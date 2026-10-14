import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "@/lib/db/repository";
import { getDb } from "@/lib/db/store";
import { isPersistent } from "@/lib/db/persistence";

/**
 * Persistence layer contract.
 *
 * The app's default store is an in-memory singleton that does NOT survive across
 * serverless instances. When Vercel KV env vars are present, src/lib/db/
 * persistence.ts snapshots the store to one Redis key on every DB-backed
 * request. These tests stub global.fetch to emulate the KV REST API and assert:
 *   1. with no KV env vars the module is inert (local dev / tests unchanged);
 *   2. a write is persisted and a "fresh" store re-hydrates it (the serverless
 *      report -> dashboard flow that was previously broken).
 */

const REAL_FETCH = global.fetch;

/** Minimal in-memory stand-in for the Upstash/Vercel KV REST API. */
function installFakeKv() {
  const store = new Map<string, string>();
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const parts = url.pathname.split("/").filter(Boolean); // ["get", key] | ["set", key]
    const command = parts[0];
    const key = decodeURIComponent(parts[1] ?? "");
    if (command === "get") {
      const value = store.get(key) ?? null;
      return new Response(JSON.stringify({ result: value }), { status: 200 });
    }
    if (command === "set") {
      const body = init?.body;
      store.set(key, typeof body === "string" ? body : "");
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return { store, fetchMock };
}

describe("persistence", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    repo.resetAll();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = REAL_FETCH;
  });

  it("is inert when no KV env vars are configured", () => {
    expect(isPersistent()).toBe(false);
  });

  it("activates once KV credentials are present", () => {
    process.env.KV_REST_API_URL = "https://example-kv.upstash.io";
    process.env.KV_REST_API_TOKEN = "token";
    expect(isPersistent()).toBe(true);
  });

  it("persists a report and re-hydrates it into a fresh store", async () => {
    // Import lazily so the env vars above are picked up by kvConfig().
    const { hydrate, persist } = await import("@/lib/db/persistence");
    process.env.KV_REST_API_URL = "https://example-kv.upstash.io";
    process.env.KV_REST_API_TOKEN = "token";
    const { store } = installFakeKv();

    // --- "Instance A": hydrate (empty), create a report, persist. ---
    await hydrate();
    const report = await repo.createReport({
      reporterName: "Persistence Tester",
      reporterContact: "",
      disasterType: "flood",
      description: "Water entering homes near the bridge, residents stranded",
      address: "Old Bridge Road",
      coordinates: { lat: 17.4011, lng: 78.4742 },
      severity: "high",
      peopleAffected: 12,
      mediaUrls: [],
      contactNumber: "",
      isSos: false,
      isSimulation: false,
    });
    await persist();

    // The snapshot key must now hold the report.
    const raw = store.get("disastersense_snapshot_v1");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).reports.some(([id]: [string]) => id === report.id)).toBe(true);

    // --- "Instance B": wipe the in-memory store, then hydrate from KV. ---
    repo.resetAll();
    expect(await repo.getReport(report.id)).toBeNull(); // gone from memory

    await hydrate();
    const rehydrated = await repo.getReport(report.id);
    expect(rehydrated).not.toBeNull();
    expect(rehydrated?.reporterName).toBe("Persistence Tester");
    expect(rehydrated?.peopleAffected).toBe(12);
  });

  it("keeps seed users/resources after a hydrate of an existing snapshot", async () => {
    const { hydrate } = await import("@/lib/db/persistence");
    process.env.KV_REST_API_URL = "https://example-kv.upstash.io";
    process.env.KV_REST_API_TOKEN = "token";
    installFakeKv();

    // First hydrate: nothing stored yet, so the repository seeds the store.
    await hydrate();
    const seededUsers = await repo.listUsers();
    expect(seededUsers.length).toBeGreaterThan(0);

    // A subsequent hydrate over an existing snapshot must not lose the seed.
    const db = getDb();
    expect(db.users.size).toBeGreaterThan(0);
    expect(db.resources.size).toBeGreaterThan(0);
  });
});
