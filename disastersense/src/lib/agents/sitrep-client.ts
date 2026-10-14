import type { SituationReport } from "@/types/domain";

/** Client-safe Markdown serializer for situation reports (mirrors the server version). */
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
