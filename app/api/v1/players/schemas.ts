import { z } from "zod";

export const playerProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  initials: z.string().trim().min(1).max(4),
  avatarUrl: z.string().trim().url().max(2048).optional(),
  avatarPresetId: z.string().trim().min(1).max(80).optional(),
  shirtNumber: z.number().int().min(0).max(99),
  favoritePosition: z.enum(["goalkeeper", "attacker", "versatile"]),
  style: z.string().trim().max(80),
  nationality: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(500),
});

export const playersQuerySchema = z.object({
  groupId: z.string().trim().min(1).optional(),
});
