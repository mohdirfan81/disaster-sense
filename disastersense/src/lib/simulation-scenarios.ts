import type { DisasterType, Severity } from "@/types/domain";

/**
 * Fictional simulation scenarios. At least one flood, fire and earthquake
 * are always guaranteed by the engine in simulation.ts.
 */

export interface Scenario {
  disasterType: DisasterType;
  severity: Severity;
  peopleAffected: number;
  reporter: string;
  contact: string;
  zoneIndex: number;
  description: string;
}

export const SCENARIOS: Scenario[] = [
  {
    disasterType: "flood",
    severity: "critical",
    peopleAffected: 320,
    reporter: "Suresh Babu",
    contact: "+91 98490 11111",
    zoneIndex: 0,
    description:
      "River overflowing near the old bridge. Water entering homes on Gandhi Street, many people trapped on rooftops, children and elderly stranded. Current is very strong, rising fast.",
  },
  {
    disasterType: "fire",
    severity: "high",
    peopleAffected: 45,
    reporter: "Fatima Begum",
    contact: "+91 98490 22222",
    zoneIndex: 1,
    description:
      "Fire spreading through the textile market shops. Thick smoke, gas cylinders in two shops, shopkeepers screaming for help. Flames jumping to adjacent row.",
  },
  {
    disasterType: "earthquake",
    severity: "high",
    peopleAffected: 120,
    reporter: "Dr. Anil Kumar",
    contact: "+91 98490 33333",
    zoneIndex: 3,
    description:
      "Magnitude 5.8 tremor. Three apartment buildings partially collapsed in Tech Corridor. Residents trapped under debris, structural damage, gas smell reported.",
  },
  {
    disasterType: "industrial",
    severity: "critical",
    peopleAffected: 210,
    reporter: "Mohan Reddy",
    contact: "+91 98490 44444",
    zoneIndex: 2,
    description:
      "Chemical tank explosion at the pesticide plant. Toxic white plume drifting toward the colony, workers unconscious, evacuation needed immediately.",
  },
  {
    disasterType: "cyclone",
    severity: "medium",
    peopleAffected: 75,
    reporter: "Lakshmi Devi",
    contact: "+91 98490 55555",
    zoneIndex: 4,
    description:
      "Cyclone winds tearing roofs off houses near the harbor. Fishing boats capsized, waterlogging rising, power lines down.",
  },
  {
    disasterType: "medical",
    severity: "high",
    peopleAffected: 30,
    reporter: "Sr. Grace",
    contact: "+91 98490 66666",
    zoneIndex: 5,
    description:
      "Mass food poisoning at the wedding hall near Central Station. 30 guests vomiting and unconscious, need ambulances fast.",
  },
  {
    disasterType: "flood",
    severity: "medium",
    peopleAffected: 60,
    reporter: "Ramesh Yadav",
    contact: "+91 98490 77777",
    zoneIndex: 6,
    description:
      "Rainwater flooding the hillview underpass, two cars submerged with people inside, water still rising.",
  },
  {
    disasterType: "fire",
    severity: "medium",
    peopleAffected: 12,
    reporter: "Nusrath Jahan",
    contact: "+91 98490 88888",
    zoneIndex: 7,
    description:
      "Small fire in the airport cargo warehouse, smoke visible, staff evacuating, no injuries yet.",
  },
  {
    disasterType: "earthquake",
    severity: "medium",
    peopleAffected: 40,
    reporter: "Victor Paul",
    contact: "+91 98490 99999",
    zoneIndex: 1,
    description:
      "Aftershock cracked walls of the old market buildings, some masonry fallen on the road, people panicked.",
  },
  {
    disasterType: "other",
    severity: "low",
    peopleAffected: 8,
    reporter: "Anonymous",
    contact: "+91 98490 10101",
    zoneIndex: 5,
    description:
      "Large tree fallen across Station Road blocking traffic, minor damage to a parked van, no injuries.",
  },
  {
    disasterType: "flood",
    severity: "high",
    peopleAffected: 150,
    reporter: "Padma Kumari",
    contact: "+91 98490 12121",
    zoneIndex: 4,
    description:
      "Storm surge flooding the harbor settlement, families stranded on the upper floor of the school, need rescue boats urgently.",
  },
  {
    disasterType: "industrial",
    severity: "medium",
    peopleAffected: 25,
    reporter: "Imran Qureshi",
    contact: "+91 98490 13131",
    zoneIndex: 2,
    description:
      "Gas leak smell in the industrial belt near the paint factory, workers evacuated, headache and nausea reported.",
  },
  {
    disasterType: "fire",
    severity: "critical",
    peopleAffected: 90,
    reporter: "Bhavana Sharma",
    contact: "+91 98490 14141",
    zoneIndex: 6,
    description:
      "Apartment complex fire on the 4th floor with people trapped on balconies, massive smoke, possible cylinder explosion, need immediate rescue.",
  },
  {
    disasterType: "medical",
    severity: "medium",
    peopleAffected: 15,
    reporter: "Dr. Sameer Khan",
    contact: "+91 98490 15151",
    zoneIndex: 3,
    description:
      "Road accident on the highway stretch, three vehicles, multiple injured passengers, need medical evacuation.",
  },
];
