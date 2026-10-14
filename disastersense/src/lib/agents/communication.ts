import type {
  CommunicationResult,
  DisasterType,
  GeneratedAlert,
  Severity,
} from "@/types/domain";

/**
 * COMMUNICATION AGENT
 * Generates audience-appropriate alerts: short SMS for citizens, a social
 * update, and a control-room briefing - in English, Hindi and Telugu.
 *
 * Mock logic: templates. Replace with a real LLM/translation/SMS gateway
 * later; keep the GeneratedAlert shape and the channel split.
 */

const TYPE_LABEL: Record<DisasterType, string> = {
  flood: "flooding",
  fire: "fire",
  earthquake: "earthquake",
  cyclone: "cyclone",
  industrial: "industrial accident",
  medical: "medical emergency",
  other: "emergency",
};

const TYPE_LABEL_HI: Record<DisasterType, string> = {
  flood: "बाढ़",
  fire: "आग",
  earthquake: "भूकंप",
  cyclone: "चक्रवात",
  industrial: "औद्योगिक दुर्घटना",
  medical: "चिकित्सा आपातकाल",
  other: "आपातकाल",
};

const TYPE_LABEL_TE: Record<DisasterType, string> = {
  flood: "వరద",
  fire: "అగ్నిప్రమాదం",
  earthquake: "భూకంపం",
  cyclone: "తుఫాను",
  industrial: "పారిశ్రామిక ప్రమాదం",
  medical: "వైద్య అత్యవసర పరిస్థితి",
  other: "అత్యవసర పరిస్థితి",
};

const SEVERITY_EN: Record<Severity, string> = {
  low: "LOW", medium: "MODERATE", high: "HIGH", critical: "CRITICAL",
};

export function generateAlerts(input: {
  incidentCode: string;
  zoneName: string;
  disasterType: DisasterType;
  severity: Severity;
  peopleAffected: number;
}): CommunicationResult {
  const { incidentCode, zoneName, disasterType, severity, peopleAffected } = input;
  const typeEn = TYPE_LABEL[disasterType];
  const alerts: GeneratedAlert[] = [];

  /* ------------------------------------------------------------------ SMS */
  alerts.push({
    channel: "sms",
    language: "en",
    body: `ALERT ${incidentCode}: ${SEVERITY_EN[severity]} ${typeEn} reported in ${zoneName}. Avoid the area. Follow official instructions. Info: DisasterSense (prototype).`,
  });
  alerts.push({
    channel: "sms",
    language: "hi",
    body: `चेतावनी ${incidentCode}: ${zoneName} में ${TYPE_LABEL_HI[disasterType]} (${SEVERITY_EN[severity]})। क्षेत्र से दूर रहें। आधिकारिक निर्देशों का पालन करें। (प्रोटोटाइप)`,
  });
  alerts.push({
    channel: "sms",
    language: "te",
    body: `హెచ్చరిక ${incidentCode}: ${zoneName}లో ${TYPE_LABEL_TE[disasterType]} (${SEVERITY_EN[severity]}). ప్రాంతాన్ని దూరంగా ఉండండి. అధికారిక సూచనలు పాటించండి. (ప్రోటోటైప్)`,
  });

  /* --------------------------------------------------------------- SOCIAL */
  alerts.push({
    channel: "social",
    language: "en",
    body: `#DisasterSense ${incidentCode} — ${SEVERITY_EN[severity]} ${typeEn} in ${zoneName}. Est. ${peopleAffected} people affected. Emergency crews are being coordinated. This is a decision-support prototype; rely on official channels for orders.`,
  });

  /* ------------------------------------------------------------- BRIEFING */
  const escalationNote =
    severity === "critical"
      ? "CRITICAL: human approval required before dispatch. Treat as life-safety priority."
      : severity === "high"
        ? "Pre-position assets now; upgrade to dispatch on operator confirmation."
        : "Monitor; dispatch on threshold change.";

  alerts.push({
    channel: "briefing",
    language: "en",
    body: [
      `[${incidentCode}] ${SEVERITY_EN[severity]} ${typeEn} — ${zoneName}.`,
      `Estimated ${peopleAffected} people affected.`,
      escalationNote,
      `Verification: confirm with field teams via control channel before public escalation.`,
    ].join("\n"),
  });

  return {
    alerts,
    audienceNotes:
      "SMS targets nearby residents; social update for public situational awareness; briefing for control-room operators and responding agencies.",
  };
}
