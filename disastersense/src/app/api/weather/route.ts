import { NextRequest } from "next/server";
import { fetchWeather } from "@/lib/openmeteo";
import { environmentResponse } from "@/lib/environment-api";

export function GET(request: NextRequest) {
  return environmentResponse(request, "weather", fetchWeather);
}
