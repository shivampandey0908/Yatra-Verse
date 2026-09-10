import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  USE_DEVELOPMENT_PROVIDERS: z.coerce.boolean().default(false),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().min(3).optional()
});

export const env = schema.parse(process.env);
