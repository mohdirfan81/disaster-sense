"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { Badge, Button, Card, CardHeader, cn } from "@/components/ui";
import {
  AGENT_STATUS_CLASSES,
  AGENT_STATUS_LABEL,
  DISASTER_LABEL,
  RESOURCE_LABEL,
  SEVERITY_BADGE,
  STATUS_CLASSES,
  STATUS_LABEL,
  formatDateTime,
  formatNumber,
} from "@/lib/format";
import type { AgentLog } from "@/types/domain";

/**
 * Incident detail: full agent analysis, resource plan, live logs and the
 * human-in-the-loop approval controls for critical dispatches.
 */

export default function IncidentDetailPage() {
  const params = useParams<{ incidentId: string }>();
  const incidentId = params.incidentId;
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => api.incident(incidentId),
    refetchInterval: 2500,
  });

  const approve = useMutation({
    mutationFn: (decision: "approve" | "reject") => api.approve(incidentId, decision),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["incident", incidentId] }),
  });

  if (detail.isPending) {
    return (
      <main id="main-content" className="min-h-screen bg-base px-4 py-6 md:px-6">
        <p className="text-sm text-muted">Loading incident…</p>
      </main>
    );
  }

  if (detail.isError || !detail.data) {
    const notFound =
      detail.error instanceof ApiClientError && detail.error.status === 404;
    return (
      <main id="main-content" className="min-h-screen bg-base px-4 py-6 md:px-6">
        <h1 className={cn("text-sm font-semibold", notFound ? "text-ink" : "text-critical")}>
          {notFound ? "Incident not found" : "Could not load this incident."}
        </h1>
        <p className="mt-1 text-xs text-muted">
          {notFound
            ? "This incident does not exist or may have been removed."
            : "Something went wrong while loading the incident. Please try again."}
        </p>
        <Link href="/" className="mt-2 inline-block text-xs text-accent underline">
          Back to control room
        </Link>
      </main>
    );
  }

  const { incident, logs, reports, pipeline } = detail.data;
  const needsApproval = incident.humanApprovalRequired && !incident.approvedBy;
  const sev = SEVERITY_BADGE[incident.severity];

  return (
    <main id="main-content" className="min-h-screen bg-base px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to control room
        </Link>

        <Card className="mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-faint">{incident.code}</span>
                {incident.isSimulation ? (
                  <Badge className="border-line bg-raised text-muted">Fictional simulation</Badge>
                ) : null}
                <Badge className={sev.classes}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} aria-hidden />
                  {sev.label}
                </Badge>
                <Badge className={STATUS_CLASSES[incident.status]}>{STATUS_LABEL[incident.status]}</Badge>
                <Badge className="border-line bg-raised text-muted">{DISASTER_LABEL[incident.disasterType]}</Badge>
                {incident.reportKind === "missing_person" ? (
                  <Badge className="border-review/40 bg-review/15 text-review">Missing person · unverified</Badge>
                ) : null}
              </div>
              <h1 className="mt-1.5 text-lg font-bold tracking-tight text-ink">{incident.title}</h1>
              <p className="mt-0.5 text-xs text-muted">
                {incident.zoneName} · {incident.address} · {formatNumber(incident.peopleAffected)} people affected ·{" "}
                {formatDateTime(incident.createdAt)}
              </p>
            </div>
            {needsApproval ? (
              <div className="flex gap-2">
                <Button variant="primary" disabled={approve.isPending} onClick={() => approve.mutate("approve")}>
                  <Check className="h-3.5 w-3.5" aria-hidden /> Approve dispatch
                </Button>
                <Button variant="ghost" disabled={approve.isPending} onClick={() => approve.mutate("reject")}>
                  <X className="h-3.5 w-3.5" aria-hidden /> Reject
                </Button>
              </div>
            ) : null}
          </div>

          {needsApproval ? (
            <p className="border-b border-line bg-review/10 px-4 py-2 text-xs text-review">
              This incident is flagged as critical and is awaiting human approval. Resources are
              assigned in the demo inventory only — approving does not dispatch real teams or send
              any messages.
            </p>
          ) : null}
          {incident.approvedBy ? (
            <p className="border-b border-line bg-done/10 px-4 py-2 text-xs text-done">
              Dispatch {incident.approvedAt ? `approved by ${incident.approvedBy}` : "resolved"} —
              resource assignment is simulated within this demo.
            </p>
          ) : null}

          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Agent pipeline</h2>
              <ol className="space-y-1.5">
                {pipeline.stages.map((stage) => {
                  const statusKey = stage.status as keyof typeof AGENT_STATUS_CLASSES;
                  return (
                    <li key={stage.agent} className="flex items-center gap-2 rounded-sm border border-line bg-raised px-2.5 py-1.5">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full bg-current", AGENT_STATUS_CLASSES[statusKey])} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-ink">{stage.label}</span>
                        {stage.detail ? <span className="block truncate text-[10px] text-faint">{stage.detail}</span> : null}
                      </span>
                      <span className={cn("shrink-0 text-[10px] font-medium", AGENT_STATUS_CLASSES[statusKey])}>
                        {AGENT_STATUS_LABEL[statusKey]}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Recommended resources</h2>
              {incident.resources.length === 0 ? (
                <p className="text-xs text-faint">No resources recommended.</p>
              ) : (
                <ul className="space-y-1.5">
                  {incident.resources.map((r, index) => (
                    <li key={`${r.type}-${index}`} className="flex items-center justify-between rounded-sm border border-line bg-raised px-2.5 py-1.5 text-xs">
                      <span className="text-ink">{RESOURCE_LABEL[r.type]} × {r.quantity}</span>
                      <span className="text-faint">P{r.priority} · ~{r.etaMinutes}m</span>
                    </li>
                  ))}
                </ul>
              )}
              {incident.assignedTeams.length > 0 ? (
                <p className="mt-2 text-[11px] text-done">
                  Assigned (simulated): {incident.assignedTeams.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Risk analysis" subtitle={`Score ${incident.risk?.riskScore ?? 0} / 100`} />
            <div className="space-y-2 p-4">
              {incident.risk ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={SEVERITY_BADGE[incident.risk.riskLevel].classes}>
                      {SEVERITY_BADGE[incident.risk.riskLevel].label} risk
                    </Badge>
                    <Badge className="border-line bg-raised text-muted">Spread ~{incident.risk.predictedSpreadKm} km</Badge>
                    {incident.risk.weatherAlert ? (
                      <Badge className="border-medium/40 bg-medium/10 text-medium">{incident.risk.weatherAlert}</Badge>
                    ) : null}
                  </div>
                  <ul className="space-y-1 text-xs text-muted">
                    {incident.risk.factors.map((factor, index) => (
                      <li key={index}>• {factor.label}: {factor.detail}</li>
                    ))}
                  </ul>
                  {incident.risk.escalationRisks.length > 0 ? (
                    <p className="text-xs text-high">⚠ {incident.risk.escalationRisks.join("; ")}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-faint">No risk analysis yet.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Generated alerts" />
            <div className="space-y-2 p-4">
              {incident.communication ? (
                <>
                  {incident.communication.alerts.map((alert, index) => (
                    <div key={index} className="rounded-sm border border-line bg-raised px-2.5 py-2">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-faint">
                        <span className="font-semibold text-accent">{alert.channel}</span>·{alert.language}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink">{alert.body}</p>
                    </div>
                  ))}
                  {incident.communication.audienceNotes ? (
                    <p className="text-[11px] text-faint">{incident.communication.audienceNotes}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-faint">No alerts generated yet.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader title="Agent activity log" subtitle="Chronological actions for this incident" />
          <div className="scrollbar-slim max-h-80 overflow-y-auto p-4">
            {logs.length === 0 ? (
              <p className="text-xs text-faint">No activity recorded.</p>
            ) : (
              <ul className="space-y-2">
                {logs.map((log: AgentLog) => (
                  <li key={log.id} className="border-l-2 border-line pl-2.5 text-[11px]">
                    <span className="text-faint">{formatDateTime(log.timestamp)}</span>{" "}
                    <span className="font-semibold text-ink">{log.agentLabel || log.agentName}</span>{" "}
                    <span className="text-muted">{log.action}</span>
                    {log.output ? <span className="block text-faint">{log.output}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {reports.length > 0 ? (
          <Card className="mt-4">
            <CardHeader title={`Source reports (${reports.length})`} />
            <ul className="divide-y divide-line">
              {reports.map((report) => (
                <li key={report.id} className="px-4 py-2.5 text-xs">
                  <span className="font-medium text-ink">{report.reporterName}</span>
                  {report.isSimulation ? (
                    <span className="ml-1.5 text-faint">(fictional simulation)</span>
                  ) : null}{" "}
                  <span className="text-faint">· {formatDateTime(report.timestamp)}</span>
                  <p className="mt-0.5 text-muted">{report.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
