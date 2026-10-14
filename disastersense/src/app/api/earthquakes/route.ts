import { NextRequest } from "next/server";
import { fetchEarthquakes } from "@/lib/openmeteo";
import { environmentResponse } from "@/lib/environment-api";

export function GET(request: NextRequest) {
  return environmentResponse(request, "earthquakes", fetchEarthquakes);
}
