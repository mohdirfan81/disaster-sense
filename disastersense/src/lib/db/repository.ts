import type {
  AgentLog,
  Cluster,
  Incident,
  IncidentReport,
  KpiSnapshot,
  Resource,
  SituationReport,
  User,
} from "@/types/domain";
import { getDb, resetDb, valuesOf } from "@/lib/db/store";
import { buildSeedResources, DEMO_OPERATOR_ID, SEED_USERS } from "@/lib/db/seed-data";
import { incidentCode, newId } from "@/lib/id";

/**
 * Data access layer. Every function is async so a PostgreSQL driver can be
 * slotted in behind this exact interface. All reads/writes go through the
 * in-memory singleton store in demo mode.
 */

let seeded = false;

function ensureSeeded(): void {
  if (seeded) return;
  const db = getDb();
  if (db.users.size > 0) {
    seeded = true;
    return;
  }
  for (const user of SEED_USERS) db.users.set(user.id, user);
  for (const resource of buildSeedResources()) db.resources.set(resource.id, resource);
  seeded = true;
}

/** Full reset - used by tests and the "reset demo" action. */
export function resetAll(): void {
  resetDb();
  seeded = false;
  ensureSeeded();
}

/* --------------------------------------------------------------------- users */

export async function getUser(userId: string): Promise<User | null> {
  ensureSeeded();
  return getDb().users.get(userId) ?? null;
}

export async function listUsers(): Promise<User[]> {
  ensureSeeded();
  return valuesOf(getDb().users);
}

export async function defaultOperator(): Promise<User> {
  ensureSeeded();
  const user = getDb().users.get(DEMO_OPERATOR_ID);
  if (!user) throw new Error("Seed operator missing");
  return user;
}

/* ------------------------------------------------------------------- reports */

export async function createReport(
  input: Omit<IncidentReport, "id" | "timestamp" | "status" | "incidentId" | "reportKind"> & {
    reportKind?: IncidentReport["reportKind"];
  },
): Promise<IncidentReport> {
  ensureSeeded();
  const report: IncidentReport = {
    ...input,
    reportKind: input.reportKind ?? "incident",
    // Keep the stored report in agreement with the server-side SOS rule even
    // when created directly (simulation, tests) rather than via /api/reports.
    severity: input.isSos ? "critical" : input.severity,
    id: newId("rep"),
    timestamp: new Date().toISOString(),
    status: "received",
    incidentId: null,
  };
  getDb().reports.set(report.id, report);
  return report;
}

export async function getReport(reportId: string): Promise<IncidentReport | null> {
  ensureSeeded();
  return getDb().reports.get(reportId) ?? null;
}

export async function updateReport(
  reportId: string,
  patch: Partial<IncidentReport>,
): Promise<IncidentReport | null> {
  ensureSeeded();
  const report = getDb().reports.get(reportId);
  if (!report) return null;
  const next = { ...report, ...patch };
  getDb().reports.set(reportId, next);
  return next;
}

export async function listReports(filter?: {
  disasterType?: string;
  status?: string;
}): Promise<IncidentReport[]> {
  ensureSeeded();
  let rows = valuesOf(getDb().reports);
  if (filter?.disasterType) rows = rows.filter((r) => r.disasterType === filter.disasterType);
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
  return rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

/* ----------------------------------------------------------------- incidents */

export async function createIncident(
  input: Pick<
    Incident,
    | "title"
    | "reportKind"
    | "disasterType"
    | "severity"
    | "coordinates"
    | "zoneName"
    | "address"
    | "peopleAffected"
    | "reportIds"
    | "isSimulation"
  >,
): Promise<Incident> {
  ensureSeeded();
  const now = new Date().toISOString();
  const incident: Incident = {
    id: newId("inc"),
    status: "new",
    createdAt: now,
    updatedAt: now,
    intake: null,
    classification: null,
    geospatial: null,
    risk: null,
    resources: [],
    communication: null,
    assignedTeams: [],
    humanApprovalRequired: false,
    approvedBy: null,
    approvedAt: null,
    ...input,
  };
  getDb().incidents.set(incident.id, incident);
  return incident;
}

export async function getIncident(incidentId: string): Promise<Incident | null> {
  ensureSeeded();
  return getDb().incidents.get(incidentId) ?? null;
}

export async function listIncidents(filter?: {
  disasterType?: string;
  severity?: string;
  status?: string;
  search?: string;
}): Promise<Incident[]> {
  ensureSeeded();
  let rows = valuesOf(getDb().incidents);
  if (filter?.disasterType) rows = rows.filter((i) => i.disasterType === filter.disasterType);
  if (filter?.severity) rows = rows.filter((i) => i.severity === filter.severity);
  if (filter?.status) rows = rows.filter((i) => i.status === filter.status);
  if (filter?.search) {
    const needle = filter.search.toLowerCase();
    rows = rows.filter(
      (i) =>
        i.title.toLowerCase().includes(needle) ||
        i.zoneName.toLowerCase().includes(needle) ||
        incidentCode(i.id).toLowerCase().includes(needle),
    );
  }
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Incidents still being worked (not resolved) - the operator's working set. */
export async function listActiveIncidents(): Promise<Incident[]> {
  const all = await listIncidents();
  return all.filter((i) => i.status !== "resolved");
}

/* --------------------------------------------------------------- agent logs */

export async function appendAgentLog(log: Omit<AgentLog, "id" | "timestamp">): Promise<AgentLog> {
  ensureSeeded();
  const entry: AgentLog = { ...log, id: newId("log"), timestamp: new Date().toISOString() };
  const db = getDb();
  const list = db.agentLogs.get(log.incidentId) ?? [];
  list.push(entry);
  db.agentLogs.set(log.incidentId, list);
  return entry;
}

export async function listAgentLogs(incidentId: string): Promise<AgentLog[]> {
  ensureSeeded();
  return getDb().agentLogs.get(incidentId) ?? [];
}

export async function listRecentAgentLogs(limit = 50): Promise<AgentLog[]> {
  ensureSeeded();
  const all = valuesOf(getDb().agentLogs).flat();
  return all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, limit);
}

/* ----------------------------------------------------------------- resources */

export async function listResources(): Promise<Resource[]> {
  ensureSeeded();
  return valuesOf(getDb().resources);
}

export async function assignResources(
  incidentId: string,
  picks: Array<{ type: Resource["type"]; quantity: number }>,
): Promise<Resource[]> {
  ensureSeeded();
  const db = getDb();
  const touched: Resource[] = [];
  for (const pick of picks) {
    const candidates = valuesOf(db.resources)
      .filter((r) => r.type === pick.type && r.availability === "available")
      .sort((a, b) => a.etaMinutes - b.etaMinutes);
    let remaining = pick.quantity;
    for (const resource of candidates) {
      if (remaining <= 0) break;
      const used = Math.min(resource.quantity, remaining);
      remaining -= used;
      const next: Resource = {
        ...resource,
        quantity: used,
        availability: "deployed",
        assignedIncidentId: incidentId,
      };
      db.resources.set(resource.id, next);
      touched.push(next);
      if (used < resource.quantity) {
        db.resources.set(newId("res"), { ...resource, quantity: resource.quantity - used });
      }
    }
  }
  return touched;
}

/* ------------------------------------------------------------------ clusters */

export async function upsertCluster(cluster: Cluster): Promise<Cluster> {
  ensureSeeded();
  getDb().clusters.set(cluster.id, cluster);
  return cluster;
}

export async function listClusters(): Promise<Cluster[]> {
  ensureSeeded();
  return valuesOf(getDb().clusters);
}

/* --------------------------------------------------------- situation report */

export async function saveSituationReport(report: SituationReport): Promise<SituationReport> {
  ensureSeeded();
  const db = getDb();
  db.situationReports.unshift(report);
  db.situationReports = db.situationReports.slice(0, 20);
  return report;
}

export async function latestSituationReport(): Promise<SituationReport | null> {
  ensureSeeded();
  return getDb().situationReports[0] ?? null;
}

export async function listSituationReports(): Promise<SituationReport[]> {
  ensureSeeded();
  return [...getDb().situationReports];
}

/* ---------------------------------------------------------------------- kpis */

export async function kpiSnapshot(): Promise<KpiSnapshot> {
  ensureSeeded();
  const incidents = await listIncidents();
  const active = incidents.filter((i) => i.status !== "resolved");
  const resources = await listResources();
  const clusters = await listClusters();
  const reports = await listReports();
  return {
    activeIncidents: active.length,
    criticalIncidents: active.filter((i) => i.severity === "critical").length,
    peopleAffected: active.reduce((sum, i) => sum + i.peopleAffected, 0),
    resourcesDeployed: resources
      .filter((r) => r.availability === "deployed")
      .reduce((sum, r) => sum + r.quantity, 0),
    highRiskZones: clusters.filter((c) => c.riskLevel === "critical" || c.riskLevel === "high")
      .length,
    reportsPending: reports.filter((r) => r.status === "received" || r.status === "processing")
      .length,
  };
}

export { incidentCode };

export async function updateIncident(
  incidentId: string,
  patch: Partial<Incident>,
): Promise<Incident | null> {
  ensureSeeded();
  const incident = getDb().incidents.get(incidentId);
  if (!incident) return null;
  const next = { ...incident, ...patch, updatedAt: new Date().toISOString() };
  getDb().incidents.set(incidentId, next);
  return next;
}
