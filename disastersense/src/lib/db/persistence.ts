import type {
  AgentLog,
  Cluster,
  Incident,
  IncidentReport,
  Resource,
  SituationReport,
  User,
} from "@/types/domain";
import { getDb, type DbShape } from "@/lib/db/store";

/**
 * OPTIONAL DURABLE PERSISTENCE FOR SERVERLESS HOSTS (Vercel).
 *
 * The demo's default store is an in-memory singleton (src/lib/db/store.ts) that
 * only survives inside a single long-running Node process. On serverless
 * platforms each request can run in a different instance, so in-memory writes
 * are invisible to the next request and citizen reports "disappear" from the
 * Government / Rescue / Admin views.
 *
 * When Vercel KV (or a standalone Upstash Redis) is connected, its
 * `KV_REST_API_URL` + `KV_REST_API_TOKEN` env vars are present. In that mode the
 * whole dataset is snapshotted to a single Redis key: every DB-backed request
 * hydrates the in-memory store from the snapshot before it runs and writes the
 * snapshot back afterwards if the data changed. With no KV env vars (local dev,
 * unit tests, or a single Render instance) this module is a complete no-op and
 * the app behaves exactly as it did before.
 *
 * The KV REST API is called with the global `fetch` (Node 20 runtime), so no new
 * npm dependency is introduced and the production build is unaffected.
 */

const SNAPSHOT_KEY = "disastersense_snapshot_v1";

/** Warn (once) if a snapshot approaches the ~1 MB per-value KV limit. */
const SIZE_WARN_BYTES = 900_000;

interface SerializedDb {
  users: Array<[string, User]>;
  reports: Array<[string, IncidentReport]>;
  incidents: Array<[string, Incident]>;
  agentLogs: Array<[string, AgentLog[]]>;
  resources: Array<[string, Resource]>;
  clusters: Array<[string, Cluster]>;
  situationReports: SituationReport[];
}

interface KvConfig {
  url: string;
  token: string;
}

/** Resolve KV credentials lazily so tests can toggle them via process.env. */
function kvConfig(): KvConfig | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

/** True when a KV backend is configured and this module will persist data. */
export function isPersistent(): boolean {
  return kvConfig() !== null;
}

/* --------------------------------------------------------------- dirty flag */

let dirty = false;

/** Mark that the in-memory store changed and must be written back to KV. */
export function markDirty(): void {
  dirty = true;
}

function consumeDirty(): boolean {
  const wasDirty = dirty;
  dirty = false;
  return wasDirty;
}

/* ------------------------------------------------------------ serialization */

function serialize(db: DbShape): SerializedDb {
  return {
    users: Array.from(db.users.entries()),
    reports: Array.from(db.reports.entries()),
    incidents: Array.from(db.incidents.entries()),
    agentLogs: Array.from(db.agentLogs.entries()),
    resources: Array.from(db.resources.entries()),
    clusters: Array.from(db.clusters.entries()),
    situationReports: db.situationReports,
  };
}

function loadInto(db: DbShape, data: Partial<SerializedDb>): void {
  db.users = new Map(data.users ?? []);
  db.reports = new Map(data.reports ?? []);
  db.incidents = new Map(data.incidents ?? []);
  db.agentLogs = new Map(data.agentLogs ?? []);
  db.resources = new Map(data.resources ?? []);
  db.clusters = new Map(data.clusters ?? []);
  db.situationReports = data.situationReports ?? [];
}


/* -------------------------------------------------------------- kv requests */

async function kvGet(cfg: KvConfig, key: string): Promise<string | null> {
  const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV GET failed (${res.status})`);
  const body = (await res.json()) as { result: string | null };
  return body.result ?? null;
}

async function kvSet(cfg: KvConfig, key: string, value: string): Promise<void> {
  const res = await fetch(`${cfg.url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "text/plain",
    },
    body: value,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV SET failed (${res.status})`);
}

/* ---------------------------------------------------------- hydrate/persist */

/**
 * Load the shared snapshot into the in-memory store. Safe to call on every
 * request: when persistence is off, or when no snapshot exists yet, it is a
 * no-op and the store keeps its (seeded) in-memory contents.
 */
export async function hydrate(): Promise<void> {
  const cfg = kvConfig();
  if (!cfg) return;
  try {
    const raw = await kvGet(cfg, SNAPSHOT_KEY);
    if (!raw) return; // nothing persisted yet — ensureSeeded() will populate it
    loadInto(getDb(), JSON.parse(raw) as SerializedDb);
    dirty = false; // in-memory now matches the persisted snapshot
  } catch (error) {
    // Fail open: keep serving from the in-memory store rather than 500 the app.
    console.error("[persistence] hydrate failed, using in-memory store:", error);
  }
}

/**
 * Write the in-memory store back to the shared snapshot, but only if it changed
 * during this request. No-op when persistence is off or nothing changed.
 */
export async function persist(): Promise<void> {
  const cfg = kvConfig();
  if (!cfg) return;
  if (!consumeDirty()) return;
  try {
    const payload = JSON.stringify(serialize(getDb()));
    if (payload.length > SIZE_WARN_BYTES) {
      console.warn(
        `[persistence] snapshot is ${payload.length} bytes — approaching the KV per-value limit.`,
      );
    }
    await kvSet(cfg, SNAPSHOT_KEY, payload);
  } catch (error) {
    // Fail open: the response already succeeded; log so the miss is visible.
    console.error("[persistence] persist failed:", error);
  }
}
