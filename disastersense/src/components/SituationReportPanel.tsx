"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import { situationReportToMarkdown } from "@/lib/agents/sitrep-client";

/**
 * Situation report panel: generate a live report, view the summary and
 * export as Markdown or print-to-PDF.
 */

export function SituationReportPanel() {
  const queryClient = useQueryClient();
  const latest = useQuery({ queryKey: ["sitrep"], queryFn: api.latestSitrep });

  const generate = useMutation({
    mutationFn: api.generateSitrep,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sitrep"] }),
  });

  const report = latest.data?.report ?? null;

  function downloadMarkdown() {
    if (!report) return;
    const md = situationReportToMarkdown(report);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `disastersense-sitrep-${report.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    if (!report) return;
    const md = situationReportToMarkdown(report);
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>DisasterSense SitRep</title>
      <style>body{font-family:ui-sans-serif,system-ui,sans-serif;background:#fff;color:#111;padding:32px;max-width:760px;margin:auto}h1{font-size:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px;font-size:13px;text-align:left}pre{white-space:pre-wrap;font-size:13px;background:#f6f6f6;padding:12px;border-radius:6px}</style>
      </head><body><pre>${md.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</pre>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  }

  return (
    <Card>
      <CardHeader
        title="Live situation report"
        subtitle="Aggregated by the Report Generation Agent"
        action={
          <div className="flex gap-1.5">
            <Button
              variant="primary"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
            >
              <RefreshCw className={generate.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              {generate.isPending ? "Generating…" : "Generate"}
            </Button>
          </div>
        }
      />
      {!report ? (
        <EmptyState
          title="No situation report yet"
          hint="Generate one after running a simulation or receiving reports."
        />
      ) : (
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-[11px] text-faint">
            <FileText className="h-3 w-3" aria-hidden />
            {formatDateTime(report.timestamp)} · {report.id}
          </div>
          <p className="text-xs leading-relaxed text-ink">{report.summary}</p>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Active" value={formatNumber(report.activeIncidents)} />
            <Metric label="Critical" value={formatNumber(report.criticalIncidents)} tone={report.criticalIncidents > 0 ? "text-critical" : undefined} />
            <Metric label="Affected" value={formatNumber(report.peopleAffected)} />
          </div>
          {report.highRiskZones.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">High-risk zones</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {report.highRiskZones.map((zone) => (
                  <Badge key={zone} className="border-high/40 bg-high/10 text-high">{zone}</Badge>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Recommended actions</p>
            <ul className="mt-1 space-y-1 text-xs text-muted">
              {report.recommendedActions.map((action) => (
                <li key={action} className="flex gap-1.5"><span className="text-accent">→</span>{action}</li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 border-t border-line pt-3">
            <Button onClick={downloadMarkdown}><Download className="h-3.5 w-3.5" /> Markdown</Button>
            <Button onClick={printPdf}><Download className="h-3.5 w-3.5" /> PDF (print)</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-line bg-raised px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-faint">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${tone ?? "text-ink"}`}>{value}</p>
    </div>
  );
}
