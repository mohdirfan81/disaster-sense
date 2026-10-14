import type {
  DisasterType,
  RiskAnalysis,
  RiskFactor,
  Severity,
} from "@/types/domain";

/**
 * RISK ANALYSIS AGENT
 * Combines weather conditions, incident density and severity into a 0-100
 * risk score, names escalation risks, and predicts spread.
 *
 * Mock logic: deterministic scoring from inputs. The weather hook is an
 * isolated function so a real weather API (IMD/OpenWeather) can replace it
 * without changing the rest of the agent.
 */

export interface RiskInputs {
  disasterType: DisasterType;
  severity: Severity;
  peopleAffected: number;
  urgencyLevel: 1 | 2 | 3 | 4 | 5;
  nearbyIncidentCount: number;
  hazards: string[];
  zoneName: string;
}

/** Mock weather feed - replace with a real API call keyed by coordinates. */
export function fetchWeatherBrief(zoneName: string): { alert: string | null; windKph: number; rainMm: number } {
  // Deterministic pseudo-weather per zone so demos are stable within a day.
  const seed = zoneName.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const windKph = 8 + (seed % 34);
  const rainMm = seed % 40;
  if (rainMm > 28) return { alert: `Heavy rain warning (${rainMm} mm/6h) in ${zoneName}`, windKph, rainMm };
  if (windKph > 32) return { alert: `High winds (${windKph} km/h) in ${zoneName}`, windKph, rainMm };
  return { alert: null, windKph, rainMm };
}

const SPREAD_KM: Record<DisasterType, number> = {
  flood: 1.2,
  fire: 0.8,
  earthquake: 0.3,
  cyclone: 2.4,
  industrial: 1.6,
  medical: 0.1,
  other: 0.4,
};

const ESCALATION: Record<DisasterType, string[]> = {
  flood: ["Rising water levels may submerge low-lying streets within 2-4 hours.", "Downstream overflow risk if inflow continues."],
  fire: ["Wind shift could spread fire to adjacent blocks.", "Nearby gas cylinders risk BLEVE explosion."],
  earthquake: ["Aftershocks may cause further structural collapse.", "Damaged gas lines risk secondary fires."],
  cyclone: ["Storm intensification possible; flying debris hazard.", "Storm surge may affect coastal settlements."],
  industrial: ["Chemical plume may drift with prevailing wind.", "Secondary explosion risk from stored solvents."],
  medical: ["Case load may exceed nearby hospital capacity.", "Contagion risk if infectious cause not ruled out."],
  other: ["Situation may escalate without on-ground confirmation."],
};

export function riskAnalyze(inputs: RiskInputs): RiskAnalysis {
  const weather = fetchWeatherBrief(inputs.zoneName);
  const factors: RiskFactor[] = [];

  const severityWeight = { low: 0.15, medium: 0.35, high: 0.6, critical: 0.85 }[inputs.severity];
  factors.push({ label: "Severity", detail: `Reported severity "${inputs.severity}"`, weight: severityWeight });

  const peopleWeight = Math.min(inputs.peopleAffected / 200, 1) * 0.7;
  factors.push({
    label: "People affected",
    detail: `${inputs.peopleAffected} people in the affected area`,
    weight: Number(peopleWeight.toFixed(2)),
  });

  const densityWeight = Math.min(inputs.nearbyIncidentCount / 5, 1) * 0.6;
  factors.push({
    label: "Incident density",
    detail: `${inputs.nearbyIncidentCount} related incident(s) in the zone`,
    weight: Number(densityWeight.toFixed(2)),
  });

  const hazardWeight = Math.min(inputs.hazards.length / 3, 1) * 0.5;
  if (hazardsPresent(inputs)) {
    factors.push({
      label: "Hazards detected",
      detail: `Keywords: ${inputs.hazards.slice(0, 4).join(", ")}`,
      weight: Number(hazardWeight.toFixed(2)),
    });
  }

  if (weather.alert) {
    factors.push({ label: "Weather", detail: weather.alert, weight: 0.3 });
  }

  const rawScore = factors.reduce((sum, f) => sum + f.weight, 0) / Math.max(factors.length * 0.85, 1);
  const riskScore = Math.min(100, Math.round(rawScore * 100));

  const riskLevel: Severity =
    riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 35 ? "medium" : "low";

  const spreadBase = SPREAD_KM[inputs.disasterType];
  const weatherFactor = weather.rainMm > 28 || weather.windKph > 32 ? 1.6 : 1;
  const predictedSpreadKm = Number((spreadBase * weatherFactor * (riskScore / 60)).toFixed(2));

  return {
    riskScore,
    riskLevel,
    factors,
    escalationRisks: ESCALATION[inputs.disasterType],
    predictedSpreadKm,
    weatherAlert: weather.alert,
  };
}

function hazardsPresent(inputs: RiskInputs): boolean {
  return inputs.hazards.length > 0;
}
