import { z } from "zod";

export const matchSettingsSchema = z.object({
  goalLimit: z.number().int().positive(),
  timeLimitMinutes: z.number().int().positive(),
  goldenGoal: z.boolean(),
});

export const createFriendlyInputSchema = z.object({
  groupId: z.string().min(1),
  pairAName: z.string().min(1),
  pairBName: z.string().min(1),
  pairAGoalkeeperId: z.string().min(1),
  pairAAttackerId: z.string().min(1),
  pairBGoalkeeperId: z.string().min(1),
  pairBAttackerId: z.string().min(1),
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
