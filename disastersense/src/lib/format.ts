/** Client-safe formatting + label helpers (no server-only imports). */

import type {
  AgentStatus,
  DisasterType,
  IncidentStatus,
  ResourceAvailability,
  ResourceType,
  Severity,
} from "@/types/domain";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const SEVERITY_BADGE: Record<Severity, { label: string; classes: string; dot: string }> = {
  critical: { label: "Critical", classes: "bg-critical/15 text-critical border-critical/40", dot: "bg-critical" },
  high: { label: "High", classes: "bg-high/15 text-high border-high/40", dot: "bg-high" },
  medium: { label: "Medium", classes: "bg-medium/15 text-medium border-medium/40", dot: "bg-medium" },
  low: { label: "Low", classes: "bg-low/15 text-low border-low/40", dot: "bg-low" },
};

export const SEVERITY_HEX: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  new: "New",
  analyzing: "Analyzing",
  awaiting_approval: "Awaiting approval",
  dispatched: "Dispatched",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export const STATUS_CLASSES: Record<IncidentStatus, string> = {
  new: "bg-accent/15 text-accent border-accent/40",
  analyzing: "bg-running/15 text-running border-running/40",
  awaiting_approval: "bg-review/15 text-review border-review/40",
  dispatched: "bg-high/15 text-high border-high/40",
  in_progress: "bg-accent/15 text-accent border-accent/40",
  resolved: "bg-done/15 text-done border-done/40",
};

export const DISASTER_LABEL: Record<DisasterType, string> = {
  flood: "Flood",
  fire: "Fire",
  earthquake: "Earthquake",
  cyclone: "Cyclone",
  industrial: "Industrial",
  medical: "Medical",
  other: "Other",
};

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  needs_review: "Needs Human Review",
};

export const AGENT_STATUS_CLASSES: Record<AgentStatus, string> = {
  pending: "text-faint",
  running: "text-running animate-pulse-soft",
  completed: "text-done",
  needs_review: "text-review",
};

export const RESOURCE_LABEL: Record<ResourceType, string> = {
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

export const AVAILABILITY_LABEL: Record<ResourceAvailability, string> = {
  available: "Available",
  deployed: "Deployed",
  maintenance: "Maintenance",
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86400e3],
    ["hour", 3600e3],
    ["minute", 60e3],
    ["second", 1e3],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(-diff / ms), unit);
  }
  return "just now";
}
