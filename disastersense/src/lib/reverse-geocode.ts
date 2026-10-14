import { z } from "zod";

/**
 * Reverse geocoding: GPS coordinates → human-readable place name.
 *
 * Provider chain (no API keys required):
 *  1. OpenStreetMap Nominatim — full street-level address.
 *  2. BigDataCloud — free locality-level fallback.
 *
 * Responses are cached by Next's data cache for 24 h, and callers round
 * coordinates to a ~11 m grid so jittery GPS fixes do not hammer the
 * providers (Nominatim's usage policy allows only modest request volume).
 * If both providers fail the API route returns 502 and the UI keeps
 * showing raw coordinates — never a fabricated name.
 */

export interface PlaceName {
  /** Most specific → least specific, e.g. "Begumpet, Hyderabad, Telangana, India". */
  formatted: string;
  /** Compact label for headings, e.g. "Begumpet, Hyderabad". */
  short: string;
  /** Which provider supplied the name (shown in the UI for transparency). */
  source: string;
}

export interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  village?: string;
  hamlet?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  country?: string;
}

/** Drop empty / duplicate parts (case-insensitive) while preserving order. */
function dedupe(parts: Array<string | undefined>): string[] {
  const out: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    if (!out.some((existing) => existing.toLowerCase() === value.toLowerCase())) out.push(value);
  }
  return out;
}

/** Turn a Nominatim address object + display_name into short and full names. */
export function formatNominatimPlace(
  address: NominatimAddress,
  displayName: string,
): { formatted: string; short: string } {
  const locality =
    address.suburb ??
    address.neighbourhood ??
    address.quarter ??
    address.village ??
    address.hamlet ??
    address.town ??
    address.city ??
    address.municipality ??
    address.county;
  const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;

  const short = dedupe([locality, city]).join(", ");
  return {
    formatted: displayName.trim() || dedupe([locality, city, address.state, address.country]).join(", "),
    short: short || displayName.split(",").slice(0, 2).join(",").trim() || displayName.trim(),
  };
}

/** Turn a BigDataCloud locality response into short and full names. */
export function formatBigDataPlace(place: {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  countryName?: string;
}): { formatted: string; short: string } {
  const formatted = dedupe([place.locality, place.city, place.principalSubdivision, place.countryName]).join(", ");
  return {
    formatted,
    short: dedupe([place.locality, place.city]).join(", ") || formatted,
  };
}

const nominatimSchema = z.object({
  display_name: z.string().min(1),
  address: z
    .object({
      house_number: z.string().optional(),
      road: z.string().optional(),
      neighbourhood: z.string().optional(),
      suburb: z.string().optional(),
      quarter: z.string().optional(),
      village: z.string().optional(),
      hamlet: z.string().optional(),
      town: z.string().optional(),
      city: z.string().optional(),
      municipality: z.string().optional(),
      county: z.string().optional(),
      state_district: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .partial(),
});

const bigDataSchema = z.object({
  locality: z.string().optional(),
  city: z.string().optional(),
  principalSubdivision: z.string().optional(),
  countryName: z.string().optional(),
});

/** Resolve a place name for coordinates, or throw so the route can answer 502. */
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceName> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
      {
        headers: {
          "User-Agent": "DisasterSense/1.0 (disaster-response demo; reverse geocoding)",
        },
        signal: AbortSignal.timeout(8_000),
        next: { revalidate: 86_400 },
      },
    );
    if (response.ok) {
      const parsed = nominatimSchema.safeParse(await response.json());
      if (parsed.success) {
        const { formatted, short } = formatNominatimPlace(parsed.data.address, parsed.data.display_name);
        if (formatted) return { formatted, short, source: "OpenStreetMap" };
      }
    }
  } catch {
    /* fall through to the backup provider */
  }

  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(8_000), next: { revalidate: 86_400 } },
    );
    if (!response.ok) throw new Error(`Place provider returned ${response.status}`);
    const { formatted, short } = formatBigDataPlace(bigDataSchema.parse(await response.json()));
    if (!formatted) throw new Error("Place provider returned no address");
    return { formatted, short, source: "BigDataCloud" };
  } catch {
    throw new Error("Place name lookup failed");
  }
}