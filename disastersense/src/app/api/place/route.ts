import { NextRequest } from "next/server";
import { environmentResponse } from "@/lib/environment-api";
import { reverseGeocode } from "@/lib/reverse-geocode";

/** Reverse geocode coordinates → place name (Nominatim, BigDataCloud fallback). */
export function GET(request: NextRequest) {
  return environmentResponse(request, "place", (lat, lng) => reverseGeocode(lat, lng));
}