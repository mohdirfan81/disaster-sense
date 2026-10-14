import type {
  DisasterType,
  IncidentReport,
  IntakeExtraction,
  Severity,
} from "@/types/domain";

/**
 * INTAKE AGENT
 * Cleans and validates an incoming report and extracts structured fields
 * from free text + the reporter's declared fields.
 *
 * Mock logic: keyword dictionaries and regexes. Replace `extractFromText`
 * with an LLM structured-output call later - the interface stays identical.
 */

const URGENCY_KEYWORDS = [
  "trapped", "collapse", "collapse", "explosion", "bleeding", "unconscious",
  "screaming", "children", "elderly", "gas leak", "spreading", "drowning",
  "entombed", "fire spread", "structural", "victim", "casualties", "smoke",
];

const HAZARD_KEYWORDS = [
  "gas", "chemical", "electric", "power line", "oxygen", "propane", "tank",
  "asbestos", "radiation", "fuel", "dam", "levee", "bridge", "overflow",
];

const TYPE_KEYWORDS: Record<DisasterType, string[]> = {
  flood: ["flood", "flooding", "water", "submerged", "rising water", "levee", "dam", "rain"],
  fire: ["fire", "flame", "smoke", "burning", "blaze", "embers", "arson"],
  earthquake: ["earthquake", "quake", "tremor", "aftershock", "collapse", "structural damage"],
  cyclone: ["cyclone", "hurricane", "tornado", "storm", "wind", "gale"],
  industrial: ["industrial", "factory", "chemical", "plant", "refinery", "toxic", "gas leak"],
  medical: ["medical", "injured", "heart", "breathing", "ambulance", "patients", "epidemic"],
  other: [],
};

const SEVERITY_HINTS: Array<{ severity: Severity; words: string[] }> = [
  { severity: "critical", words: ["critical", "trapped", "multiple casualties", "explosion", "collapse", "drowning", "unconscious"] },
  { severity: "high", words: ["urgent", "spreading", "many people", "smoke", "injured", "evacuate"] },
  { severity: "medium", words: ["damage", "affected", "blocked", "water rising", "minor"] },
  { severity: "low", words: ["small", "contained", "minor", "single", "local"] },
];

function detectType(text: string, declared: DisasterType): DisasterType {
  if (declared !== "other") return declared;
  const lower = text.toLowerCase();
  let best: DisasterType = "other";
  let bestScore = 0;
  for (const [type, words] of Object.entries(TYPE_KEYWORDS) as Array<[DisasterType, string[]]>) {
    const score = words.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return bestScore > 0 ? best : "other";
}

function detectSeverity(text: string, declared: Severity): Severity {
  // Escalate but never de-escalate a reporter's own severity choice.
  const lower = text.toLowerCase();
  let detected: Severity = declared;
  for (const hint of SEVERITY_HINTS) {
    if (hint.words.some((w) => lower.includes(w))) {
      const rank = { low: 1, medium: 2, high: 3, critical: 4 };
      if (rank[hint.severity] > rank[detected]) detected = hint.severity;
      break;
    }
  }
  return detected;
}

function detectPeopleAffected(text: string, declared: number): number {
  const match = text.match(/(\d{1,6})\s*(people|persons|individuals|trapped|affected|victims)/i);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > declared) return parsed;
  }
  const words: Record<string, number> = { dozen: 12, several: 6, many: 20, dozens: 24 };
  for (const [word, value] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text) && value > declared) return value;
  }
  return declared;
}

export function cleanText(input: string): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function intakeExtract(report: IncidentReport): IntakeExtraction {
  const cleaned = cleanText(report.description);
  const combined = `${report.description} ${report.address}`;
  const lower = combined.toLowerCase();

  return {
    disasterType: detectType(combined, report.disasterType),
    severity: detectSeverity(combined, report.severity),
    peopleAffected: detectPeopleAffected(combined, report.peopleAffected),
    locationText: report.address.trim() || "Location not provided",
    coordinates: { lat: report.coordinates.lat, lng: report.coordinates.lng },
    urgencyKeywords: URGENCY_KEYWORDS.filter((w) => lower.includes(w)),
    hazards: HAZARD_KEYWORDS.filter((w) => lower.includes(w)),
    cleanedDescription: cleaned,
    confidence: report.address.trim() && report.coordinates ? 0.92 : 0.61,
  };
}
