"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, BotMessageSquare, Cpu, MapPin, Radio, ShieldAlert, Truck, FileText } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardHeader, cn } from "@/components/ui";
import { AGENT_STATUS_CLASSES, AGENT_STATUS_LABEL } from "@/lib/format";
import type { AgentName, AgentStatus } from "@/types/domain";

/**
 * Agent workflow visualization: the pipeline diagram
 * Citizen Report → Intake → Classification → Geospatial → Risk → Resource →
 * Communication → Report Generation → Control Room,
 * with per-agent status derived from the most recent activity.
 */

const STAGES: Array<{ agent: AgentName | "citizen" | "control"; label: string; icon: React.ElementType }> = [
  { agent: "citizen", label: "Citizen Report", icon: BotMessageSquare },
  { agent: "intake", label: "Intake", icon: Cpu },
  { agent: "classification", label: "Classification", icon: Bot },
  { agent: "geospatial", label: "Geospatial", icon: MapPin },
  { agent: "risk", label: "Risk", icon: ShieldAlert },
  { agent: "resource", label: "Resource", icon: Truck },
  { agent: "communication", label: "Communication", icon: Radio },
  { agent: "report", label: "Report Gen", icon: FileText },
  { agent: "control", label: "Control Room", icon: BotMessageSquare },
];

export function AgentWorkflow() {
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: () => api.activity(60),
    refetchInterval: 2500,
  });

  // Most recent status per agent across all incidents.
  const latestByAgent = new Map<AgentName, AgentStatus>();
  for (const log of activity.data?.items ?? []) {
    if (!latestByAgent.has(log.agentName)) {
      latestByAgent.set(log.agentName, log.status);
    }
  }
  const anyRunning = (activity.data?.items ?? []).some(
    (l) => l.status === "running" && Date.now() - new Date(l.timestamp).getTime() < 8000,
  );

  return (
    <Card>
      <CardHeader
        title="Agent pipeline"
        subtitle="Each agent performs one role; outputs feed the next stage"
        action={
          anyRunning ? (
            <span className="flex items-center gap-1.5 text-[10px] text-running">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-running" aria-hidden />
              PROCESSING
            </span>
          ) : undefined
        }
      />
      <div className="scrollbar-slim overflow-x-auto px-4 py-4">
        <div className="flex min-w-max items-center gap-1">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isEndpoint = stage.agent === "citizen" || stage.agent === "control";
            const status = isEndpoint ? "completed" : latestByAgent.get(stage.agent as AgentName) ?? "pending";
            const statusKey = status as keyof typeof AGENT_STATUS_CLASSES;
            return (
              <div key={stage.agent} className="flex items-center">
                <div
                  className={cn(
                    "flex w-[92px] flex-col items-center gap-1.5 rounded-md border px-2 py-2.5 text-center",
                    isEndpoint
                      ? "border-accent/40 bg-accent/10"
                      : status === "running"
                        ? "border-running/50 bg-running/10 animate-pulse-soft"
                        : status === "needs_review"
                          ? "border-review/50 bg-review/10"
                          : status === "completed"
                            ? "border-done/40 bg-done/10"
                            : "border-line bg-raised",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isEndpoint ? "text-accent" : AGENT_STATUS_CLASSES[statusKey],
                    )}
                    aria-hidden
                  />
                  <span className="text-[10px] font-semibold leading-tight text-ink">{stage.label}</span>
                  {!isEndpoint ? (
                    <span className={cn("text-[9px] font-medium", AGENT_STATUS_CLASSES[statusKey])}>
                      {AGENT_STATUS_LABEL[statusKey]}
                    </span>
                  ) : (
                    <span className="text-[9px] text-accent">{isEndpoint && stage.agent === "citizen" ? "Source" : "Sink"}</span>
                  )}
                </div>
                {index < STAGES.length - 1 ? (
                  <ArrowRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
