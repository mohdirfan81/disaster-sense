import { describe, expect, it } from "vitest";
import { locationQuerySchema } from "@/lib/environment-api";

describe("locationQuerySchema", () => {
  it("accepts valid coordinates with a default radius", () => {
    const parsed = locationQuerySchema.parse({ lat: "17.4021", lng: "78.4482" });
    expect(parsed).toEqual({ lat: 17.4021, lng: 78.4482, radius: 100 });
  });

  it("coerces and clamps the radius range", () => {
    expect(locationQuerySchema.parse({ lat: "1", lng: "1", radius: "500" }).radius).toBe(500);
    expect(locationQuerySchema.safeParse({ lat: "1", lng: "1", radius: "501" }).success).toBe(false);
    expect(locationQuerySchema.safeParse({ lat: "1", lng: "1", radius: "0" }).success).toBe(false);
  });

  it("rejects out-of-range or missing coordinates", () => {
    expect(locationQuerySchema.safeParse({ lat: "91", lng: "1" }).success).toBe(false);
    expect(locationQuerySchema.safeParse({ lat: "-91", lng: "1" }).success).toBe(false);
    expect(locationQuerySchema.safeParse({ lat: "1", lng: "181" }).success).toBe(false);
    expect(locationQuerySchema.safeParse({ lat: "abc", lng: "1" }).success).toBe(false);
    expect(locationQuerySchema.safeParse({}).success).toBe(false);
  });
});