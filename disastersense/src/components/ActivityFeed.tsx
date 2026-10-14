"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardHeader, EmptyState, cn } from "@/components/ui";
import { formatTime } from "@/lib/format";

/** Live agent activity feed (polls every 2.5s). */

export function ActivityFeed() {
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: () => api.activity(40),
    refetchInterval: 2500,
  });

  const items = activity.data?.items ?? [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Live agent activity"
        subtitle="Actions performed by the multi-agent pipeline"
        action={
          <span className="flex items-center gap-1.5 text-[10px] text-done">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-done" aria-hidden />
            LIVE
          </span>
        }
      />
      <div className="scrollbar-slim max-h-[420px] flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <EmptyState title="No agent activity yet" hint="Run a simulation to watch the pipeline work." />
        ) : (
          <ul className="space-y-2.5">
            {items.map((log) => (
              <li key={log.id} className="flex gap-2 text-[11px] leading-snug">
                <span className="shrink-0 font-mono text-faint">{formatTime(log.timestamp)}</span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "font-semibold",
                      log.status === "completed"
                        ? "text-done"
                        : log.status === "needs_review"
                          ? "text-review"
                          : log.status === "running"
                            ? "text-running"
                            : "text-muted",
                    )}
                  >
                    {log.agentLabel || log.agentName}
                  </span>{" "}
                  <span className="text-ink">{log.action}</span>
                  {log.output ? <span className="block text-faint">{log.output}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
