import { z } from "zod";

export const userRoles = ["traveler", "guide", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  role: z.enum(["traveler", "guide"]).default("traveler")
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
export type LoginInput = z.infer<typeof loginSchema>;

export const destinationQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
});

export const guideQuerySchema = z.object({
  destination: z.string().trim().max(100).optional(),
  language: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
});

export const bookingSchema = z.object({
  guideId: z.string().regex(/^[a-f\d]{24}$/i),
  destinationId: z.string().regex(/^[a-f\d]{24}$/i),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  guests: z.number().int().min(1).max(20),
  note: z.string().trim().max(1000).optional()
});
export type BookingInput = z.infer<typeof bookingSchema>;

export type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };
