import type {
  AgentName,
  AgentStage,
  Incident,
  IncidentReport,
  SituationReport,
} from "@/types/domain";
import { AGENT_LABELS, config } from "@/lib/config";
import { incidentCode, newId } from "@/lib/id";
import { haversineKm } from "@/lib/geo";
import * as repo from "@/lib/db/repository";
import { intakeExtract } from "@/lib/agents/intake";
import { classifyIncident } from "@/lib/agents/classification";
import { geospatialAnalyze } from "@/lib/agents/geospatial";
import { riskAnalyze } from "@/lib/agents/risk";
import { recommendResources, requiresHumanApproval } from "@/lib/agents/resource";
import { generateAlerts } from "@/lib/agents/communication";

/**
 * PIPELINE ORCHESTRATOR
 * Runs the seven agents in order for one report:
 *   Intake -> Classification -> Geospatial -> Risk -> Resource -> Communication -> Report
 *
 * Each step writes an AgentLog (live feed), updates the incident stage state
 * (workflow visualization), and applies a small delay so the UI visibly
 * progresses. The agents themselves are pure functions - this file is the
 * only place that persists their outputs.
 */

const STAGE_ORDER: AgentName[] = [
  "intake",
  "classification",
  "geospatial",
  "risk",
  "resource",
  "communication",
  "report",
];

export function initialStages(): AgentStage[] {
  return STAGE_ORDER.map((agent) => ({
    agent,
    label: AGENT_LABELS[agent],
    status: "pending",
    detail: "Waiting",
    startedAt: null,
    finishedAt: null,
  }));
}

export async function runPipelineForReport(report: IncidentReport): Promise<Incident> {
  const delay = config.pipeline.stepDelayMs;
  await repo.updateReport(report.id, { status: "processing" });

  // Intake: pure extraction; the incident is created right after classification.
  const extraction = intakeExtract(report);
  await sleep(delay);

  const existing = await repo.listActiveIncidents();
  // Cross-kind merges are never allowed. A missing-person report stays isolated
  // (it never merges), and an ordinary report must not absorb a missing-person
  // incident — even when type, place and time all match — so it is only offered
  // ordinary incidents as merge candidates. Same-kind duplicate matching is
  // unchanged.
  const mergeCandidates =
    report.reportKind === "missing_person"
      ? []
      : existing.filter((i) => i.reportKind !== "missing_person");
  const classification = classifyIncident(
    extraction,
    report.timestamp,
    mergeCandidates.map((i) => ({
      id: i.id,
      disasterType: i.disasterType,
      coordinates: i.coordinates,
      createdAt: i.createdAt,
    })),
  );

  const duplicateTarget =
    classification.duplicateOf.length > 0
      ? await repo.getIncident(classification.duplicateOf[0])
      : null;

  let incident: Incident;
  if (duplicateTarget) {
    incident = (await repo.updateIncident(duplicateTarget.id, {
      peopleAffected: duplicateTarget.peopleAffected + extraction.peopleAffected,
      reportIds: [...duplicateTarget.reportIds, report.id],
    }))!;
  } else {
    incident = await repo.createIncident({
      title:
        report.reportKind === "missing_person"
          ? `Missing person — ${extraction.locationText.slice(0, 35)}`
          : buildTitle(extraction.disasterType, extraction.locationText),
      reportKind: report.reportKind,
      disasterType: extraction.disasterType,
      severity: extraction.severity,
      coordinates: extraction.coordinates ?? report.coordinates,
      zoneName: geospatialAnalyze(
        extraction.coordinates ?? report.coordinates,
        extraction.disasterType,
      ).zoneName,
      address: extraction.locationText,
      peopleAffected: extraction.peopleAffected,
      reportIds: [report.id],
      isSimulation: report.isSimulation ?? false,
    });
  }

  pipelineStates().set(incident.id, {
    stages: initialStages(),
    approvalRequired: false,
    completed: false,
  });
  await repo.updateReport(report.id, { incidentId: incident.id, status: "processing" });
  await repo.updateIncident(incident.id, { status: "analyzing", intake: extraction, classification });

  await log(
    incident.id,
    "intake",
    `Validated report ${report.id}`,
    `Type=${extraction.disasterType}, severity=${extraction.severity}, people=${extraction.peopleAffected}, keywords=${extraction.urgencyKeywords.join("|") || "none"}`,
    "completed",
  );
  setStage(incident.id, "intake", {
    status: "completed",
    detail: `Type: ${extraction.disasterType}`,
    finishedAt: new Date().toISOString(),
  });

  return runAnalysisStages(incident, report.id, classification, extraction, existing, delay);
}

interface PipelineState {
  stages: AgentStage[];
  approvalRequired: boolean;
  completed: boolean;
}

/**
 * Pipeline state must be visible across separate Next.js route bundles: the
 * pipeline runs in /api/reports and /api/simulation, while /api/incidents/[id]
 * reads the state back. A module-level Map is a distinct instance per bundle,
 * so the detail view always read an empty state. Keep it on globalThis exactly
 * like the data store in src/lib/db/store.ts.
 */
const PIPELINE_STATE_KEY = "__disastersense_pipeline_states__";

function pipelineStates(): Map<string, PipelineState> {
  const g = globalThis as unknown as Record<string, Map<string, PipelineState> | undefined>;
  if (!g[PIPELINE_STATE_KEY]) g[PIPELINE_STATE_KEY] = new Map<string, PipelineState>();
  return g[PIPELINE_STATE_KEY]!;
}

export function getPipelineState(incidentId: string): PipelineState {
  return (
    pipelineStates().get(incidentId) ?? {
      stages: initialStages(),
      approvalRequired: false,
      completed: false,
    }
  );
}

function setStage(incidentId: string, agent: AgentName, patch: Partial<AgentStage>) {
  const state = getPipelineState(incidentId);
  const stages = state.stages.map((s) => (s.agent === agent ? { ...s, ...patch } : s));
  pipelineStates().set(incidentId, { ...state, stages });
}

/** Stages 2-7: classification bookkeeping through report generation. */
async function runAnalysisStages(
  incident: Incident,
  reportId: string,
  classification: ReturnType<typeof classifyIncident>,
  extraction: ReturnType<typeof intakeExtract>,
  existing: Incident[],
  delay: number,
): Promise<Incident> {
  // ---------- Classification
  setStage(incident.id, "classification", {
    status: "running",
    detail: "Classifying urgency & duplicates",
    startedAt: new Date().toISOString(),
  });
  await sleep(delay);
  const duplicateNote =
    classification.duplicateOf.length > 0
      ? `Merged ${classification.duplicateOf.length} duplicate(s)`
      : "New incident";
  await log(
    incident.id,
    "classification",
    `Marked incident as ${classification.severity.toUpperCase()}`,
    `${classification.category} · urgency ${classification.urgencyLevel}/5 · ${duplicateNote}`,
    "completed",
  );
  setStage(incident.id, "classification", {
    status: "completed",
    detail: `${classification.category} · U${classification.urgencyLevel}`,
    finishedAt: new Date().toISOString(),
  });
  incident = (await repo.updateIncident(incident.id, {
    classification,
    severity: classification.severity,
  }))!;

  // ---------- Geospatial
  setStage(incident.id, "geospatial", {
    status: "running",
    detail: "Mapping zone & facilities",
    startedAt: new Date().toISOString(),
  });
  await sleep(delay);
  const geo = geospatialAnalyze(incident.coordinates, incident.disasterType);
  await log(
    incident.id,
    "geospatial",
    `Mapped to ${geo.zoneName}`,
    `Affected radius ${geo.affectedRadiusKm} km · ${geo.nearbyFacilities.length} nearby facilities`,
    "completed",
  );
  setStage(incident.id, "geospatial", {
    status: "completed",
    detail: geo.zoneName,
    finishedAt: new Date().toISOString(),
  });
  incident = (await repo.updateIncident(incident.id, {
    geospatial: geo,
    zoneName: geo.zoneName,
  }))!;

  // ---------- Risk
  setStage(incident.id, "risk", {
    status: "running",
    detail: "Scoring escalation risk",
    startedAt: new Date().toISOString(),
  });
  await sleep(delay);
  const nearbyCount = existing.filter(
    (i) => i.id !== incident.id && haversineKm(i.coordinates, incident.coordinates) < 3,
  ).length;
  const risk = riskAnalyze({
    disasterType: incident.disasterType,
    severity: incident.severity,
    peopleAffected: incident.peopleAffected,
    urgencyLevel: classification.urgencyLevel,
    nearbyIncidentCount: nearbyCount,
    hazards: extraction.hazards,
    zoneName: geo.zoneName,
  });
  await log(
    incident.id,
    "risk",
    `Risk score ${risk.riskScore}/100 (${risk.riskLevel.toUpperCase()})`,
    `${risk.escalationRisks[0]} Spread est. ${risk.predictedSpreadKm} km.`,
    risk.riskLevel === "critical" ? "needs_review" : "completed",
  );
  setStage(incident.id, "risk", {
    status: risk.riskLevel === "critical" ? "needs_review" : "completed",
    detail: `Score ${risk.riskScore}`,
    finishedAt: new Date().toISOString(),
  });
  incident = (await repo.updateIncident(incident.id, { risk }))!;

  // ---------- Resource Allocation
  setStage(incident.id, "resource", {
    status: "running",
    detail: "Recommending resources",
    startedAt: new Date().toISOString(),
  });
  await sleep(delay);
  const resources = recommendResources(
    incident.disasterType,
    incident.severity,
    incident.peopleAffected,
    risk,
  );
  const approvalRequired = requiresHumanApproval(incident.severity, resources);
  const summary = resources
    .slice(0, 4)
    .map((r) => `${r.quantity}x ${r.type.replace("_", " ")}`)
    .join(", ");
  await log(
    incident.id,
    "resource",
    `Recommended ${summary}`,
    `${resources.length} resource types · ETA ${resources[0]?.etaMinutes ?? 0} min`,
    approvalRequired ? "needs_review" : "completed",
  );
  setStage(incident.id, "resource", {
    status: approvalRequired ? "needs_review" : "completed",
    detail: approvalRequired ? "Human approval required" : `${resources.length} types`,
    finishedAt: new Date().toISOString(),
  });
  incident = (await repo.updateIncident(incident.id, {
    resources,
    humanApprovalRequired: approvalRequired,
  }))!;

  // ---------- Communication
  setStage(incident.id, "communication", {
    status: "running",
    detail: "Drafting alerts (EN/HI/TE)",
    startedAt: new Date().toISOString(),
  });
  await sleep(delay);
  const communication = generateAlerts({
    incidentCode: incidentCode(incident.id),
    zoneName: geo.zoneName,
    disasterType: incident.disasterType,
    severity: incident.severity,
    peopleAffected: incident.peopleAffected,
  });
  await log(
    incident.id,
    "communication",
    "Generated multilingual alerts",
    `${communication.alerts.length} alerts across SMS/social/briefing (EN, HI, TE)`,
    "completed",
  );
  setStage(incident.id, "communication", {
    status: "completed",
    detail: `${communication.alerts.length} alerts`,
    finishedAt: new Date().toISOString(),
  });
  incident = (await repo.updateIncident(incident.id, { communication }))!;

  // ---------- Report Generation (cluster upsert + status)
  setStage(incident.id, "report", {
    status: "running",
    detail: "Updating situation picture",
    startedAt: new Date().toISOString(),
  });
  await sleep(delay);
  const allActive = await repo.listActiveIncidents();
  await repo.upsertCluster({
    id: classification.clusterKey,
    area: geo.zoneName,
    incidentIds: allActive
      .filter((i) => i.classification?.clusterKey === classification.clusterKey)
      .map((i) => i.id),
    riskLevel: risk.riskLevel,
    recommendedResources: resources,
    centroid: incident.coordinates,
  });
  await repo.updateIncident(incident.id, {
    // Approval-gated incidents wait with an explicit status; only the /approve
    // endpoint marks them "dispatched" (a simulated resource assignment).
    status: approvalRequired ? "awaiting_approval" : "in_progress",
  });
  await repo.updateReport(reportId, { status: "analyzed" });
  await log(
    incident.id,
    "report",
    "Situation picture updated",
    `Incident ${incidentCode(incident.id)} → ${approvalRequired ? "awaiting dispatch approval" : "in progress"}`,
    "completed",
  );
  setStage(incident.id, "report", {
    status: "completed",
    detail: "Updated",
    finishedAt: new Date().toISOString(),
  });

  pipelineStates().set(incident.id, {
    stages: getPipelineState(incident.id).stages,
    approvalRequired,
    completed: true,
  });
  return (await repo.getIncident(incident.id))!;
}

/**
 * Builds a situation report snapshot from the current state of the system.
 * Used by the /api/sitrep endpoint to give operators a rolling decision-support
 * summary (active/critical counts, people affected, high-risk zones and
 * recommended actions). Pure read path - no pipeline steps.
 */
export async function buildSituationReport(): Promise<SituationReport> {
  const active = await repo.listActiveIncidents();
  const clusters = await repo.listClusters();

  const critical = active.filter((i) => i.severity === "critical");
  const highRisk = clusters.filter((c) => c.riskLevel === "critical" || c.riskLevel === "high");
  const highRiskZones = highRisk.map((c) => c.area);

  const people = active.reduce((sum, i) => sum + i.peopleAffected, 0);

  const summary = [
    `DisasterSense control picture at ${new Date().toISOString()}: ${active.length} active incident(s) (${critical.length} critical) across ${clusters.length} zone cluster(s).`,
    `Approximately ${people} people affected.`,
    highRiskZones.length > 0
      ? `High-risk zones: ${highRiskZones.join(", ")}.`
      : "No zones currently above the high-risk threshold.",
  ].join(" ");

  const recommendedActions: string[] = [];
  if (critical.length > 0) {
    recommendedActions.push(`Expedite human approval for ${critical.length} critical dispatch(es).`);
  }
  if (highRisk.length > 0) {
    recommendedActions.push(`Pre-position supplies near ${highRisk[0].area} before conditions worsen.`);
  }
  if (people > 500) {
    recommendedActions.push("Coordinate mass-care shelters; request state disaster force support.");
  }
  recommendedActions.push(
    "Verify all agent-derived figures with field teams before public communication.",
  );
  recommendedActions.push("Reminder: this prototype does not dispatch real services.");

  return {
    id: newId("sitrep"),
    timestamp: new Date().toISOString(),
    summary,
    activeIncidents: active.length,
    criticalIncidents: critical.length,
    peopleAffected: people,
    highRiskZones,
    deployedResources: [],
    recommendedActions,
  };
}

export function situationReportToMarkdown(report: SituationReport): string {
  return [
    `# DisasterSense Situation Report`,
    ``,
    `**Generated:** ${new Date(report.timestamp).toLocaleString()}`,
    `**Report ID:** ${report.id}`,
    ``,
    `> Decision-support prototype. Not a replacement for official emergency services.`,
    ``,
    `## Summary`,
    report.summary,
    ``,
    `## Key Figures`,
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Active incidents | ${report.activeIncidents} |`,
    `| Critical incidents | ${report.criticalIncidents} |`,
    `| People affected (est.) | ${report.peopleAffected} |`,
    `| High-risk zones | ${report.highRiskZones.length} |`,
    ``,
    `## High-Risk Zones`,
    report.highRiskZones.length
      ? report.highRiskZones.map((z) => `- ${z}`).join("\n")
      : "- None above threshold.",
    ``,
    `## Deployed Resources`,
    report.deployedResources.length
      ? report.deployedResources.map((r) => `- ${r.type.replace(/_/g, " ")}: ${r.quantity}`).join("\n")
      : "- No resources deployed yet.",
    ``,
    `## Recommended Actions`,
    report.recommendedActions.map((a) => `- ${a}`).join("\n"),
    ``,
  ].join("\n");
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function log(
  incidentId: string,
  agent: AgentName,
  action: string,
  output: string,
  status: AgentStage["status"],
) {
  await repo.appendAgentLog({
    incidentId,
    agentName: agent,
    agentLabel: AGENT_LABELS[agent] ?? agent,
    action,
    output,
    status,
  });
}

/** Builds a human-readable title from the disaster type and location text. */
function buildTitle(type: string, location: string): string {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return `${label} — ${location.slice(0, 48)}`;
}
