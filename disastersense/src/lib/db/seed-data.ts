import type { FacilityType, Resource, ResourceType, User, Coordinates } from "@/types/domain";

/**
 * Static demo reference data: operators, the resource pool and civic
 * facilities shown on the map. Fictional names, realistic spacing inside the
 * Vasanthapuram Metro ops area (see lib/geo.ts).
 */

export const SEED_USERS: User[] = [
  { id: "usr_operator_1", name: "Priya Menon", role: "operator", contact: "+91 90000 10001" },
  { id: "usr_authority_1", name: "Ravi Deshmukh", role: "authority", contact: "+91 90000 10002" },
  { id: "usr_coord_1", name: "Amina Sheikh", role: "coordinator", contact: "+91 90000 10003" },
  { id: "usr_field_1", name: "Karthik Rao", role: "field", contact: "+91 90000 10004" },
];

export const DEMO_OPERATOR_ID = "usr_operator_1";

interface ResourceSeed {
  type: ResourceType;
  label: string;
  baseLocation: string;
  baseCoordinates: Coordinates;
  quantity: number;
  etaMinutes: number;
}

const RESOURCE_SEEDS: ResourceSeed[] = [
  { type: "ambulance", label: "Ambulance Alpha", baseLocation: "Central Hospital Depot", baseCoordinates: { lat: 17.3881, lng: 78.4902 }, quantity: 4, etaMinutes: 8 },
  { type: "ambulance", label: "Ambulance Bravo", baseLocation: "Riverside Clinic", baseCoordinates: { lat: 17.4012, lng: 78.4501 }, quantity: 2, etaMinutes: 12 },
  { type: "fire_brigade", label: "Fire Unit 1", baseLocation: "Station Road Fire House", baseCoordinates: { lat: 17.3842, lng: 78.4823 }, quantity: 3, etaMinutes: 7 },
  { type: "fire_brigade", label: "Fire Unit 2", baseLocation: "Industrial Belt Fire Post", baseCoordinates: { lat: 17.4901, lng: 78.4955 }, quantity: 2, etaMinutes: 15 },
  { type: "rescue_boat", label: "Rescue Boat Flotilla", baseLocation: "Riverside Jetty", baseCoordinates: { lat: 17.4055, lng: 78.4431 }, quantity: 6, etaMinutes: 18 },
  { type: "medical_team", label: "Medical Team One", baseLocation: "Central Hospital", baseCoordinates: { lat: 17.3875, lng: 78.4895 }, quantity: 3, etaMinutes: 10 },
  { type: "police_unit", label: "Police Reserve", baseLocation: "Metro Control HQ", baseCoordinates: { lat: 17.3869, lng: 78.4877 }, quantity: 5, etaMinutes: 6 },
  { type: "volunteers", label: "Volunteer Corps", baseLocation: "Community Hall", baseCoordinates: { lat: 17.3755, lng: 78.4699 }, quantity: 40, etaMinutes: 25 },
  { type: "relief_supplies", label: "Relief Warehouse", baseLocation: "Godown District", baseCoordinates: { lat: 17.3612, lng: 78.4988 }, quantity: 120, etaMinutes: 30 },
  { type: "helicopter", label: "Air Rescue 1", baseLocation: "Airport Perimeter Pad", baseCoordinates: { lat: 17.2431, lng: 78.4312 }, quantity: 1, etaMinutes: 22 },
  { type: "shelter", label: "Temporary Shelter Bay", baseLocation: "Municipal Grounds", baseCoordinates: { lat: 17.3942, lng: 78.4712 }, quantity: 2, etaMinutes: 20 },
];

export function buildSeedResources(): Resource[] {
  return RESOURCE_SEEDS.map((seed, i) => ({
    id: `res_seed_${i + 1}`,
    type: seed.type,
    label: seed.label,
    quantity: seed.quantity,
    baseLocation: seed.baseLocation,
    baseCoordinates: seed.baseCoordinates,
    availability: "available" as const,
    assignedIncidentId: null,
    etaMinutes: seed.etaMinutes,
  }));
}

export interface Facility {
  name: string;
  type: FacilityType;
  coordinates: Coordinates;
}

export const FACILITIES: Facility[] = [
  { name: "Central Government Hospital", type: "hospital", coordinates: { lat: 17.3875, lng: 78.4895 } },
  { name: "Riverside Clinic", type: "hospital", coordinates: { lat: 17.4012, lng: 78.4501 } },
  { name: "Harbor Health Centre", type: "hospital", coordinates: { lat: 17.3325, lng: 78.5098 } },
  { name: "Station Road Fire House", type: "fire_station", coordinates: { lat: 17.3842, lng: 78.4823 } },
  { name: "Industrial Belt Fire Post", type: "fire_station", coordinates: { lat: 17.4901, lng: 78.4955 } },
  { name: "Metro Control HQ", type: "police_station", coordinates: { lat: 17.3869, lng: 78.4877 } },
  { name: "Harbor Outpost", type: "police_station", coordinates: { lat: 17.3318, lng: 78.5105 } },
  { name: "Municipal Grounds Shelter", type: "shelter", coordinates: { lat: 17.3942, lng: 78.4712 } },
  { name: "Tech Corridor Convention Hall", type: "shelter", coordinates: { lat: 17.4428, lng: 78.3791 } },
  { name: "Central School Shelter", type: "shelter", coordinates: { lat: 17.3712, lng: 78.4745 } },
];
