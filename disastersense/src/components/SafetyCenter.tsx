"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Crosshair,
  Home,
  MessageCircle,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Radio,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { FACILITIES } from "@/lib/db/seed-data";
import { OPS_CENTER } from "@/lib/geo";
import {
  DANGER_RADIUS_KM,
  findNearbyIncidents,
  findNearestPlaces,
  threatHeadline,
  threatLevel,
} from "@/lib/safety";
import type { UseGeolocation } from "@/lib/use-geolocation";
import {
  buildShareMessage,
  isAppleDevice,
  isValidPhone,
  loadContacts,
  loadLastFix,
  normalizePhone,
  saveContacts,
  saveLastFix,
  smsLink,
  telLink,
  whatsappLink,
  type TrustedContact,
} from "@/lib/contacts";
import {
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  googleMapsSharePinUrl,
} from "@/lib/google-maps";
import {
  highestAdvisoryLevel,
  riverAdvisories,
  seismicAdvisories,
  weatherAdvisories,
  type Advisory,
} from "@/lib/advisories";
import { Badge, Button, Card, CardHeader, cn } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { getWeatherDescription } from "@/lib/openmeteo";

/**
 * Citizen safety workspace:
 *  - opt-in GPS tracking with a persisted last-known position
 *  - automatic nearby-incident detection from live control-room data
 *  - live weather / river-discharge / seismic advisories (Open-Meteo, USGS)
 *  - nearest-shelter ranking with Google Maps navigation
 *  - trusted contacts stored on-device; sharing always requires confirmation
 */
export function SafetyCenter({ geo }: { geo: UseGeolocation }) {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", relation: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TrustedContact | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastFix, setLastFix] = useState<ReturnType<typeof loadLastFix>>(null);
  const autoStartedRef = useRef(false);

  // Hydrate device-local contacts and the persisted last-known fix.
  useEffect(() => {
    setContacts(loadContacts());
    setLastFix(loadLastFix());
  }, []);

  const fix = geo.fix;

  // Persist every fresh fix as the "last known location".
  useEffect(() => {
    if (!fix) return;
    const stored = {
      coordinates: fix.coordinates,
      accuracyM: fix.accuracyM,
      timestamp: fix.timestamp,
      manual: fix.manual,
    };
    saveLastFix(stored);
    setLastFix(stored);
  }, [fix]);

  const position = fix?.coordinates ?? null;

  // Live incident feed for auto-detection.
  const incidents = useQuery({
    queryKey: ["incidents", "safety-watch"],
    queryFn: () => api.incidents(),
    refetchInterval: 15_000,
  });

  const alerts = useMemo(
    () => (position ? findNearbyIncidents(position, incidents.data?.items ?? [], DANGER_RADIUS_KM) : []),
    [position, incidents.data],
  );

  // Live environment feeds around the device.
  const envPoint = position ?? OPS_CENTER;
  const weather = useQuery({
    queryKey: ["weather", "safety", envPoint.lat, envPoint.lng],
    queryFn: () => api.weather(envPoint.lat, envPoint.lng),
    enabled: Boolean(position),
    refetchInterval: 300_000,
  });
  const river = useQuery({
    queryKey: ["waterLevels", "safety", envPoint.lat, envPoint.lng],
    queryFn: () => api.waterLevels(envPoint.lat, envPoint.lng),
    enabled: Boolean(position),
    refetchInterval: 300_000,
  });
  const quakes = useQuery({
    queryKey: ["earthquakes", "safety", envPoint.lat, envPoint.lng],
    queryFn: () => api.earthquakes(envPoint.lat, envPoint.lng, 100),
    enabled: Boolean(position),
    refetchInterval: 120_000,
  });

  // Reverse-geocoded place name for the current fix. Coordinates are rounded
  // to ~11 m so a jittery GPS does not trigger a lookup on every tick.
  const place = useQuery({
    queryKey: [
      "place",
      position ? Number(position.lat.toFixed(4)) : "none",
      position ? Number(position.lng.toFixed(4)) : "none",
    ],
    queryFn: () =>
      position ? api.place(position.lat, position.lng) : Promise.reject(new Error("No position")),
    enabled: Boolean(position),
    staleTime: 3_600_000,
    retry: 1,
  });

  const advisories: Advisory[] = useMemo(() => {
    const out: Advisory[] = [];
    if (weather.data?.weather) out.push(...weatherAdvisories(weather.data.weather));
    if (river.data?.waterLevel) out.push(...riverAdvisories(river.data.waterLevel));
    if (quakes.data?.earthquakes) out.push(...seismicAdvisories(quakes.data.earthquakes));
    return out;
  }, [weather.data, river.data, quakes.data]);

  const level = threatLevel(alerts);
  const envLevel = highestAdvisoryLevel(advisories);
  const requiresEvacuation = level === "critical" || level === "high" || envLevel === "danger";
  const current = weather.data?.weather.current;

  // AUTO DETECTION: arm continuous tracking once when something dangerous is
  // detected near a device that already shares its position.
  const startTracking = geo.startTracking;
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!position || !requiresEvacuation || geo.tracking) return;
    autoStartedRef.current = true;
    startTracking();
  }, [position, requiresEvacuation, geo.tracking, startTracking]);

  const shelters = useMemo(
    () => (position ? findNearestPlaces(position, FACILITIES, 3, ["shelter"]) : []),
    [position],
  );
  const nearest = shelters[0];

  function addContact(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!isValidPhone(form.phone)) {
      setFormError("Enter a valid phone number (7-15 digits).");
      return;
    }
    if (contacts.length >= 6) {
      setFormError("Maximum 6 trusted contacts on this device.");
      return;
    }
    const next: TrustedContact[] = [
      ...contacts,
      {
        id: `ct_${Date.now().toString(36)}`,
        name: form.name.trim().slice(0, 80),
        phone: normalizePhone(form.phone),
        relation: form.relation.trim().slice(0, 40) || undefined,
      },
    ];
    setContacts(next);
    saveContacts(next);
    setForm({ name: "", phone: "", relation: "" });
    setFormError(null);
  }

  function removeContact(id: string) {
    const next = contacts.filter((c) => c.id !== id);
    setContacts(next);
    saveContacts(next);
    if (preview?.id === id) setPreview(null);
  }

  const shareCtx = position
    ? {
        coordinates: position,
        timestamp: fix?.timestamp ?? Date.now(),
        accuracyM: fix?.accuracyM ?? 0,
        placeName: place.data?.place.formatted,
        shelterName: nearest?.name,
        shelterCoordinates: nearest?.coordinates,
        shareUrl: googleMapsSharePinUrl(position),
      }
    : null;
  const shareMessage = shareCtx ? buildShareMessage(shareCtx) : "";
  const isApple =
    typeof navigator !== "undefined" && isAppleDevice(navigator.userAgent);

  async function copyShareText() {
    if (!shareMessage) return;
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const threatTone =
    level === "critical"
      ? "border-critical/50 bg-critical/5"
      : level === "high"
        ? "border-high/50 bg-high/5"
        : "border-line";

  return (
    <div className="space-y-4">
      {/* ---- Auto-detection banner ---- */}
      <Card className={cn("transition-colors", threatTone)}>
        <div className="flex flex-wrap items-start gap-3 p-4">
          {level === "none" ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-low" aria-hidden />
          ) : (
            <AlertTriangle
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                level === "critical" ? "text-critical" : level === "high" ? "text-high" : "text-medium",
              )}
              aria-hidden
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{threatHeadline(level, alerts.length)}</p>
            <p className="mt-0.5 text-xs text-muted">
              Auto-detection checks live incidents within {DANGER_RADIUS_KM} km of your position every 15 seconds.
              {alerts.length > 0
                ? ` Nearest: ${alerts[0].title} · ${alerts[0].distanceKm} km ${alerts[0].direction}.`
                : ""}
            </p>
            {requiresEvacuation && nearest && position ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-panel p-2.5 shadow-sm">
                <Home className="h-4 w-4 text-accent" aria-hidden />
                <span className="text-xs">
                  Nearest listed shelter: <strong>{nearest.name}</strong> · {nearest.distanceKm} km{" "}
                  {nearest.direction}
                </span>
                <a
                  href={googleMapsDirectionsUrl(position, nearest.coordinates, "driving")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto"
                >
                  <Button variant="primary">
                    <Navigation className="h-3.5 w-3.5" /> Navigate
                  </Button>
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {/* ---- GPS tracking ---- */}
      <Card>
        <CardHeader
          title="GPS location tracking"
          subtitle="Opt-in · stored only on this device"
          action={
            geo.tracking ? (
              <Button variant="secondary" onClick={geo.stopTracking}>
                <Radio className="h-3.5 w-3.5" /> Stop tracking
              </Button>
            ) : (
              <Button variant="primary" onClick={geo.requestOnce} disabled={!geo.supported}>
                <Crosshair className="h-3.5 w-3.5" /> Enable location
              </Button>
            )
          }
        />
        <div className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-raised p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Current fix</p>
              {position && fix ? (
                <>
                  <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold leading-snug text-ink">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                    <span>
                      {place.data
                        ? place.data.place.short
                        : place.isLoading
                          ? "Looking up place name…"
                          : "Place name unavailable"}
                    </span>
                  </p>
                  {place.data && place.data.place.formatted !== place.data.place.short ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-muted">
                      {place.data.place.formatted}
                    </p>
                  ) : null}
                  <p className="mt-1 font-mono text-sm text-ink">
                    {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    ±{fix.accuracyM} m · {fix.manual ? "manual" : "GPS"} ·{" "}
                    {formatDateTime(new Date(fix.timestamp).toISOString())}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">No fix yet — tap “Enable location”.</p>
              )}
            </div>
            <div className="rounded-md bg-raised p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Last known location</p>
              {lastFix ? (
                <>
                  <p className="mt-1 font-mono text-sm text-ink">
                    {lastFix.coordinates.lat.toFixed(5)}, {lastFix.coordinates.lng.toFixed(5)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Saved {formatDateTime(new Date(lastFix.timestamp).toISOString())}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">Nothing saved on this device yet.</p>
              )}
            </div>
          </div>
          {geo.tracking ? (
            <p className="flex items-center gap-1.5 text-xs text-low">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-low" aria-hidden />
              Continuous tracking active — position updates while this tab is open.
            </p>
          ) : null}
          {geo.error ? <p className="text-xs text-critical">{geo.error}</p> : null}
        </div>
      </Card>

      {/* ---- Advisories ---- */}
      <Card>
        <CardHeader
          title="Live hazard advisories"
          subtitle="Open-Meteo weather & river discharge · USGS seismic (last 24 h)"
        />
        <div className="space-y-2 p-4">
          {current ? (
            <div className="rounded-md border border-line bg-raised p-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-bold tabular-nums text-ink">
                  {current.temperature.toFixed(1)}°C
                </span>
                <span className="text-sm font-medium text-ink">
                  {getWeatherDescription(current.weathercode)}
                </span>
                {place.data ? (
                  <span className="text-[11px] text-muted">near {place.data.place.short}</span>
                ) : null}
                <span className="ml-auto text-[10px] text-faint">
                  observed {formatDateTime(current.time)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Feels {current.feelsLike?.toFixed(1) ?? "--"}° · Humidity{" "}
                {current.humidity !== undefined ? Math.round(current.humidity) : "--"}% · Wind{" "}
                {current.windspeed.toFixed(1)} km/h · Precip {current.precipitation.toFixed(1)} mm
              </p>
            </div>
          ) : null}
          {!position ? (
            <p className="text-xs text-muted">Enable location to evaluate hazards around you.</p>
          ) : advisories.length === 0 ? (
            <p className="text-xs text-muted">
              {weather.isLoading || river.isLoading || quakes.isLoading
                ? "Loading live feeds…"
                : "No active advisories from live feeds."}
            </p>
          ) : (
            advisories.map((a) => (
              <div
                key={`${a.id}-${a.title}`}
                className={cn(
                  "flex items-start gap-2 rounded-md border p-2.5",
                  a.level === "danger"
                    ? "border-critical/40 bg-critical/5"
                    : a.level === "warning"
                      ? "border-high/40 bg-high/5"
                      : "border-line bg-raised",
                )}
              >
                <AlertTriangle
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    a.level === "danger" ? "text-critical" : a.level === "warning" ? "text-high" : "text-muted",
                  )}
                  aria-hidden
                />
                <div>
                  <p className="text-xs font-semibold text-ink">{a.title}</p>
                  <p className="text-[11px] leading-snug text-muted">{a.detail}</p>
                  <p className="mt-0.5 text-[10px] text-faint">
                    Source: {a.source} · advisory heuristic, not an official warning
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ---- Shelters ---- */}
      <Card>
        <CardHeader
          title="Nearest shelters"
          subtitle="Demo facility registry — verify with local authorities"
          action={
            position ? (
              <a href={googleMapsSearchUrl("emergency shelter", position)} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">
                  <MapPin className="h-3.5 w-3.5" /> Live search
                </Button>
              </a>
            ) : undefined
          }
        />
        <div className="space-y-2 p-4">
          {!position ? (
            <p className="text-xs text-muted">Enable location to rank shelters by distance.</p>
          ) : shelters.length === 0 ? (
            <p className="text-xs text-muted">No shelters in the demo registry near you.</p>
          ) : (
            <ul className="space-y-2">
              {shelters.map((s, i) => (
                <li
                  key={s.name}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-line p-2.5"
                >
                  <Badge
                    className={
                      i === 0 ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-raised text-muted"
                    }
                  >
                    {i === 0 ? "Nearest" : `#${i + 1}`}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{s.name}</p>
                    <p className="text-[11px] text-muted">
                      {s.distanceKm} km · {s.direction}
                    </p>
                  </div>
                  <a href={googleMapsDirectionsUrl(position, s.coordinates, "driving")} target="_blank" rel="noopener noreferrer">
                    <Button variant={i === 0 ? "primary" : "default"}>
                      <Navigation className="h-3.5 w-3.5" /> Directions
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] leading-snug text-faint">
            Google Maps routes are not guaranteed to be passable during a disaster. Follow official
            evacuation orders and emergency personnel.
          </p>
        </div>
      </Card>

      {/* ---- Safe contacts ---- */}
      <Card>
        <CardHeader title="Trusted (safe) contacts" subtitle="Saved on this device only · nothing is uploaded" />
        <div className="space-y-3 p-4">
          {contacts.length === 0 ? (
            <p className="text-xs text-muted">
              No trusted contacts yet. Add family or friends you want to keep updated.
            </p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-line p-2.5">
                  <Users className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">
                      {c.name}{" "}
                      {c.relation ? <span className="font-normal text-muted">· {c.relation}</span> : null}
                    </p>
                    <p className="font-mono text-[11px] text-muted">{c.phone}</p>
                  </div>
                  <a href={telLink(c.phone)}>
                    <Button variant="ghost">
                      <Phone className="h-3.5 w-3.5" /> Call
                    </Button>
                  </a>
                  <Button variant="secondary" disabled={!shareCtx} onClick={() => setPreview(c)}>
                    <Navigation className="h-3.5 w-3.5" /> Share location
                  </Button>
                  <button
                    type="button"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => removeContact(c.id)}
                    className="rounded-full p-2 text-muted transition-colors hover:bg-raised hover:text-critical"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Share preview — explicit confirmation before any message leaves the device. */}
          {preview && shareCtx ? (
            <div className="rounded-md border border-accent/30 bg-accent-soft p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-accent">Preview message to {preview.name}</p>
                <button type="button" className="text-[11px] text-muted hover:text-ink" onClick={() => setPreview(null)}>
                  Cancel
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-panel p-2 font-mono text-[11px] leading-snug text-ink">
                {shareMessage}
              </pre>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={smsLink(preview.phone, shareMessage, isApple)}>
                  <Button variant="primary">
                    <Navigation className="h-3.5 w-3.5" /> Open SMS app
                  </Button>
                </a>
                <a
                  href={whatsappLink(preview.phone, shareMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary">
                    <MessageCircle className="h-3.5 w-3.5" /> Open WhatsApp
                  </Button>
                </a>
                <Button variant="default" onClick={copyShareText}>
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy text"}
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted">
                The message opens in your SMS / WhatsApp app for you to review and send —
                DisasterSense never sends it automatically. On a laptop with no messaging app,
                use Copy text and paste it anywhere, or tap the contact&apos;s number to call.
              </p>
            </div>
          ) : null}

          {/* Add contact */}
          <form onSubmit={addContact} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
              aria-label="Contact name"
              className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-faint"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone (+91…)"
              aria-label="Contact phone"
              inputMode="tel"
              className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-faint"
            />
            <Button type="submit" variant="primary">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
            {formError ? <p className="text-xs text-critical sm:col-span-3">{formError}</p> : null}
          </form>
        </div>
      </Card>

      {/* ---- Emergency shortcuts ---- */}
      <div className="grid gap-3 sm:grid-cols-2">
        <a href="tel:112" className="block">
          <Card className="flex h-full items-center gap-3 border-critical/40 bg-critical/5 p-4 transition-colors hover:bg-critical/10">
            <Phone className="h-5 w-5 text-critical" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ink">Call 112</p>
              <p className="text-[11px] text-muted">India emergency response support</p>
            </div>
          </Card>
        </a>
        <a href="/report" className="block">
          <Card className="flex h-full items-center gap-3 border-accent/30 bg-accent-soft p-4 transition-colors hover:bg-accent/10">
            <AlertTriangle className="h-5 w-5 text-accent" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ink">Report an incident</p>
              <p className="text-[11px] text-muted">Send a report to the control room</p>
            </div>
          </Card>
        </a>
      </div>
    </div>
  );
}