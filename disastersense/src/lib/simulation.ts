import type { DisasterType } from "@/types/domain";
import { config } from "@/lib/config";
import { jitterAround, ZONE_DEFINITIONS } from "@/lib/geo";
import * as repo from "@/lib/db/repository";
import { runPipelineForReport } from "@/lib/agents/pipeline";
import { SCENARIOS, type Scenario } from "@/lib/simulation-scenarios";

/**
 * SIMULATION ENGINE
 * Generates 8-15 realistic sample reports (at least one flood, fire and
 * earthquake guaranteed) and runs the agent pipeline over them so operators
 * can watch the system work end-to-end. All data is fictional.
 */

export interface SimulationResult {
  reportIds: string[];
  incidentIds: string[];
  scenariosRun: number;
  message: string;
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

export async function runSimulation(scenarioCount?: number): Promise<SimulationResult> {
  const count = Math.min(
    Math.max(scenarioCount ?? 10, config.simulation.minReports),
    config.simulation.maxReports,
    SCENARIOS.length,
  );

  const chosen: Scenario[] = [];
  const start = Math.floor(Math.random() * SCENARIOS.length);
  for (let i = 0; i < count; i += 1) {
    chosen.push(pick(SCENARIOS, start + i));
  }
  // Guarantee the three mandatory disaster types in every batch.
  for (const mandatory of ["flood", "fire", "earthquake"] as DisasterType[]) {
    if (!chosen.some((s) => s.disasterType === mandatory)) {
      chosen[chosen.length - 1] = SCENARIOS.find((s) => s.disasterType === mandatory)!;
    }
  }

  const reportIds: string[] = [];
  const incidentIds: string[] = [];

  for (const scenario of chosen) {
    const zone = ZONE_DEFINITIONS[scenario.zoneIndex % ZONE_DEFINITIONS.length];
    const coordinates = jitterAround(zone.center, zone.radiusKm * 0.6);
    const report = await repo.createReport({
      reporterName: scenario.reporter,
      reporterContact: scenario.contact,
      disasterType: scenario.disasterType,
      description: scenario.description,
      address: `${zone.name}, Vasanthapuram Metro`,
      coordinates,
      severity: scenario.severity,
      peopleAffected: scenario.peopleAffected,
      mediaUrls: [],
      contactNumber: scenario.contact,
      isSos: scenario.severity === "critical",
      isSimulation: true,
    });
    reportIds.push(report.id);

    const incident = await runPipelineForReport(report);
    incidentIds.push(incident.id);

    await new Promise((r) => setTimeout(r, config.simulation.reportGapMs));
  }

  const uniqueIncidents = [...new Set(incidentIds)];
  return {
    reportIds,
    incidentIds: uniqueIncidents,
    scenariosRun: count,
    message: `Simulation complete: ${count} reports processed into ${uniqueIncidents.length} incident(s). All data is fictional.`,
  };
}
