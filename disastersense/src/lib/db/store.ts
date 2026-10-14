import type {
  AgentLog,
  Cluster,
  Incident,
  IncidentReport,
  Resource,
  SituationReport,
  User,
} from "@/types/domain";

/**
 * Process-wide in-memory store (singleton via globalThis so every route and
 * the pipeline share one dataset per server process).
 *
 * This is the demo driver. A PostgreSQL driver can replace the repository
 * functions behind the same interface (see src/lib/repository.ts) without
 * touching agents, routes or UI.
 */

export interface DbShape {
  users: Map<string, User>;
  reports: Map<string, IncidentReport>;
  incidents: Map<string, Incident>;
  agentLogs: Map<string, AgentLog[]>;
  resources: Map<string, Resource>;
  clusters: Map<string, Cluster>;
  situationReports: SituationReport[];
}

const GLOBAL_KEY = "__disastersense_db__";

function emptyDb(): DbShape {
  return {
    users: new Map(),
    reports: new Map(),
    incidents: new Map(),
    agentLogs: new Map(),
    resources: new Map(),
    clusters: new Map(),
    situationReports: [],
  };
}

function createDb(): DbShape {
  return emptyDb(); // seeded lazily by seedInto() from the repository
}

export function getDb(): DbShape {
  const g = globalThis as unknown as Record<string, DbShape | undefined>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createDb();
  }
  return g[GLOBAL_KEY];
}

export function resetDb(): void {
  const g = globalThis as unknown as Record<string, DbShape | undefined>;
  g[GLOBAL_KEY] = emptyDb();
}

export function valuesOf<T>(map: Map<string, T>): T[] {
  return Array.from(map.values());
}
