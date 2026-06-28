import { z } from "zod";

export const patchMeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    // avatarUrl is validated here but never fetched server-side — the client provides its own URL
    // (e.g. a CDN link). The server must NOT fetch this URL to avoid SSRF.
    avatarUrl: z.string().trim().url().max(2048).startsWith("https://").optional(),
  })
  .strict();
