"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { IncidentList } from "@/components/IncidentList";
import { IncidentMap, type MapIncident } from "@/components/IncidentMap";
import { ActivityFeed } from "@/components/ActivityFeed";

/**
 * Shared incident board for the government / rescue / admin workspaces:
 * map + filterable list + live agent activity feed.
 */
export function OperationsBoard() {
  const router = useRouter();
  const [filters, setFilters] = useState({ disasterType: "", severity: "", status: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const incidents = useQuery({
    queryKey: ["incidents", filters],
    queryFn: () => api.incidents(filters),
    refetchInterval: 5_000,
  });
  const clusters = useQuery({
    queryKey: ["clusters"],
    queryFn: api.clusters,
    refetchInterval: 15_000,
  });

  const items = incidents.data?.items ?? [];
  const mapIncidents: MapIncident[] = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        reportKind: i.reportKind,
        code: i.code,
        title: i.title,
        severity: i.severity,
        status: i.status,
        coordinates: i.coordinates,
        zoneName: i.zoneName,
        peopleAffected: i.peopleAffected,
        affectedRadiusKm: i.geospatial?.affectedRadiusKm,
        isSimulation: i.isSimulation,
      })),
    [items],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="h-[380px] overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
          <IncidentMap
            incidents={mapIncidents}
            clusters={clusters.data?.items ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <IncidentList
          incidents={items}
          filters={filters}
          onFiltersChange={setFilters}
          selectedId={selectedId}
          onSelect={(id) => router.push(`/incidents/${id}`)}
          running={incidents.isFetching}
        />
      </div>
      <ActivityFeed />
    </div>
  );
}