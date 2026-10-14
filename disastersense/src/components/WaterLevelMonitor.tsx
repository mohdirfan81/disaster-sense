"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Waves, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { api } from "@/lib/api-client";

/**
 * 7-day modeled river discharge (Open-Meteo Flood API / GloFAS).
 * This is NOT a live gauge height and NOT an official flood warning.
 */
export function WaterLevelMonitor({ lat, lng, label }: { lat?: number; lng?: number; label?: string }) {
  const location = { lat: lat ?? 17.4021, lng: lng ?? 78.4482 };
  const { data, isLoading, error } = useQuery({
    queryKey: ["waterLevels", location.lat, location.lng],
    queryFn: () => api.waterLevels(location.lat, location.lng),
    refetchInterval: 300000,
    retry: 2,
  });

  const river = data?.waterLevel;
  const values = (river?.daily.river_discharge ?? []).filter((v): v is number => v !== null);
  const first = values[0];
  const peak = values.length ? Math.max(...values) : null;
  const last = values.length ? values[values.length - 1] : null;
  const changePct = first && last && first > 0 ? ((last - first) / first) * 100 : 0;
  const trend = changePct > 15 ? "rising" : changePct < -15 ? "falling" : "stable";

  const trendIcon =
    trend === "rising" ? (
      <TrendingUp className="h-4 w-4 text-high" />
    ) : trend === "falling" ? (
      <TrendingDown className="h-4 w-4 text-low" />
    ) : (
      <Minus className="h-4 w-4 text-muted" />
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-lg border border-line bg-panel p-4 shadow-panel"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Waves className="h-4 w-4 text-accent" />
          River discharge
        </h3>
        {trendIcon}
      </div>
      {label ? <p className="mb-2 -mt-1 truncate text-[11px] text-muted">{label}</p> : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-4 text-muted">Loading…</div>
      ) : error ? (
        <div className="py-4 text-sm text-muted">
          Live river forecast unavailable. Check official CWC bulletins.
        </div>
      ) : !river || values.length === 0 ? (
        <div className="py-4 text-sm text-muted">
          No discharge forecast for this grid cell. Check official CWC bulletins.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold tabular-nums text-ink">
                {(peak ?? 0).toFixed(1)} <span className="text-sm font-medium text-muted">m³/s peak</span>
              </div>
              <div className="text-xs text-muted">7-day modeled forecast</div>
            </div>
            <span
              className={`text-sm font-medium ${trend === "rising" ? "text-high" : trend === "falling" ? "text-low" : "text-muted"}`}
            >
              {trend === "rising" ? `+${changePct.toFixed(0)}%` : trend === "falling" ? `${changePct.toFixed(0)}%` : "stable"}
            </span>
          </div>

          {/* Sparkline of available daily values. */}
          <div className="flex h-12 items-end gap-1" aria-hidden>
            {(river.daily.river_discharge ?? []).map((v, i) => {
              const max = Math.max(...values, 1);
              return (
                <div
                  key={river.daily.time[i] ?? i}
                  className={`flex-1 rounded-t-sm ${trend === "rising" ? "bg-high/70" : "bg-accent/60"}`}
                  style={{ height: `${v === null ? 4 : Math.max(6, (v / max) * 100)}%` }}
                />
              );
            })}
          </div>

          <p className="flex gap-1.5 rounded-md bg-raised p-2 text-[10px] leading-snug text-muted">
            <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            Modeled GloFAS discharge at ~5 km resolution — not a live gauge reading and not an
            official warning. Follow CWC/IMD/NDMA bulletins.
          </p>
          <div className="text-[11px] text-faint">
            Updated {river.fetchedAt ? new Date(river.fetchedAt).toLocaleTimeString() : "—"} · {river.source}
          </div>
        </div>
      )}
    </motion.div>
  );
}