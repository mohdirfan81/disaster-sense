"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Incident } from "@/types/domain";
import { Card, CardHeader } from "@/components/ui";
import { SEVERITY_HEX } from "@/lib/format";
import { EmptyState } from "@/components/ui";

/** Severity distribution bar chart + affected-people pie by disaster type. */

export function IncidentCharts({ incidents }: { incidents: Incident[] }) {
  const severityData = (["critical", "high", "medium", "low"] as const).map((severity) => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: incidents.filter((i) => i.severity === severity && i.status !== "resolved").length,
    color: SEVERITY_HEX[severity],
  }));

  const typeTotals = new Map<string, number>();
  for (const incident of incidents) {
    if (incident.status === "resolved") continue;
    typeTotals.set(incident.disasterType, (typeTotals.get(incident.disasterType) ?? 0) + incident.peopleAffected);
  }
  const typeData = [...typeTotals.entries()]
    .map(([type, people]) => ({ name: type, value: people }))
    .sort((a, b) => b.value - a.value);

  if (incidents.length === 0) {
    return (
      <Card>
        <CardHeader title="Situation analytics" />
        <EmptyState title="No data yet" hint="Charts populate as incidents arrive." />
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardHeader title="Active by severity" subtitle="Unresolved incidents" />
        <div className="h-44 px-2 py-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232c3d" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{ background: "#121722", border: "1px solid #232c3d", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#e6eaf2" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {severityData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="People affected by type" subtitle="Active incidents" />
        <div className="h-44 px-2 py-3">
          {typeData.length === 0 ? (
            <EmptyState title="Nothing active" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={36} outerRadius={62} paddingAngle={2}>
                  {typeData.map((_, index) => (
                    <Cell key={index} fill={["#38bdf8", "#f97316", "#ef4444", "#eab308", "#22c55e", "#a78bfa", "#94a3b8"][index % 7]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#121722", border: "1px solid #232c3d", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#e6eaf2" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
