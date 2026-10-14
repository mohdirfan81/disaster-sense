import { describe, expect, it } from "vitest";
import {
  buildShareMessage,
  isValidPhone,
  normalizePhone,
  parseContacts,
  smsLink,
  telLink,
  isAppleDevice,
  whatsappLink,
  MAX_CONTACTS,
} from "@/lib/contacts";
import {
  googleMapsDirectionsUrl,
  googleMapsPinUrl,
  googleMapsSharePinUrl,
} from "@/lib/google-maps";

describe("phone helpers", () => {
  it("strips formatting but keeps a leading +", () => {
    expect(normalizePhone("+91 90000 10001")).toBe("+919000010001");
    expect(normalizePhone("(040) 555-1234")).toBe("0405551234");
  });

  it("rejects too-short or too-long numbers", () => {
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("+91 90000 10001")).toBe(true);
    expect(isValidPhone("1".repeat(16))).toBe(false);
  });
});

describe("parseContacts", () => {
  it("drops malformed entries and keeps valid ones", () => {
    const raw = JSON.stringify([
      { id: "a", name: "Asha", phone: "+91 90000 10001" },
      { id: "b", name: "Bad", phone: "12" },
      "nonsense",
      null,
    ]);
    const parsed = parseContacts(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Asha");
    expect(parsed[0].phone).toBe("+919000010001");
  });

  it("survives corrupted storage", () => {
    expect(parseContacts("{not json")).toEqual([]);
    expect(parseContacts(null)).toEqual([]);
    expect(parseContacts("\"string\"")).toEqual([]);
  });

  it("caps the contact list", () => {
    const many = Array.from({ length: MAX_CONTACTS + 3 }, (_, i) => ({
      id: `c${i}`,
      name: `Contact ${i}`,
      phone: `+91900001000${i}`,
    }));
    expect(parseContacts(JSON.stringify(many))).toHaveLength(MAX_CONTACTS);
  });
});

describe("share message", () => {
  it("includes coordinates, timestamp context, map link and a disclaimer", () => {
    const msg = buildShareMessage({
      coordinates: { lat: 17.385, lng: 78.4867 },
      timestamp: Date.UTC(2026, 9, 10, 8, 30),
      accuracyM: 12,
      shareUrl: "https://www.google.com/maps?q=17.385000,78.486700",
    });
    expect(msg).toContain("17.38500, 78.48670");
    expect(msg).toContain("±12m");
    expect(msg).toContain("https://www.google.com/maps?q=");
    expect(msg).toContain("not an official alert");
  });

  it("mentions the shelter when one is known", () => {
    const msg = buildShareMessage({
      coordinates: { lat: 17.385, lng: 78.4867 },
      timestamp: Date.now(),
      accuracyM: 5,
      shelterName: "Central School Shelter",
      shelterCoordinates: { lat: 17.3712, lng: 78.4745 },
      shareUrl: "https://www.google.com/maps?q=17.385000,78.486700",
    });
    expect(msg).toContain("Central School Shelter");
    expect(msg).toContain("17.37120, 78.47450");
  });

  it("includes the reverse-geocoded place name when one is known", () => {
    const msg = buildShareMessage({
      coordinates: { lat: 17.385, lng: 78.4867 },
      timestamp: Date.now(),
      accuracyM: 5,
      placeName: "Begumpet, Hyderabad, Telangana, India",
      shareUrl: "https://www.google.com/maps?q=17.385000,78.486700",
    });
    expect(msg).toContain("Place: Begumpet, Hyderabad, Telangana, India");
  });
});

describe("sms / tel links", () => {
 it("url-encodes the body", () => {
    expect(smsLink("+91 90000 10001", "help me & locate")).toBe(
      "sms:+919000010001?body=help%20me%20%26%20locate",
    );
  });

 it("normalizes dial numbers", () => {
    expect(telLink("+91 90000 10001")).toBe("tel:+919000010001");
  });

  it("uses the ampersand body separator on Apple devices", () => {
    expect(smsLink("+91 90000 10001", "help me", true)).toBe(
      "sms:+919000010001&body=help%20me",
    );
  });

  it("detects Apple user agents", () => {
    expect(
      isAppleDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"),
    ).toBe(true);
    expect(
      isAppleDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36"),
    ).toBe(false);
  });

  it("builds a WhatsApp link with the plus sign stripped", () => {
    expect(whatsappLink("+91 90000 10001", "help me")).toBe(
      "https://wa.me/919000010001?text=help%20me",
    );
  });
});

describe("google maps urls", () => {
  it("builds a driving directions link with both endpoints", () => {
    const url = googleMapsDirectionsUrl(
      { lat: 17.385, lng: 78.4867 },
      { lat: 17.3712, lng: 78.4745 },
      "driving",
    );
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://www.google.com/maps/dir/");
    expect(parsed.searchParams.get("api")).toBe("1");
    expect(parsed.searchParams.get("origin")).toBe("17.385000,78.486700");
    expect(parsed.searchParams.get("destination")).toBe("17.371200,78.474500");
    expect(parsed.searchParams.get("travelmode")).toBe("driving");
  });

  it("builds pin and share links that contain the coordinates", () => {
    const pin = new URL(googleMapsPinUrl({ lat: 1, lng: 2 }, "Shelter"));
    expect(pin.searchParams.get("query")).toBe("Shelter@1.000000,2.000000");
    expect(googleMapsSharePinUrl({ lat: 1, lng: 2 })).toBe("https://www.google.com/maps?q=1.000000,2.000000");
  });
});