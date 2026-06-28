# syntax=docker/dockerfile:1

# Build from the repository root:
#   docker build -t pimbas .
#
# Single Next.js app — pages and the API (app/api/**) are the same deployment,
# no separate backend service. This Dockerfile exists for self-hosting outside
# Vercel (e.g. Fly.io); Vercel deploys this same app without Docker at all.
# Uses Next.js "standalone" output (see next.config.ts) for a lean runtime image.

FROM oven/bun:1-slim AS base
WORKDIR /app

# ---------- deps: full install for the build stage ----------
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------- build: Prisma client + Next.js standalone build ----------
FROM deps AS build
COPY . .
RUN bun run db:generate && bun run build

# ---------- runner ----------
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone output (already pruned to runtime-only deps).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Prisma schema/migrations for the migrate-deploy release step.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "server.js"]
