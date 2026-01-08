FROM suna-frontend-base:latest AS base

FROM base AS deps
WORKDIR /app

# For pnpm workspace monorepo, copy from root context
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/ ./packages/

# 缓存 pnpm store，即使 --no-cache 也能复用
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile


# ---- Builder Stage ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=deps /app/packages ./packages
COPY apps/frontend ./apps/frontend

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app/apps/frontend
RUN pnpm run build


# ---- Runner Stage ----
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
COPY --from=builder /app/apps/frontend/public ./public

# Copy standalone output - the entire standalone directory
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./.next/static

# Copy pnpm node_modules structure (needed because standalone uses symlinks)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm ./node_modules/.pnpm

# Create symlink at root level for pnpm symlinks resolution
RUN ln -s /app/node_modules /node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]