import type {
  DisasterType,
  ResourceRecommendation,
  RiskAnalysis,
  Severity,
} from "@/types/domain";

/**
 * RESOURCE ALLOCATION AGENT
 * Recommends resources (type, quantity, priority, ETA) from the incident
 * profile and risk analysis. Quantities are scaled by severity and people
 * affected; critical incidents also flag the human-approval requirement.
 *
 * Mock logic: rules table. Replace with an optimization/LLM planner later.
 */

interface ResourceRule {
  type: ResourceRecommendation["type"];
  base: number;
  perSeverity: Partial<Record<Severity, number>>;
  perPeople?: number; // extra units per N people
  appliesTo: DisasterType[];
  rationale: string;
}

const RULES: ResourceRule[] = [
  { type: "ambulance", base: 1, perSeverity: { medium: 1, high: 2, critical: 3 }, perPeople: 50, appliesTo: ["flood", "fire", "earthquake", "cyclone", "industrial", "medical", "other"], rationale: "Casualty evacuation and on-scene medical care." },
  { type: "fire_brigade", base: 1, perSeverity: { high: 1, critical: 2 }, appliesTo: ["fire", "industrial", "earthquake"], rationale: "Fire suppression and structural rescue support." },
  { type: "rescue_boat", base: 2, perSeverity: { high: 2, critical: 4 }, perPeople: 50, appliesTo: ["flood", "cyclone"], rationale: "Water rescue for submerged areas." },
  { type: "medical_team", base: 1, perSeverity: { high: 1, critical: 2 }, perPeople: 100, appliesTo: ["flood", "earthquake", "cyclone", "industrial", "medical"], rationale: "Triage and field treatment." },
  { type: "police_unit", base: 1, perSeverity: { medium: 1, high: 1, critical: 2 }, appliesTo: ["flood", "fire", "earthquake", "cyclone", "industrial", "medical", "other"], rationale: "Perimeter control and evacuation traffic management." },
  { type: "volunteers", base: 5, perSeverity: { high: 10, critical: 20 }, perPeople: 20, appliesTo: ["flood", "earthquake", "cyclone", "fire"], rationale: "Search support, relief distribution, sandbagging." },
  { type: "relief_supplies", base: 10, perSeverity: { medium: 10, high: 30, critical: 60 }, perPeople: 10, appliesTo: ["flood", "earthquake", "cyclone", "industrial"], rationale: "Food, water, blankets for displaced people." },
  { type: "helicopter", base: 0, perSeverity: { critical: 1 }, appliesTo: ["flood", "earthquake", "cyclone"], rationale: "Aerial survey and medevac when roads are cut." },
  { type: "shelter", base: 1, perSeverity: { high: 1, critical: 2 }, perPeople: 150, appliesTo: ["flood", "fire", "earthquake", "cyclone", "industrial"], rationale: "Temporary shelter for displaced residents." },
];

const BASE_ETA_MINUTES = 8;

export function recommendResources(
  disasterType: DisasterType,
  severity: Severity,
  peopleAffected: number,
  risk: RiskAnalysis,
): ResourceRecommendation[] {
  const recommendations: ResourceRecommendation[] = [];

  for (const rule of RULES) {
    if (!rule.appliesTo.includes(disasterType)) continue;
    let quantity = rule.base + (rule.perSeverity[severity] ?? 0);
    if (rule.perPeople && peopleAffected > 0) {
      quantity += Math.ceil(peopleAffected / rule.perPeople);
    }
    if (quantity <= 0) continue;

    const priority: 1 | 2 | 3 | 4 | 5 =
      severity === "critical" ? 5 : severity === "high" ? 4 : severity === "medium" ? 3 : 2;

    // Higher risk pushes ETAs later (congestion / secondary hazards).
    const congestionFactor = 1 + risk.riskScore / 200;
    const etaMinutes = Math.round(BASE_ETA_MINUTES * congestionFactor + quantity);

    recommendations.push({
      type: rule.type,
      quantity,
      priority,
      etaMinutes,
      rationale: rule.rationale,
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority || a.etaMinutes - b.etaMinutes);
}

/** Critical dispatch decisions always require human sign-off in this prototype. */
export function requiresHumanApproval(severity: Severity, resources: ResourceRecommendation[]): boolean {
  if (severity === "critical") return true;
  return resources.some((r) => r.priority >= 5 && r.quantity >= 3);
}

export const RESOURCE_LABELS: Record<ResourceRecommendation["type"], string> = {
  ambulance: "Ambulance",
  fire_brigade: "Fire brigade",
  rescue_boat: "Rescue boat",
  medical_team: "Medical team",
  police_unit: "Police unit",
  volunteers: "Volunteers",
  relief_supplies: "Relief supplies",
  helicopter: "Helicopter",
  shelter: "Shelter bay",
};
