"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Cloud, Clock, Droplets, MapPin, Thermometer, Wind } from "lucide-react";
import { api } from "@/lib/api-client";
import { getWeatherDescription } from "@/lib/openmeteo";

/**
 * Live current conditions (Open-Meteo) for a point — either the device's GPS
 * position or the control-room focus. `label` says which one is being shown
 * so users never mistake another location's weather for their own.
 */
export function WeatherWidget({
  lat,
  lng,
  label,
}: {
  lat?: number;
  lng?: number;
  label?: string;
}) {
  const location = { lat: lat ?? 17.4021, lng: lng ?? 78.4482 };
  const { data, isLoading, error } = useQuery({
    queryKey: ["weather", location.lat, location.lng],
    queryFn: () => api.weather(location.lat, location.lng),
    refetchInterval: 300000, // 5 minutes
    retry: 3,
  });

  const weather = data?.weather?.current;
  const observedAt = weather?.time
    ? new Date(weather.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-lg border border-line bg-panel p-4 shadow-panel"
    >
      <div className="mb-3 flex items-center gap-2">
        <Cloud className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-ink">Weather Conditions</h3>
        <span className="ml-auto text-[10px] text-faint">Open-Meteo · live</span>
      </div>
      {label ? (
        <p className="mb-3 flex items-center gap-1 text-[11px] text-muted">
          <MapPin className="h-3 w-3 shrink-0 text-accent" aria-hidden />
          <span className="truncate">{label}</span>
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-4 text-muted">Loading...</div>
      ) : error ? (
        <div className="py-4 text-sm text-muted">Unable to load weather data</div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-high" />
              <span className="text-2xl font-bold tabular-nums text-ink">
                {weather ? `${weather.temperature.toFixed(1)}°C` : "--"}
              </span>
              {weather?.feelsLike !== undefined ? (
                <span className="text-xs text-muted">feels {weather.feelsLike.toFixed(1)}°C</span>
              ) : null}
            </div>
            <span className="text-xs text-muted">
              {getWeatherDescription(weather?.weathercode || 0)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-md bg-raised p-2">
              <Droplets className="h-3.5 w-3.5 text-muted" aria-hidden />
              <div>
                <div className="text-xs font-medium text-ink">
                  {weather?.humidity !== undefined ? `${Math.round(weather.humidity)}%` : "--"}
                </div>
                <div className="text-[10px] text-muted">Humidity</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-raised p-2">
              <Wind className="h-3.5 w-3.5 text-muted" aria-hidden />
              <div>
                <div className="text-xs font-medium text-ink">
                  {weather ? `${weather.windspeed.toFixed(1)} km/h` : "--"}
                </div>
                <div className="text-[10px] text-muted">Wind</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-raised p-2">
              <Droplets className="h-3.5 w-3.5 text-muted" aria-hidden />
              <div>
                <div className="text-xs font-medium text-ink">
                  {weather ? `${weather.precipitation.toFixed(1)} mm` : "--"}
                </div>
                <div className="text-[10px] text-muted">Precipitation</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-raised p-2">
              <Clock className="h-3.5 w-3.5 text-muted" aria-hidden />
              <div>
                <div className="text-xs font-medium text-ink">{observedAt ?? "--"}</div>
                <div className="text-[10px] text-muted">Observed</div>
              </div>
            </div>
          </div>
          <p className="text-[10px] leading-snug text-faint">
            2 m air temperature at ~{location.lat.toFixed(3)}, {location.lng.toFixed(3)} · Open-Meteo
            model grid, not a personal weather station.
          </p>
        </div>
      )}
    </motion.div>
  );
}