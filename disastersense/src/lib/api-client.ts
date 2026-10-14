import type {
  AgentLog,
  Cluster,
  Incident,
  IncidentReport,
  KpiSnapshot,
  Resource,
  SituationReport,
} from "@/types/domain";
import type {
  EarthquakeData,
  WaterLevelData,
  WeatherData,
} from "@/lib/openmeteo";
import type { PlaceName } from "@/lib/reverse-geocode";

/** Typed browser client. Same-origin fetches; no secrets live here. */

export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: { message?: string } };
      message = data.error?.message ?? message;
    } catch {
      /* non-JSON error */
    }
    throw new ApiClientError(response.status, message);
  }
  return (await response.json()) as T;
}

export interface IncidentWithCode extends Incident {
  code: string;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  kpis: () => request<KpiSnapshot>("/api/kpis"),

  incidents: (params: {
    disasterType?: string;
    severity?: string;
    status?: string;
    search?: string;
  } = {}) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) search.set(k, v);
    }
    const qs = search.toString();
    return request<{ items: IncidentWithCode[]; total: number }>(
      `/api/incidents${qs ? `?${qs}` : ""}`,
    );
  },

  incident: (id: string) =>
    request<{
      incident: IncidentWithCode;
      logs: AgentLog[];
      reports: IncidentReport[];
      pipeline: { stages: Array<{ agent: string; label: string; status: string; detail: string }>; approvalRequired: boolean; completed: boolean };
    }>(`/api/incidents/${id}`),

  updateIncidentStatus: (id: string, status: Incident["status"]) =>
    request<{ incident: Incident }>(`/api/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  approve: (id: string, decision: "approve" | "reject", operatorName?: string) =>
    request<{ incident: Incident; decision: string }>(`/api/incidents/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ decision, operatorName }),
    }),

  activity: (limit = 40) => request<{ items: AgentLog[] }>(`/api/activity?limit=${limit}`),
  resources: () => request<{ items: Resource[] }>("/api/resources"),
  clusters: () => request<{ items: Cluster[] }>("/api/clusters"),

  submitReport: (body: Record<string, unknown>) =>
    request<{ report: IncidentReport; incident: { id: string; code: string }; message: string }>(
      "/api/reports",
      { method: "POST", body: JSON.stringify(body) },
    ),

  runSimulation: (count?: number) =>
    request<{ scenariosRun: number; incidentIds: string[]; message: string }>(
      "/api/simulation",
      { method: "POST", body: JSON.stringify({ count }) },
    ),

  generateSitrep: () =>
    request<{ report: SituationReport; markdown: string }>("/api/sitrep", { method: "POST" }),

  latestSitrep: () => request<{ report: SituationReport | null }>("/api/sitrep"),

  weather: (lat: number, lng: number) =>
    request<{ weather: WeatherData }>(`/api/weather?lat=${lat}&lng=${lng}`),

  waterLevels: (lat: number, lng: number) =>
    request<{ waterLevel: WaterLevelData }>(
      `/api/water-levels?lat=${lat}&lng=${lng}`,
    ),

  earthquakes: (lat: number, lng: number, radiusKm: number = 100) =>
    request<{ earthquakes: EarthquakeData[] }>(
      `/api/earthquakes?lat=${lat}&lng=${lng}&radius=${radiusKm}`,
    ),

  /** Reverse geocode; coordinates are rounded to ~11 m to reuse cached lookups. */
  place: (lat: number, lng: number) =>
    request<{ place: PlaceName }>(
      `/api/place?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`,
    ),
};
