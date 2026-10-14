/**
 * Domain types for DisasterSense.
 *
 * These mirror the PostgreSQL schema in `sql/schema.sql`. Money-style exact
 * counts (people affected, quantities) are integers; coordinates are WGS84.
 */

export type DisasterType =
  | "flood"
  | "fire"
  | "earthquake"
  | "cyclone"
  | "industrial"
  | "medical"
  | "other";

export type Severity = "low" | "medium" | "high" | "critical";
export type ReportKind = "incident" | "missing_person";

export type IncidentStatus =
  | "new"
  | "analyzing"
  | "awaiting_approval"
  | "dispatched"
  | "in_progress"
  | "resolved";

export type AgentName =
  | "intake"
  | "classification"
  | "geospatial"
  | "resource"
  | "risk"
  | "communication"
  | "report";

export type AgentStatus = "pending" | "running" | "completed" | "needs_review";

export type UserRole = "operator" | "authority" | "coordinator" | "field" | "citizen";

export type ResourceType =
  | "ambulance"
  | "fire_brigade"
  | "rescue_boat"
  | "medical_team"
  | "police_unit"
  | "volunteers"
  | "relief_supplies"
  | "helicopter"
  | "shelter";

export type ResourceAvailability = "available" | "deployed" | "maintenance";

export type FacilityType = "shelter" | "hospital" | "fire_station" | "police_station";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  contact: string;
}

/** A single citizen submission (raw report, pre-analysis). */
export interface IncidentReport {
  id: string;
  reportKind: ReportKind;
  reporterName: string;
  reporterContact: string;
  disasterType: DisasterType;
  description: string;
  address: string;
  coordinates: Coordinates;
  severity: Severity;
  peopleAffected: number;
  mediaUrls: string[];
  contactNumber: string;
  isSos: boolean;
  isSimulation: boolean;
  timestamp: string;
  status: "received" | "processing" | "analyzed" | "failed";
  incidentId: string | null;
}

/** Structured fields extracted by the Intake Agent from free text. */
export interface IntakeExtraction {
  disasterType: DisasterType;
  severity: Severity;
  peopleAffected: number;
  locationText: string;
  coordinates: Coordinates | null;
  urgencyKeywords: string[];
  hazards: string[];
  cleanedDescription: string;
  confidence: number;
}

export interface ClassificationResult {
  category: string;
  urgencyLevel: 1 | 2 | 3 | 4 | 5;
  severity: Severity;
  duplicateOf: string[];
  clusterKey: string;
  rationale: string;
}

export interface NearbyFacility {
  name: string;
  type: FacilityType;
  coordinates: Coordinates;
  distanceKm: number;
}

export interface GeospatialResult {
  coordinates: Coordinates;
  zoneName: string;
  affectedRadiusKm: number;
  nearbyFacilities: NearbyFacility[];
  clusterId: string | null;
}

export interface ResourceRecommendation {
  type: ResourceType;
  quantity: number;
  priority: 1 | 2 | 3 | 4 | 5;
  etaMinutes: number;
  rationale: string;
}

export interface RiskFactor {
  label: string;
  detail: string;
  weight: number; // 0..1 contribution to the risk score
}

export interface RiskAnalysis {
  riskScore: number; // 0..100
  riskLevel: Severity;
  factors: RiskFactor[];
  escalationRisks: string[];
  predictedSpreadKm: number;
  weatherAlert: string | null;
}

export type AlertChannel = "sms" | "social" | "briefing";
export type AlertLanguage = "en" | "hi" | "te";

export interface GeneratedAlert {
  channel: AlertChannel;
  language: AlertLanguage;
  body: string;
}

export interface CommunicationResult {
  alerts: GeneratedAlert[];
  audienceNotes: string;
}

/** A deduplicated active incident the control room works with. */
export interface Incident {
  id: string;
  reportKind: ReportKind;
  title: string;
  disasterType: DisasterType;
  severity: Severity;
  status: IncidentStatus;
  coordinates: Coordinates;
  zoneName: string;
  address: string;
  peopleAffected: number;
  reportIds: string[];
  createdAt: string;
  updatedAt: string;
  intake: IntakeExtraction | null;
  classification: ClassificationResult | null;
  geospatial: GeospatialResult | null;
  risk: RiskAnalysis | null;
  resources: ResourceRecommendation[];
  communication: CommunicationResult | null;
  assignedTeams: string[];
  humanApprovalRequired: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  isSimulation: boolean;
}

export interface AgentLog {
  id: string;
  incidentId: string;
  agentName: AgentName;
  agentLabel: string;
  action: string;
  output: string;
  status: AgentStatus;
  timestamp: string;
}

export interface Resource {
  id: string;
  type: ResourceType;
  label: string;
  quantity: number;
  baseLocation: string;
  baseCoordinates: Coordinates;
  availability: ResourceAvailability;
  assignedIncidentId: string | null;
  etaMinutes: number;
}

export interface Cluster {
  id: string;
  area: string;
  incidentIds: string[];
  riskLevel: Severity;
  recommendedResources: ResourceRecommendation[];
  centroid: Coordinates;
}

export interface SituationReport {
  id: string;
  timestamp: string;
  summary: string;
  activeIncidents: number;
  criticalIncidents: number;
  peopleAffected: number;
  highRiskZones: string[];
  deployedResources: Array<{ type: ResourceType; quantity: number }>;
  recommendedActions: string[];
}

/** Per-incident view of the agent workflow, used by the pipeline visualization. */
export interface AgentStage {
  agent: AgentName;
  label: string;
  status: AgentStatus;
  detail: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface IncidentPipelineState {
  incidentId: string;
  stages: AgentStage[];
  approvalRequired: boolean;
  completed: boolean;
}

export interface KpiSnapshot {
  activeIncidents: number;
  criticalIncidents: number;
  peopleAffected: number;
  resourcesDeployed: number;
  highRiskZones: number;
  reportsPending: number;
}
