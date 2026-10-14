import type { Coordinates } from "@/types/domain";

/**
 * Trusted ("safe") contact system.
 *
 * Contacts and the last GPS fix live in localStorage on this device only —
 * nothing is uploaded. Sharing is always an explicit user action that opens
 * the device's SMS/dialer app; the app never sends messages by itself.
 */

export const MAX_CONTACTS = 6;
const CONTACTS_KEY = "disastersense.contacts.v1";
const LAST_FIX_KEY = "disastersense.lastFix.v1";

export interface TrustedContact {
  id: string;
  name: string;
  phone: string; // stored as typed; normalized only when dialing
  relation?: string;
}

export interface StoredFix {
  coordinates: Coordinates;
  accuracyM: number;
  timestamp: number;
  manual: boolean;
}

/** Keep digits, leading +, and reasonable length for tel:/sms: links. */
export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  const plus = cleaned.startsWith("+") ? "+" : "";
  return plus + cleaned.replace(/\+/g, "");
}

export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw).replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function parseContacts(raw: string | null): TrustedContact[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): TrustedContact[] => {
      if (typeof item !== "object" || item === null) return [];
      const c = item as Record<string, unknown>;
      if (typeof c.name !== "string" || typeof c.phone !== "string") return [];
      if (!isValidPhone(c.phone)) return [];
      return [{
        id: typeof c.id === "string" ? c.id : `ct_${Math.random().toString(36).slice(2, 9)}`,
        name: c.name.slice(0, 80),
        phone: normalizePhone(c.phone),
        relation: typeof c.relation === "string" ? c.relation.slice(0, 40) : undefined,
      }];
    }).slice(0, MAX_CONTACTS);
  } catch {
    return [];
  }
}

export function loadContacts(): TrustedContact[] {
  if (typeof window === "undefined") return [];
  return parseContacts(window.localStorage.getItem(CONTACTS_KEY));
}

export function saveContacts(contacts: TrustedContact[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts.slice(0, MAX_CONTACTS)));
}

export function loadLastFix(): StoredFix | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_FIX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFix;
    if (typeof parsed?.coordinates?.lat !== "number" || typeof parsed?.coordinates?.lng !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLastFix(fix: StoredFix): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_FIX_KEY, JSON.stringify(fix));
}

export interface ShareContext {
  coordinates: Coordinates;
  timestamp: number;
  accuracyM: number;
  /** Reverse-geocoded place name for the coordinates, when known. */
  placeName?: string;
  shelterName?: string;
  shelterCoordinates?: Coordinates;
  shareUrl: string;
}

/** Human-readable safety message previewed before any SMS is opened. */
export function buildShareMessage(ctx: ShareContext): string {
  const when = new Date(ctx.timestamp).toLocaleString();
  const lines = [
    "DisasterSense safety update:",
    `My last known location: ${ctx.coordinates.lat.toFixed(5)}, ${ctx.coordinates.lng.toFixed(5)} (${when}, ±${ctx.accuracyM}m)`,
  ];
  if (ctx.placeName) {
    lines.push(`Place: ${ctx.placeName}`);
  }
  if (ctx.shelterName && ctx.shelterCoordinates) {
    lines.push(
      `Nearest listed shelter: ${ctx.shelterName} (${ctx.shelterCoordinates.lat.toFixed(5)}, ${ctx.shelterCoordinates.lng.toFixed(5)})`,
    );
  }
  lines.push(`Map: ${ctx.shareUrl}`);
  lines.push("This is a user-sent update, not an official alert.");
  return lines.join("\n");
}

/**
 * Device SMS deep link. iOS historically requires `&body=` while Android and
 * most others use `?body=` — pass `isApple` so the message body actually lands.
 */
export function smsLink(phone: string, body: string, isApple = false): string {
  return `sms:${normalizePhone(phone)}${isApple ? "&" : "?"}body=${encodeURIComponent(body)}`;
}

export function telLink(phone: string): string {
  return `tel:${normalizePhone(phone)}`;
}

/** Apple devices need the ampersand separator in sms: links. */
export function isAppleDevice(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

/**
 * WhatsApp deep link — works on phones AND laptops (opens WhatsApp Web / the
 * desktop app), which is the fallback when the device has no SMS app handler.
 */
export function whatsappLink(phone: string, body: string): string {
  const digits = normalizePhone(phone).replace(/^\+/, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}