"use client";

import { useEffect, useRef, useState } from "react";
import type { Cluster, FacilityType, Incident, Severity } from "@/types/domain";
import { SEVERITY_HEX } from "@/lib/format";
import { FACILITIES } from "@/lib/db/seed-data";
import { OPS_CENTER } from "@/lib/geo";

/**
 * Interactive operations map (Leaflet, client-only).
 * Shows incident pins colored by severity, affected-radius circles, and
 * nearby facility markers. Tiles are OpenStreetMap; swap for Mapbox later.
 */

const FACILITY_ICONS: Record<FacilityType, string> = {
  hospital: "🏥",
  fire_station: "🚒",
  police_station: "🚓",
  shelter: "🏠",
};

export interface MapIncident extends Pick<
  Incident,
  "id" | "reportKind" | "title" | "severity" | "status" | "coordinates" | "zoneName" | "peopleAffected" | "isSimulation"
> {
  code: string;
  affectedRadiusKm?: number;
}

export function IncidentMap({
  incidents,
  clusters,
  selectedId,
  onSelect,
}: {
  incidents: MapIncident[];
  clusters: Cluster[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  // Leaflet is imported lazily, so the map/layer group only exist after the
  // async setup resolves. Without a re-render at that point the redraw effect
  // below runs against null refs and never draws. This state forces it.
  const [mapReady, setMapReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    void (async () => {
      const leaflet = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (disposed || !containerRef.current) return;

      const map = leaflet.map(containerRef.current, {
        center: [OPS_CENTER.lat, OPS_CENTER.lng],
        zoom: 12,
        zoomControl: true,
      });
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(map);
      mapRef.current = map;
      markersRef.current = leaflet.layerGroup().addTo(map);

      // Facility markers.
      for (const facility of FACILITIES) {
        leaflet
          .marker([facility.coordinates.lat, facility.coordinates.lng], {
            icon: leaflet.divIcon({
              className: "",
              html: `<div style="font-size:14px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))">${FACILITY_ICONS[facility.type]}</div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            }),
          })
          .bindTooltip(`${facility.name} (${facility.type.replace("_", " ")})`, { direction: "top" })
          .addTo(map);
      }

      setMapReady(true);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Redraw incident layers when data changes (or once the map becomes ready).
  useEffect(() => {
    const leafletRef = mapRef.current;
    const layer = markersRef.current;
    if (!mapReady || !leafletRef || !layer) return;
    let cancelled = false;

    void (async () => {
      const leaflet = await import("leaflet");
      if (cancelled) return;
      layer.clearLayers();

      for (const cluster of clusters) {
        leaflet
          .circle([cluster.centroid.lat, cluster.centroid.lng], {
            radius: 1500,
            color: SEVERITY_HEX[cluster.riskLevel as Severity],
            weight: 1,
            fillOpacity: 0.04,
            dashArray: "4 4",
          })
          .bindTooltip(`Risk cluster: ${cluster.area} (${cluster.riskLevel})`)
          .addTo(layer);
      }

      for (const incident of incidents) {
        const color = SEVERITY_HEX[incident.severity];
        const isSelected = incident.id === selectedId;
        const marker = leaflet.circleMarker([incident.coordinates.lat, incident.coordinates.lng], {
          radius: isSelected ? 11 : 8,
          color,
          weight: isSelected ? 3 : 2,
          fillColor: color,
          fillOpacity: 0.85,
        });
        marker.bindTooltip(
          `${incident.code} · ${incident.title}${incident.isSimulation ? " · simulation (fictional)" : ""}`,
          { direction: "top" },
        );
        marker.on("click", () => onSelectRef.current(incident.id));
        marker.addTo(layer);

        if (incident.affectedRadiusKm) {
          leaflet
            .circle([incident.coordinates.lat, incident.coordinates.lng], {
              radius: incident.affectedRadiusKm * 1000,
              color,
              weight: 1,
              fillOpacity: 0.05,
            })
            .addTo(layer);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [incidents, clusters, selectedId, mapReady]);

  return <div ref={containerRef} className="h-full min-h-[320px] w-full rounded-b-lg" aria-label="Operations map" />;
}
