/** Central runtime configuration - env-driven with safe demo defaults. */

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",

  app: {
    name: "DisasterSense",
    tagline: "Disaster Response Multi-Agent System",
    /** Prototype banner - never remove: this is decision support, not 911/112. */
    disclaimer:
      "Decision-support prototype. DisasterSense does not dispatch real emergency services. Always confirm through official channels.",
  },

  /**
   * Demo pacing. The pipeline "runs" agents with these delays so the UI shows
   * step-by-step progress; tests set both to 0 for instant execution.
   */
  pipeline: {
    stepDelayMs: num(process.env.PIPELINE_STEP_DELAY_MS, 650),
  },

  simulation: {
    /** Gap between generated reports so the feed animates believably. */
    reportGapMs: num(process.env.SIMULATION_REPORT_GAP_MS, 400),
    minReports: 8,
    maxReports: 15,
  },

  limits: {
    maxReportsPerBatch: 15,
    maxDescriptionLength: 2000,
    maxPeopleAffected: 100_000,
  },
} as const;

export const AGENT_LABELS: Record<string, string> = {
  intake: "Intake Agent",
  classification: "Classification Agent",
  geospatial: "Geospatial Agent",
  resource: "Resource Allocation Agent",
  risk: "Risk Analysis Agent",
  communication: "Communication Agent",
  report: "Report Generation Agent",
};
