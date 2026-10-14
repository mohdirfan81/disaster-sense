"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-client";

export function EarthquakeMonitor({
  lat,
  lng,
  radiusKm = 100,
  label,
}: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  label?: string;
}) {
  const location = { lat: lat ?? 17.4021, lng: lng ?? 78.4482 };
  const { data, isLoading, error } = useQuery({
    queryKey: ["earthquakes", location.lat, location.lng, radiusKm],
    queryFn: () => api.earthquakes(location.lat, location.lng, radiusKm),
    refetchInterval: 60000,
    retry: 3,
  });

  const earthquakes = data?.earthquakes || [];
  const hasRecentQuakes = earthquakes.length > 0;
  const maxMagnitude =
    earthquakes.length > 0 ? Math.max(...earthquakes.map((e) => e.magnitude)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-lg border border-line bg-panel p-4 shadow-panel"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Activity className="h-4 w-4 text-accent" />
          Seismic Activity
        </h3>
        <span className="text-[10px] text-faint">USGS · last 24 h</span>
        {hasRecentQuakes && maxMagnitude > 3 && (
          <AlertTriangle className="h-4 w-4 text-high" />
        )}
      </div>
      {label ? <p className="mb-2 -mt-1 truncate text-[11px] text-muted">{label}</p> : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-4 text-muted">
          Loading...
        </div>
      ) : error ? (
        <div className="py-4 text-sm text-muted">Unable to load seismic data</div>
      ) : earthquakes.length === 0 ? (
        <div className="py-4 text-sm text-muted">No recent seismic activity</div>
      ) : (
        <div className="space-y-2">
          {earthquakes.map((quake, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center justify-between rounded-md bg-raised p-2"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${
                      quake.magnitude >= 5
                        ? "text-critical"
                        : quake.magnitude >= 3
                          ? "text-high"
                          : "text-ink"
                    }`}
                  >
                    M{quake.magnitude.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted">{quake.location}</span>
                </div>
                <div className="text-[11px] text-muted">
                  Depth: {quake.depth}km · {new Date(quake.time).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
