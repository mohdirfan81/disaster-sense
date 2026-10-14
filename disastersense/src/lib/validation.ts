import { z } from "zod";

/** Shared validation schemas for the API surface. */

const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const reportCreateSchema = z.object({
  reportKind: z.enum(["incident", "missing_person"]).optional().default("incident"),
  reporterName: z.string().trim().min(1, "Name is required").max(120),
  reporterContact: z.string().trim().max(60).optional().default(""),
  disasterType: z.enum(["flood", "fire", "earthquake", "cyclone", "industrial", "medical", "other"]),
  description: z.string().trim().min(10, "Please describe the situation (min 10 characters)").max(2000),
  address: z.string().trim().max(300).optional().default(""),
  coordinates: coordinatesSchema,
  severity: z.enum(["low", "medium", "high", "critical"]),
  peopleAffected: z.number().int().min(0).max(100000).default(0),
  mediaUrls: z.array(z.string().url()).max(5).optional().default([]),
  contactNumber: z.string().trim().max(30).optional().default(""),
  isSos: z.boolean().optional().default(false),
  isSimulation: z.boolean().optional().default(false),
}).transform((data) =>
  // Server-side SOS rule: an SOS report is processed and stored as critical
  // no matter what severity the client declared (the browser checkbox is UX only).
  data.isSos ? { ...data, severity: "critical" as const } : data,
);

export const incidentFilterSchema = z.object({
  disasterType: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  search: z.string().max(120).optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["new", "analyzing", "awaiting_approval", "dispatched", "in_progress", "resolved"]),
});

export const approveSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  operatorName: z.string().trim().max(120).optional().default("Control room"),
  note: z.string().trim().max(500).optional().default(""),
});
