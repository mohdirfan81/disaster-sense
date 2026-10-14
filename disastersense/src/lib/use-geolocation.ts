"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates } from "@/types/domain";

/**
 * Thin wrapper over the browser Geolocation API.
 *
 *  - `requestOnce()`  -> one high-accuracy fix (auto-location on load).
 *  - `startTracking()` -> continuous `watchPosition` (the "connect to GPS" mode
 *    armed when a disaster is detected nearby).
 *  - `setManual()`    -> fall back to typed coordinates when GPS is blocked.
 */

export type GeoStatus =
  | "idle"
  | "requesting"
  | "tracking"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export interface GeoFix {
  coordinates: Coordinates;
  /** Horizontal accuracy in metres (0 when entered manually). */
  accuracyM: number;
  timestamp: number;
  /** True when the fix was typed in rather than read from the GPS. */
  manual: boolean;
}

export interface UseGeolocation {
  supported: boolean;
  fix: GeoFix | null;
  error: string | null;
  status: GeoStatus;
  tracking: boolean;
  requestOnce: () => void;
  startTracking: () => void;
  stopTracking: () => void;
  setManual: (coordinates: Coordinates) => void;
}

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 5_000,
};

function toFix(position: GeolocationPosition): GeoFix {
  return {
    coordinates: {
      lat: Number(position.coords.latitude.toFixed(6)),
      lng: Number(position.coords.longitude.toFixed(6)),
    },
    accuracyM: Math.round(position.coords.accuracy ?? 0),
    timestamp: position.timestamp || Date.now(),
    manual: false,
  };
}

export function useGeolocation(): UseGeolocation {
  const [supported, setSupported] = useState(false);
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);

  // Detect support in an effect so SSR and first client render agree.
  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "geolocation" in navigator);
    return () => {
      if (watchId.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setTracking(false);
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setStatus("denied");
        setError("Location permission denied. Enter coordinates manually to continue.");
        break;
      case err.POSITION_UNAVAILABLE:
        setStatus("unavailable");
        setError("GPS position unavailable. Check that location services are on.");
        break;
      case err.TIMEOUT:
        setStatus("timeout");
        setError("Timed out getting a fix. Try again or enter coordinates manually.");
        break;
      default:
        setStatus("unavailable");
        setError("Could not read your location.");
    }
  }, []);

  const requestOnce = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("This device or browser does not support GPS location.");
      return;
    }
    setStatus("requesting");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFix(toFix(position));
        setError(null);
        setStatus((current) => (current === "tracking" ? current : "idle"));
      },
      handleError,
      OPTIONS,
    );
  }, [handleError]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
    setStatus((current) => (current === "denied" || current === "unsupported" ? current : "idle"));
  }, []);

  const startTracking = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("This device or browser does not support GPS location.");
      return;
    }
    if (watchId.current !== null) return;
    setError(null);
    setTracking(true);
    setStatus("tracking");
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setFix(toFix(position));
        setError(null);
        setStatus("tracking");
      },
      handleError,
      OPTIONS,
    );
  }, [handleError]);

  const setManual = useCallback((coordinates: Coordinates) => {
    setFix({
      coordinates: {
        lat: Number(coordinates.lat.toFixed(6)),
        lng: Number(coordinates.lng.toFixed(6)),
      },
      accuracyM: 0,
      timestamp: Date.now(),
      manual: true,
    });
    setError(null);
    setStatus("idle");
  }, []);

  return {
    supported,
    fix,
    error,
    status,
    tracking,
    requestOnce,
    startTracking,
    stopTracking,
    setManual,
  };
}
