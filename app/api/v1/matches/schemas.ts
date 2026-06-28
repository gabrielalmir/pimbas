import { z } from "zod";

export const goalSchema = z.object({
  playerId: z.string().min(1),
  ownGoal: z.boolean().optional(),
});
