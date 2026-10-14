"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Crosshair, Send } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { Button, Card, CardHeader } from "@/components/ui";
import { DISASTER_LABEL } from "@/lib/format";
import { OPS_CENTER } from "@/lib/geo";
import type { DisasterType, Severity } from "@/types/domain";

/**
 * Citizen-facing report intake. Posts a validated report to /api/reports, which
 * runs the multi-agent pipeline and returns the resulting incident code.
 */

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export default function ReportPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    reporterName: "",
    reporterContact: "",
    disasterType: "flood" as DisasterType,
    description: "",
    address: "",
    lat: OPS_CENTER.lat.toFixed(4),
    lng: OPS_CENTER.lng.toFixed(4),
    severity: "high" as Severity,
    peopleAffected: "",
    isSos: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; message: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  /** True once the landmark text was typed by hand — GPS auto-fill must not clobber it. */
  const addressTypedByUser = useRef(false);

  /**
   * One-shot GPS fix behind the "Use current location" button: fills lat/lng and,
   * unless the user typed their own landmark, reverse-geocodes the place name too.
   */
  const locate = () => {
    setGeoError(null);
    setGeoNote(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setGeoError(
        "Location needs a secure page (HTTPS or localhost). If you opened this app on a plain-http address, switch to HTTPS — or type the landmark and coordinates manually.",
      );
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoError("This device or browser does not support GPS location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracyM = Math.round(position.coords.accuracy ?? 0);
        setForm((current) => ({ ...current, lat: lat.toFixed(4), lng: lng.toFixed(4) }));
        void (async () => {
          try {
            const { place } = await api.place(lat, lng);
            setForm((current) => ({
              ...current,
              address:
                addressTypedByUser.current && current.address.trim()
                  ? current.address
                  : place.formatted,
            }));
            setGeoNote(`Located: ${place.short} — ±${accuracyM} m accurate.`);
          } catch {
            setGeoNote(
              `GPS coordinates filled (±${accuracyM} m). Place-name lookup unavailable — you can type a landmark instead.`,
            );
          } finally {
            setLocating(false);
          }
        })();
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow location access, or type the landmark."
            : err.code === err.TIMEOUT
              ? "Timed out getting a GPS fix. Try again or type the landmark."
              : "GPS position unavailable. Check that location services are on.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
  };

  const submit = useMutation({
    mutationFn: () =>
      api.submitReport({
        reporterName: form.reporterName,
        reporterContact: form.reporterContact,
        disasterType: form.disasterType,
        description: form.description,
        address: form.address,
        coordinates: { lat: Number(form.lat), lng: Number(form.lng) },
        severity: form.severity,
        peopleAffected: Number(form.peopleAffected || 0),
        isSos: form.isSos,
      }),
    onSuccess: (data) => {
      setError(null);
      setResult({ code: data.incident.code, message: data.message });
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["kpis"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (err) => {
      setResult(null);
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    },
  });

  const fieldClass =
    "w-full rounded-sm border border-line bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";
  const labelClass = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted";

  return (
    <main id="main-content" className="min-h-screen bg-base px-4 py-6 md:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to control room
        </Link>
        <Link
          href="/missing-person"
          className="mb-4 ml-4 inline-flex items-center gap-1.5 text-xs text-accent underline"
        >
          Report a missing person
        </Link>

        <Card>
          <CardHeader
            title="Report an incident"
            subtitle="Your report is analyzed by the multi-agent pipeline to allocate help faster"
          />
          <form
            className="space-y-4 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="reporterName">Your name</label>
                <input
                  id="reporterName"
                  className={fieldClass}
                  value={form.reporterName}
                  required
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="reporterContact">Contact (optional)</label>
                <input
                  id="reporterContact"
                  className={fieldClass}
                  value={form.reporterContact}
                  maxLength={60}
                  onChange={(e) => setForm({ ...form, reporterContact: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="disasterType">Disaster type</label>
                <select
                  id="disasterType"
                  className={fieldClass}
                  value={form.disasterType}
                  onChange={(e) => setForm({ ...form, disasterType: e.target.value as DisasterType })}
                >
                  {Object.entries(DISASTER_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="severity">How severe?</label>
                <select
                  id="severity"
                  className={fieldClass}
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="description">What is happening?</label>
              <textarea
                id="description"
                className={fieldClass}
                rows={4}
                required
                minLength={10}
                maxLength={2000}
                placeholder="Describe the situation, hazards and how many people are affected…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label
                  className="block text-[11px] font-medium uppercase tracking-wide text-muted"
                  htmlFor="address"
                >
                  Location / landmark
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={locating}
                  onClick={locate}
                >
                  <Crosshair className="h-3.5 w-3.5" aria-hidden />
                  {locating ? "Locating…" : "Use current location"}
                </Button>
              </div>
              <input
                id="address"
                className={fieldClass}
                value={form.address}
                maxLength={300}
                placeholder="e.g. Beside the old bus stand"
                onChange={(e) => {
                  addressTypedByUser.current = true;
                  setForm({ ...form, address: e.target.value });
                }}
              />
              {geoError ? (
                <p className="mt-1 text-[11px] text-critical">{geoError}</p>
              ) : geoNote ? (
                <p className="mt-1 text-[11px] text-muted">{geoNote}</p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="lat">Latitude</label>
                <input
                  id="lat"
                  type="number"
                  step="any"
                  className={fieldClass}
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="lng">Longitude</label>
                <input
                  id="lng"
                  type="number"
                  step="any"
                  className={fieldClass}
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="peopleAffected">People affected</label>
                <input
                  id="peopleAffected"
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={form.peopleAffected}
                  onChange={(e) => setForm({ ...form, peopleAffected: e.target.value })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[#ef4444]"
                checked={form.isSos}
                onChange={(e) => setForm({ ...form, isSos: e.target.checked })}
              />
              This is an SOS — life-threatening emergency
            </label>
            <p className="text-[11px] leading-snug text-faint">
              SOS reports are always recorded as critical, regardless of the severity chosen above.
            </p>

            {error ? (
              <p className="rounded-sm border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">
                {error}
              </p>
            ) : null}

            {result ? (
              <div className="rounded-sm border border-done/40 bg-done/10 px-3 py-2 text-xs text-done">
                <p className="font-semibold">{result.message}</p>
                <p className="mt-0.5">
                  Incident reference: <span className="font-mono">{result.code}</span>.{" "}
                  <Link href="/" className="underline">View on the control room</Link>.
                </p>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={submit.isPending}>
                <Send className="h-3.5 w-3.5" aria-hidden />
                {submit.isPending ? "Submitting…" : "Submit report"}
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-4 text-[11px] leading-relaxed text-faint">
          DisasterSense is a decision-support prototype. In a real emergency, also call your local
          emergency number. This tool does not dispatch real emergency services.
        </p>
      </div>
    </main>
  );
}
