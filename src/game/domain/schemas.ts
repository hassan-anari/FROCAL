import { z } from "zod";

export const userProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  telegramUsername: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  level: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  xpToNextLevel: z.number().int().positive(),
  seasonScore: z.number().int().nonnegative(),
  clanId: z.string().nullable(),
});

export const dexoProgressionSchema = z.object({
  stage: z.enum(["newborn", "explorer", "connector", "specialist", "vanguard", "legend"]),
  level: z.number().int().nonnegative(),
  mood: z.enum(["idle", "curious", "happy", "focused", "victory"]),
  unlockedCosmetics: z.array(z.string()),
});

export const bootstrapPayloadSchema = z.object({
  requestId: z.string(),
  serverTime: z.string().datetime(),
  environment: z.enum(["browser", "telegram"]),
  season: z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(["prelaunch", "live", "ended", "maintenance"]),
  }),
  player: userProfileSchema,
  dexo: dexoProgressionSchema,
  featureFlags: z.record(z.string(), z.boolean()),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type DexoProgression = z.infer<typeof dexoProgressionSchema>;
export type BootstrapPayload = z.infer<typeof bootstrapPayloadSchema>;
