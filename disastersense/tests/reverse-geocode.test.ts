import { describe, expect, it } from "vitest";
import { formatBigDataPlace, formatNominatimPlace } from "@/lib/reverse-geocode";

describe("formatNominatimPlace", () => {
  it("builds a short label and keeps the full display name", () => {
    const out = formatNominatimPlace(
      { suburb: "Begumpet", city: "Hyderabad", state: "Telangana", country: "India" },
      "Begumpet, Hyderabad, Telangana, India",
    );
    expect(out.short).toBe("Begumpet, Hyderabad");
    expect(out.formatted).toBe("Begumpet, Hyderabad, Telangana, India");
  });

  it("does not repeat a locality that is also the city", () => {
    const out = formatNominatimPlace(
      { city: "Hyderabad", state: "Telangana", country: "India" },
      "Hyderabad, Telangana, India",
    );
    expect(out.short).toBe("Hyderabad");
  });

  it("falls back to the first two parts of display_name when the address is empty", () => {
    const out = formatNominatimPlace({}, "Somewhere Rural, District Four, India");
    expect(out.short).toBe("Somewhere Rural, District Four");
    expect(out.formatted).toBe("Somewhere Rural, District Four, India");
  });

  it("prefers village over district-level names for rural fixes", () => {
    const out = formatNominatimPlace(
      { village: "Lakshmipuram", state_district: "Guntur", state: "Andhra Pradesh", country: "India" },
      "Lakshmipuram, Guntur, Andhra Pradesh, India",
    );
    expect(out.short).toBe("Lakshmipuram");
  });
});

describe("formatBigDataPlace", () => {
  it("joins locality, city, state and country for the full name", () => {
    const out = formatBigDataPlace({
      locality: "Begumpet",
      city: "Hyderabad",
      principalSubdivision: "Telangana",
      countryName: "India",
    });
    expect(out.formatted).toBe("Begumpet, Hyderabad, Telangana, India");
    expect(out.short).toBe("Begumpet, Hyderabad");
  });

  it("degrades to whatever parts exist", () => {
    const out = formatBigDataPlace({ city: "Hyderabad", countryName: "India" });
    expect(out.formatted).toBe("Hyderabad, India");
    expect(out.short).toBe("Hyderabad");
  });
});