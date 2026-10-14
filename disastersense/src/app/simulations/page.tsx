"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { Badge, Button, Card, CardHeader, cn } from "@/components/ui";

/**
 * Simulation console — injects clearly fictional, flagged incidents through the
 * agent pipeline for demos. Simulations never represent real events.
 */
const SCENARIOS = [
  { count: 1, label: "Single incident", hint: "Runs one scripted scenario end-to-end." },
  { count: 3, label: "Three incidents", hint: "Stress the classification and clustering stages." },
  { count: 5, label: "Full batch", hint: "Populates KPIs, charts and the activity feed." },
];

export default function SimulationsPage() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(count: number) {
    setRunning(count);
    setResult(null);
    setError(null);
    try {
      const res = await api.runSimulation(count);
      setResult(`${res.message} (${res.incidentIds.length} incident ids)`);
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      await queryClient.invalidateQueries({ queryKey: ["kpis"] });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Simulation failed — check the server logs.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="min-h-screen bg-base font-sans text-ink">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label="Back to workspace"
            className="rounded-full p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-sm font-semibold leading-tight">Simulation console</p>
            <p className="text-[11px] text-muted">Scripted demo incidents — never real events</p>
          </div>
          <Badge className="ml-auto border-accent/30 bg-accent-soft text-accent">demo data</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <Card>
          <CardHeader
            title="Run a simulation"
            subtitle="Each run passes a fictional scenario through the seven-agent pipeline"
          />
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            {SCENARIOS.map((s) => (
              <button
                key={s.count}
                type="button"
                onClick={() => run(s.count)}
                disabled={running !== null}
                className={cn(
                  "rounded-lg border border-line p-4 text-left transition-all",
                  running === s.count
                    ? "border-accent/50 bg-accent-soft"
                    : "bg-raised hover:border-accent/30 hover:bg-accent-soft/50",
                  running !== null && running !== s.count && "opacity-60",
                )}
              >
                <PlayCircle className="h-5 w-5 text-accent" aria-hidden />
                <p className="mt-2 text-sm font-semibold">{s.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted">{s.hint}</p>
                <p className="mt-1 text-[11px] font-medium text-accent">
                  {running === s.count ? "Running…" : `Run ${s.count}`}
                </p>
              </button>
            ))}
          </div>
          <div className="border-t border-line p-4">
            {result ? <p className="text-xs text-low">{result}</p> : null}
            {error ? <p className="text-xs text-critical">{error}</p> : null}
            {!result && !error ? (
              <p className="text-[11px] leading-snug text-faint">
                Simulated incidents are marked as such everywhere they appear. They exist only in this
                demo’s in-memory store and reset when the server restarts.
              </p>
            ) : null}
          </div>
        </Card>

        <div className="flex justify-center">
          <Link href="/">
            <Button variant="secondary">Back to workspace</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}