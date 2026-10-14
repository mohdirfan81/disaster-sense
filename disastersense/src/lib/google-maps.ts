import type { Coordinates } from "@/types/domain";

/**
 * URL builders for Google Maps deep links (no API key required).
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * Google Maps computes the route at open time; it does NOT guarantee that the
 * route is safe during a disaster. Always follow official evacuation orders.
 */

export type TravelMode = "driving" | "walking" | "bicycling";

function coordParam(c: Coordinates): string {
  return `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`;
}

export function googleMapsDirectionsUrl(
  origin: Coordinates,
  destination: Coordinates,
  travelMode: TravelMode = "driving",
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: coordParam(origin),
    destination: coordParam(destination),
    travelmode: travelMode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMapsSearchUrl(query: string, center?: Coordinates): string {
  const params = new URLSearchParams({ api: "1", query });
  if (center) {
    params.set("center", coordParam(center));
    params.set("zoom", "13");
  }
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function googleMapsPinUrl(location: Coordinates, label: string): string {
  const params = new URLSearchParams({
    api: "1",
    query: `${label}@${coordParam(location)}`,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/** Compact shareable link that pins the person's last known position. */
export function googleMapsSharePinUrl(location: Coordinates): string {
  return `https://www.google.com/maps?q=${coordParam(location)}`;
}