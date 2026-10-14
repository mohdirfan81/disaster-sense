"use client";

import type { KpiSnapshot } from "@/types/domain";
import { AlertTriangle, HeartPulse, MapPinned, Siren, Users, ClipboardList } from "lucide-react";
import { Card, cn } from "@/components/ui";
import { formatNumber } from "@/lib/format";

/** Top KPI cards: active, critical, people affected, resources, risk zones, pending. */

const TILES: Array<{
  key: keyof KpiSnapshot;
  label: string;
  icon: React.ElementType;
  tone: string;
}> = [
  { key: "activeIncidents", label: "Active incidents", icon: Siren, tone: "text-accent" },
  { key: "criticalIncidents", label: "Critical", icon: AlertTriangle, tone: "text-critical" },
  { key: "peopleAffected", label: "People affected", icon: Users, tone: "text-high" },
  { key: "resourcesDeployed", label: "Resources deployed", icon: HeartPulse, tone: "text-done" },
  { key: "highRiskZones", label: "High-risk zones", icon: MapPinned, tone: "text-medium" },
  { key: "reportsPending", label: "Reports pending", icon: ClipboardList, tone: "text-running" },
];

export function KpiCards({ snapshot }: { snapshot: KpiSnapshot | undefined }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        const value = snapshot?.[tile.key] ?? 0;
        const isAlert = tile.key === "criticalIncidents" && value > 0;
        return (
          <Card key={tile.key} className={cn("px-3.5 py-3", isAlert && "border-critical/50 shadow-glow")}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {tile.label}
              </span>
              <Icon className={cn("h-3.5 w-3.5", tile.tone)} aria-hidden />
            </div>
            <p className={cn("mt-2 text-2xl font-bold tabular-nums", isAlert ? "text-critical" : "text-ink")}>
              {formatNumber(value)}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
