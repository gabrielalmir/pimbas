import { z } from "zod";

export const matchSettingsSchema = z.object({
  goalLimit: z.number().int().min(1),
  timeLimitMinutes: z.number().int().min(1),
  goldenGoal: z.boolean(),
});

export const createFriendlyInputSchema = z.object({
  groupId: z.string(),
  pairA: z.any(),
  pairB: z.any(),
  settings: matchSettingsSchema,
});

export const manualPairInputSchema = z.object({
  name: z.string().min(1),
  goalkeeperId: z.string().min(1),
  attackerId: z.string().min(1),
});

export const createTournamentInputSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1),
  settings: matchSettingsSchema,
  playerIds: z.array(z.string().min(1)).optional(),
  manualPairs: z.array(manualPairInputSchema).optional(),
});
