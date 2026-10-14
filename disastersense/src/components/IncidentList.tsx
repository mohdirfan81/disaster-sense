"use client";

import Link from "next/link";
import type { IncidentWithCode } from "@/lib/api-client";
import { Badge, Card, EmptyState, cn } from "@/components/ui";
import {
  DISASTER_LABEL,
  SEVERITY_BADGE,
  STATUS_CLASSES,
  STATUS_LABEL,
  formatNumber,
  relativeTime,
} from "@/lib/format";
import {
  Droplets, Flame, Earth, Tornado, Factory, HeartPulse, CircleHelp, ShieldAlert, ChevronRight,
} from "lucide-react";

/** Incident list with severity/type/status filters. */

const TYPE_ICONS: Record<string, React.ElementType> = {
  flood: Droplets,
  fire: Flame,
  earthquake: Earth,
  cyclone: Tornado,
  industrial: Factory,
  medical: HeartPulse,
  other: CircleHelp,
};

export function IncidentList({
  incidents,
  filters,
  onFiltersChange,
  selectedId,
  onSelect,
  running,
}: {
  incidents: IncidentWithCode[];
  filters: { disasterType: string; severity: string; status: string };
  onFiltersChange: (next: { disasterType: string; severity: string; status: string }) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  running: boolean;
}) {
  const selectClass =
    "rounded-sm border border-line bg-raised px-2 py-1.5 text-xs text-ink outline-none";

  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h2 className="mr-auto text-sm font-semibold tracking-tight text-ink">Incidents</h2>
        <select
          aria-label="Filter by disaster type"
          className={selectClass}
          value={filters.disasterType}
          onChange={(e) => onFiltersChange({ ...filters, disasterType: e.target.value })}
        >
          <option value="">All types</option>
          {Object.entries(DISASTER_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by severity"
          className={selectClass}
          value={filters.severity}
          onChange={(e) => onFiltersChange({ ...filters, severity: e.target.value })}
        >
          <option value="">All severities</option>
          {(["critical", "high", "medium", "low"] as const).map((s) => (
            <option key={s} value={s}>{SEVERITY_BADGE[s].label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className={selectClass}
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="scrollbar-slim max-h-[560px] flex-1 overflow-y-auto">
        {incidents.length === 0 ? (
          <EmptyState
            title={running ? "Processing…" : "No incidents match the filters"}
            hint="Run a simulation or submit a citizen report to populate the board."
          />
        ) : (
          <ul className="divide-y divide-line">
            {incidents.map((incident) => {
              const Icon = TYPE_ICONS[incident.disasterType] ?? CircleHelp;
              const sev = SEVERITY_BADGE[incident.severity];
              const selected = incident.id === selectedId;
              return (
                <li key={incident.id} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => onSelect(incident.id)}
                    className={cn(
                      "flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-raised",
                      selected && "bg-raised",
                    )}
                  >
                    <span
                      className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border", sev.classes)}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-faint">{incident.code}</span>
                        {incident.isSimulation ? (
                          <Badge className="border-line bg-raised text-muted">Simulation</Badge>
                        ) : null}
                        {incident.humanApprovalRequired && !incident.approvedBy ? (
                          <Badge className="border-review/40 bg-review/15 text-review">
                            <ShieldAlert className="h-2.5 w-2.5" aria-hidden /> Approval
                          </Badge>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-ink">
                        {incident.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {incident.reportKind === "missing_person" ? (
                          <Badge className="border-review/40 bg-review/15 text-review">Missing person · unverified</Badge>
                        ) : null}
                        <Badge className={sev.classes}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} aria-hidden />
                          {sev.label}
                        </Badge>
                        <Badge className={STATUS_CLASSES[incident.status]}>{STATUS_LABEL[incident.status]}</Badge>
                        <span className="text-[10px] text-faint">
                          {incident.zoneName} · {formatNumber(incident.peopleAffected)} people · {relativeTime(incident.createdAt)}
                        </span>
                      </span>
                    </span>
                  </button>
                  <Link
                    href={`/incidents/${incident.id}`}
                    aria-label={`View details for ${incident.code}`}
                    className="flex shrink-0 items-center border-l border-line px-2.5 text-faint transition-colors hover:bg-raised hover:text-accent"
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
