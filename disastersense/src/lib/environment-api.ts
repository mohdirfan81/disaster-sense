import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const locationQuerySchema = z.object({
  lat: z.string().trim().min(1).pipe(z.coerce.number().finite().min(-90).max(90)),
  lng: z.string().trim().min(1).pipe(z.coerce.number().finite().min(-180).max(180)),
  radius: z.string().trim().min(1).pipe(z.coerce.number().finite().min(1).max(500)).default("100"),
});

export async function environmentResponse<T>(
  request: NextRequest,
  key: string,
  load: (lat: number, lng: number, radius: number) => Promise<T>,
) {
  const parsed = locationQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Valid latitude, longitude and radius (1-500 km) are required." } },
      { status: 400 },
    );
  }
  try {
    const { lat, lng, radius } = parsed.data;
    return NextResponse.json({ [key]: await load(lat, lng, radius) });
  } catch {
    return NextResponse.json(
      { error: { message: "Live provider unavailable or returned incomplete data. Try again shortly." } },
      { status: 502 },
    );
  }
}