import { z } from "zod";
import { remoteBootstrapSchema } from "@/integrations/api/bootstrapContract";

export const userProfileSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1),
  displayName: z.string().min(1),
  telegramUsername: z.string().nullable(),
  languageCode: z.string().optional(),
  avatarUrl: z.string().url().nullable(),
  level: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  xpToNextLevel: z.number().int().positive(),
  lifetimeXp: z.number().int().nonnegative().optional(),
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
  remote: remoteBootstrapSchema.optional(),
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

export const missionStatusSchema = z.enum(["available", "in-progress", "completed", "claimed"]);

export const missionSchema = z.object({
  id: z.enum([
    "visit-dalexio",
    "view-x-update",
    "join-telegram",
    "typing-session",
    "complete-profile",
    "read-season-brief",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  rewardXp: z.number().int().positive(),
  status: missionStatusSchema,
  progress: z.number().nonnegative(),
  target: z.number().positive(),
  category: z.enum(["ecosystem", "social", "skill", "profile", "season"]),
  action: z.enum(["external", "typing", "profile"]),
  href: z.string().url().optional(),
});

export const typingResultSchema = z.object({
  accuracy: z.number().min(0).max(100),
  wpm: z.number().nonnegative(),
  score: z.number().int().nonnegative(),
  completedAt: z.string().datetime(),
});

export const earnHistoryEntrySchema = z.object({
  id: z.string(),
  type: z.enum(["daily", "mission", "typing", "referral", "group", "level", "system"]),
  title: z.string().min(1),
  description: z.string().min(1),
  createdAt: z.string().datetime(),
  xp: z.number().int().positive().optional(),
});

export const earnProgressSchema = z.object({
  missions: z.record(z.string(), missionSchema),
  lastClaimDate: z.string().nullable(),
  streak: z.number().int().nonnegative(),
  lifetimeXp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  levelXp: z.number().int().nonnegative(),
  xpToNextLevel: z.number().int().positive(),
  typingBest: typingResultSchema.nullable(),
  typingAttemptDate: z.string().nullable(),
  typingAttempts: z.array(typingResultSchema),
  referralSent: z.boolean(),
  referralShares: z.number().int().nonnegative(),
  referralCount: z.number().int().nonnegative(),
  verifiedReferrals: z.number().int().nonnegative(),
  referralXpEarned: z.number().int().nonnegative(),
  connectedGroups: z.number().int().nonnegative(),
  activeGroups: z.number().int().nonnegative(),
  groupXpEarned: z.number().int().nonnegative(),
  history: z.array(earnHistoryEntrySchema),
});

export type Mission = z.infer<typeof missionSchema>;
export type TypingResultContract = z.infer<typeof typingResultSchema>;
export type EarnProgress = z.infer<typeof earnProgressSchema>;
