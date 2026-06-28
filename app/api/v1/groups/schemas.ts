import { z } from "zod";
import { matchSettingsSchema } from "@/domain";

// defaultMatchSettings usa o mesmo shape de MatchSettings do dominio (goalLimit,
// timeLimitMinutes, goldenGoal), garantindo que o Group serializado bata com o
// tipo consumido pelo frontend.
export const groupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).default(""),
  logoUrl: z.string().trim().url().max(2048).optional(),
  logoPresetId: z.string().trim().max(80).optional(),
  defaultMatchSettings: matchSettingsSchema.default({
    goalLimit: 5,
    timeLimitMinutes: 10,
    goldenGoal: true,
  }),
});

export const joinGroupSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(4)
    .max(32)
    .transform((value) => value.toUpperCase()),
});
