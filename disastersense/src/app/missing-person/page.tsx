"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Crosshair, Send } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { Button, Card, CardHeader } from "@/components/ui";
import type { Severity } from "@/types/domain";

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export default function MissingPersonPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    reporterName: "",
    reporterContact: "",
    personName: "",
    personDescription: "",
    lastSeen: "",
    address: "",
    lat: "",
    lng: "",
    severity: "high" as Severity,
    isSos: false,
    acknowledged: false,
  });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; code: string } | null>(null);
  const [locating, setLocating] = useState(false);

  function useCurrentLocation() {
    setLocationError(null);
    setLocationNote(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocationError("Location access requires HTTPS or localhost. You can enter coordinates manually.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("This browser does not support location access. Enter coordinates manually.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          lat: coords.latitude.toFixed(6),
          lng: coords.longitude.toFixed(6),
        }));
        setLocationNote(
          `This device's location was filled in (about ±${Math.round(coords.accuracy)} m). Use this only if it is where the person was last seen.`,
        );
        setLocating(false);
      },
      (reason) => {
        setLocationError(
          reason.code === reason.PERMISSION_DENIED
            ? "Location permission was denied. Enter the last-known coordinates manually."
            : reason.code === reason.TIMEOUT
              ? "Location lookup timed out. Try again or enter coordinates manually."
              : "This device's location is unavailable. Enter coordinates manually.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
  }

  const submit = useMutation({
    mutationFn: () =>
      api.submitReport({
        reportKind: "missing_person",
        reporterName: form.reporterName,
        reporterContact: form.reporterContact,
        disasterType: "other",
        description: [
          `MISSING PERSON REPORT`,
          `Person: ${form.personName.trim()}`,
          `Last seen (local time): ${new Date(form.lastSeen).toLocaleString()}`,
          `Description: ${form.personDescription.trim()}`,
        ].join("\n"),
        address: form.address.trim(),
        coordinates: { lat: Number(form.lat), lng: Number(form.lng) },
        severity: form.severity,
        peopleAffected: 1,
        isSos: form.isSos,
      }),
    onSuccess: (data) => {
      setError(null);
      setResult({ id: data.incident.id, code: data.incident.code });
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["kpis"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (reason) => {
      setResult(null);
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : "The report could not be submitted. Please try again.",
      );
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

        <Card>
          <CardHeader
            title="Manual missing-person report"
            subtitle="Provide the person&apos;s last-known details for the demo operations board"
          />
          <form
            className="space-y-4 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit.mutate();
            }}
          >
            <div className="rounded-sm border border-review/40 bg-review/10 p-3 text-xs leading-relaxed text-ink">
              This creates an unverified demo report only. It does not locate another person&apos;s phone,
              contact trusted contacts or responders, or dispatch help. Do not enter real sensitive
              personal details into a public demo. In an emergency, contact local emergency services.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="reporterName">Your name</label>
                <input
                  id="reporterName"
                  className={fieldClass}
                  value={form.reporterName}
                  maxLength={120}
                  required
                  onChange={(event) => setForm({ ...form, reporterName: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="reporterContact">Your contact (optional)</label>
                <input
                  id="reporterContact"
                  className={fieldClass}
                  value={form.reporterContact}
                  maxLength={60}
                  onChange={(event) => setForm({ ...form, reporterContact: event.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="personName">Missing person&apos;s name</label>
              <input
                id="personName"
                className={fieldClass}
                value={form.personName}
                maxLength={120}
                required
                onChange={(event) => setForm({ ...form, personName: event.target.value })}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="personDescription">
                Description / identifying details
              </label>
              <textarea
                id="personDescription"
                className={fieldClass}
                rows={3}
                value={form.personDescription}
                minLength={10}
                maxLength={1200}
                required
                placeholder="Describe clothing or other useful identifying details."
                onChange={(event) => setForm({ ...form, personDescription: event.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="lastSeen">When were they last seen?</label>
                <input
                  id="lastSeen"
                  type="datetime-local"
                  className={fieldClass}
                  value={form.lastSeen}
                  required
                  onChange={(event) => setForm({ ...form, lastSeen: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="severity">Reported urgency</label>
                <select
                  id="severity"
                  className={fieldClass}
                  value={form.severity}
                  onChange={(event) =>
                    setForm({ ...form, severity: event.target.value as Severity })
                  }
                >
                  {SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className={labelClass} htmlFor="address">Last-known location / landmark</label>
                <Button type="button" variant="secondary" disabled={locating} onClick={useCurrentLocation}>
                  <Crosshair className="h-3.5 w-3.5" aria-hidden />
                  {locating ? "Locating…" : "Use this device's location"}
                </Button>
              </div>
              <input
                id="address"
                className={fieldClass}
                value={form.address}
                maxLength={300}
                required
                placeholder="Where was the person last seen?"
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
              <p className="mt-1 text-[11px] text-faint">
                GPS uses this device&apos;s location only. It cannot locate the missing person&apos;s phone.
              </p>
              {locationError ? <p className="mt-1 text-[11px] text-critical">{locationError}</p> : null}
              {locationNote ? <p className="mt-1 text-[11px] text-muted">{locationNote}</p> : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="lat">Latitude</label>
                <input
                  id="lat"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  className={fieldClass}
                  value={form.lat}
                  required
                  onChange={(event) => setForm({ ...form, lat: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="lng">Longitude</label>
                <input
                  id="lng"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  className={fieldClass}
                  value={form.lng}
                  required
                  onChange={(event) => setForm({ ...form, lng: event.target.value })}
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 accent-[#ef4444]"
                checked={form.isSos}
                onChange={(event) => setForm({ ...form, isSos: event.target.checked })}
              />
              <span>
                Mark as an SOS / life-threatening emergency. This sets the report severity to critical
                in the demo.
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5"
                checked={form.acknowledged}
                required
                onChange={(event) => setForm({ ...form, acknowledged: event.target.checked })}
              />
              <span>
                I understand this report is unverified and does not notify emergency services or send
                responders.
              </span>
            </label>

            {error ? (
              <p className="rounded-sm border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">
                {error}
              </p>
            ) : null}

            {result ? (
              <div className="rounded-sm border border-done/40 bg-done/10 px-3 py-2 text-xs text-done">
                <p className="font-semibold">Unverified report recorded: {result.code}</p>
                <Link href={`/incidents/${result.id}`} className="mt-1 inline-block underline">
                  View report details
                </Link>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={submit.isPending || locating}>
                <Send className="h-3.5 w-3.5" aria-hidden />
                {submit.isPending ? "Submitting…" : "Submit missing-person report"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
