"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BadgeCheck, Building2, LifeBuoy, Settings, ShieldAlert, Siren } from "lucide-react";
import { api } from "@/lib/api-client";
import { useGeolocation } from "@/lib/use-geolocation";
import { OPS_CENTER } from "@/lib/geo";
import { SafetyCenter } from "@/components/SafetyCenter";
import { OperationsBoard } from "@/components/OperationsBoard";
import { KpiCards } from "@/components/KpiCards";
import { IncidentCharts } from "@/components/IncidentCharts";
import { SituationReportPanel } from "@/components/SituationReportPanel";
import { WeatherWidget } from "@/components/WeatherWidget";
import { WaterLevelMonitor } from "@/components/WaterLevelMonitor";
import { EarthquakeMonitor } from "@/components/EarthquakeMonitor";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Badge, Button, Card, CardHeader, cn } from "@/components/ui";

/**
 * DisasterSense demo workspace with four role views (citizen, government,
 * rescue team, platform admin). These are DEMO workspaces — there is no
 * authentication backend and no server-side session.
 */

type Role = "citizen" | "government" | "rescue" | "admin";

const ROLES: Array<{ id: Role; label: string; icon: React.ElementType; note: string }> = [
  { id: "citizen", label: "Citizen", icon: ShieldAlert, note: "Auto-detection, GPS tracking, safe contacts, shelter navigation" },
  { id: "government", label: "Government", icon: Building2, note: "Area-wide KPIs, analytics, situation reports, live incidents" },
  { id: "rescue", label: "Rescue team", icon: LifeBuoy, note: "Resource readiness, dispatch map, agent activity feed" },
  { id: "admin", label: "Platform admin", icon: Settings, note: "Simulations, system health, analytics, live operations" },
];

export default function HomePage() {
  const [role, setRole] = useState<Role>("citizen");
  const geo = useGeolocation();
  const focus = geo.fix?.coordinates ?? OPS_CENTER;

  return (
    <div className="min-h-screen bg-base font-sans text-ink">
      <AppHeader />

      {/* Role switcher (demo views — no auth) */}
      <div className="sticky top-0 z-20 border-b border-line bg-base/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-all",
                  active ? "bg-accent text-white shadow-sm" : "bg-raised text-muted hover:text-ink hover:bg-line/60",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {r.label}
              </button>
            );
          })}
          <Badge className="ml-auto hidden shrink-0 border-accent/30 bg-accent-soft text-accent md:inline-flex">
            demo view · no login
          </Badge>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {ROLES.find((r) => r.id === role)?.label} workspace
            </h1>
            <p className="text-sm text-muted">{ROLES.find((r) => r.id === role)?.note}</p>
          </div>
          <Link href="/report">
            <Button variant="primary">
              <Siren className="h-4 w-4" /> Report incident
            </Button>
          </Link>
        </div>

        <motion.div
          key={role}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {role === "citizen" ? <CitizenView focus={focus} geoState={geo} /> : null}
          {role === "government" ? <GovernmentView focus={focus} /> : null}
          {role === "rescue" ? <RescueView focus={focus} /> : null}
          {role === "admin" ? <AdminView focus={focus} /> : null}
        </motion.div>
      </main>

      <footer className="border-t border-line py-6 text-center text-[11px] leading-relaxed text-faint">
        Demo build · role views are not authenticated accounts · incident and resource records are
        demo data (simulations are fictional) · live weather, river and seismic readings come from
        USGS, Open-Meteo Forecast &amp; Flood (GloFAS) and are real at request time · advisories are
        heuristics, never official guidance — follow IMD / CWC / NDMA / local authority bulletins ·
        the app sends no SMS and dispatches no emergency services.
      </footer>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <img
          src="/logo-mark.svg"
          alt=""
          aria-hidden
          className="h-9 w-auto"
        />
        <div>
          <p className="text-sm font-semibold leading-tight">DisasterSense</p>
          <p className="text-[11px] text-muted">Auto-detection · safe contacts · live environment feeds</p>
        </div>
        <nav className="ml-auto flex items-center gap-1.5">
          <Link href="/simulations">
            <Button variant="ghost">Simulations</Button>
          </Link>
          <Link href="/report">
            <Button variant="secondary">Report</Button>
          </Link>
          <Link href="/missing-person">
            <Button variant="ghost">Missing person</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ------------------------------ Citizen ------------------------------ */

function CitizenView({
  focus,
  geoState,
}: {
  focus: { lat: number; lng: number };
  geoState: ReturnType<typeof useGeolocation>;
}) {
  const hasFix = Boolean(geoState.fix);
  // Reverse-geocoded name for the current fix (shared cache key with SafetyCenter).
  const place = useQuery({
    queryKey: ["place", Number(focus.lat.toFixed(4)), Number(focus.lng.toFixed(4))],
    queryFn: () =>
      hasFix ? api.place(focus.lat, focus.lng) : Promise.reject(new Error("No GPS fix")),
    enabled: hasFix,
    staleTime: 3_600_000,
    retry: 1,
  });
  const placeShort = place.data?.place.short;
  const label = hasFix
    ? placeShort
      ? `Your GPS location · ${placeShort}`
      : "Your GPS location"
    : "Control-room area · press “Enable location” to centre on you";
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <SafetyCenter geo={geoState} />
      <div className="space-y-4">
        <WeatherWidget lat={focus.lat} lng={focus.lng} label={label} />
        <WaterLevelMonitor lat={focus.lat} lng={focus.lng} label={label} />
        <EarthquakeMonitor lat={focus.lat} lng={focus.lng} radiusKm={100} label={label} />
        {!hasFix ? (
          <Card>
            <CardHeader title="Location context" />
            <p className="p-4 text-xs text-muted">
              Showing environment data for the control-room area. Press “Enable location” in the safety
              panel to centre weather, river, seismic and shelter results on your position.
            </p>
          </Card>
        ) : place.data ? (
          <Card>
            <CardHeader
              title="Your location"
              subtitle={`Reverse-geocoded via ${place.data.place.source} · stored on this device only`}
            />
            <div className="space-y-1 p-4 text-xs">
              <p className="text-sm font-semibold leading-snug text-ink">
                {place.data.place.formatted}
              </p>
              <p className="font-mono text-muted">
                {focus.lat.toFixed(5)}, {focus.lng.toFixed(5)}
                {geoState.fix ? ` · ±${geoState.fix.accuracyM} m` : ""}
              </p>
              <p className="text-muted">
                Weather, river and seismic feeds above are centred on this position.
              </p>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------- Government ---------------------------- */

function GovernmentView({ focus }: { focus: { lat: number; lng: number } }) {
  const kpis = useQuery({ queryKey: ["kpis"], queryFn: api.kpis, refetchInterval: 10_000 });
  const incidents = useQuery({
    queryKey: ["incidents", "gov"],
    queryFn: () => api.incidents(),
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-4">
      <KpiCards snapshot={kpis.data} />
      <div className="grid gap-4 xl:grid-cols-2">
        <IncidentCharts incidents={incidents.data?.items ?? []} />
        <SituationReportPanel />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <WeatherWidget lat={focus.lat} lng={focus.lng} />
        <WaterLevelMonitor lat={focus.lat} lng={focus.lng} />
        <EarthquakeMonitor lat={focus.lat} lng={focus.lng} radiusKm={150} />
      </div>
      <OperationsBoard />
    </div>
  );
}

/* ----------------------------- Rescue team ----------------------------- */

function RescueView({ focus }: { focus: { lat: number; lng: number } }) {
  const resources = useQuery({
    queryKey: ["resources"],
    queryFn: api.resources,
    refetchInterval: 10_000,
  });
  const items = resources.data?.items ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Resource readiness"
          subtitle="Demo inventory of vehicles, crews and stock — assignments are simulated"
          action={<Badge className="border-line bg-raised text-muted">demo data</Badge>}
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.slice(0, 8).map((r) => (
            <div key={r.id} className="rounded-md border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-ink">{r.label}</p>
                <Badge
                  className={cn(
                    r.availability === "available"
                      ? "border-low/40 bg-low/10 text-low"
                      : r.availability === "deployed"
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : "border-high/40 bg-high/10 text-high",
                  )}
                >
                  {r.availability}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] capitalize text-muted">
                {r.type.replace(/_/g, " ")} · qty {r.quantity}
              </p>
            </div>
          ))}
          {items.length === 0 ? (
            <p className="text-xs text-muted sm:col-span-2 lg:col-span-4">Loading resources…</p>
          ) : null}
        </div>
      </Card>
      <OperationsBoard />
      <div className="grid gap-4 sm:grid-cols-2">
        <WeatherWidget lat={focus.lat} lng={focus.lng} />
        <WaterLevelMonitor lat={focus.lat} lng={focus.lng} />
      </div>
    </div>
  );
}

/* -------------------------------- Admin -------------------------------- */

function AdminView({ focus }: { focus: { lat: number; lng: number } }) {
  const queryClient = useQueryClient();
  const [simState, setSimState] = useState<"idle" | "running" | "done" | "error">("idle");
  const health = useQuery({ queryKey: ["system-health"], queryFn: api.health, refetchInterval: 30_000 });
  const kpis = useQuery({ queryKey: ["kpis"], queryFn: api.kpis, refetchInterval: 15_000 });
  const incidents = useQuery({
    queryKey: ["incidents", "admin"],
    queryFn: () => api.incidents(),
    refetchInterval: 15_000,
  });

  async function runSimulation() {
    setSimState("running");
    try {
      await api.runSimulation();
      setSimState("done");
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      await queryClient.invalidateQueries({ queryKey: ["kpis"] });
    } catch {
      setSimState("error");
    }
  }

  return (
    <div className="space-y-4">
      <KpiCards snapshot={kpis.data} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="System health" subtitle="Control-room services and live data providers" />
          <ul className="space-y-2 p-4 text-xs">
            <li className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  health.data?.status === "ok" ? "bg-low" : health.isError ? "bg-critical" : "bg-high",
                )}
                aria-hidden
              />
              <span className="font-medium">Control-room API</span>
              <span className="ml-auto text-muted">{health.data?.status ?? (health.isError ? "unreachable" : "checking…")}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-low" aria-hidden />
              <span className="font-medium">USGS earthquakes</span>
              <span className="ml-auto text-muted">live feed</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-low" aria-hidden />
              <span className="font-medium">Open-Meteo forecast</span>
              <span className="ml-auto text-muted">live feed</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-low" aria-hidden />
              <span className="font-medium">Open-Meteo Flood (GloFAS)</span>
              <span className="ml-auto text-muted">live feed</span>
            </li>
          </ul>
        </Card>
        <Card>
          <CardHeader title="Simulations" subtitle="Inject a scripted incident through the agent pipeline" />
          <div className="space-y-3 p-4">
            <Button variant="primary" onClick={runSimulation} disabled={simState === "running"}>
              <Siren className="h-4 w-4" />
              {simState === "running" ? "Running pipeline…" : "Run demo simulation"}
            </Button>
            {simState === "done" ? (
              <p className="flex items-center gap-1.5 text-xs text-low">
                <BadgeCheck className="h-4 w-4" /> Simulation completed — incident and activity feeds updated.
              </p>
            ) : null}
            {simState === "error" ? (
              <p className="text-xs text-critical">Simulation failed — check the server logs.</p>
            ) : null}
            <p className="text-[11px] leading-snug text-faint">
              Simulations create clearly marked, non-production incidents for demos. They never represent
              real events or real people.
            </p>
            <Link href="/simulations">
              <Button variant="secondary">Open simulation console</Button>
            </Link>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <IncidentCharts incidents={incidents.data?.items ?? []} />
        <ActivityFeed />
      </div>
      <OperationsBoard />
      <div className="grid gap-4 sm:grid-cols-2">
        <WeatherWidget lat={focus.lat} lng={focus.lng} />
        <EarthquakeMonitor lat={focus.lat} lng={focus.lng} radiusKm={150} />
      </div>
    </div>
  );
}