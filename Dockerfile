# syntax=docker/dockerfile:1

# =============================================================================
# Telegram Mini App — production image for Coolify (or any Docker host)
#
# One service serves both the React SPA (dist/public) and the Express/tRPC API
# (dist/index.js) on a single port. Package manager is pnpm (pinned via the
# `packageManager` field) and there is a pnpm patch for `wouter`, so we install
# with the lockfile + the patches/ directory.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — builder: install all deps and build client + server
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

# Install dependencies first for better layer caching.
# patches/ is required because package.json declares a pnpm patch for wouter.
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# Copy the rest of the source.
COPY . .

# Client-side (VITE_*) variables are baked in at build time. All are optional —
# pass them via Coolify "Build Variables" or `docker build --build-arg`.
ARG VITE_APP_URL
ARG VITE_APP_ID
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_FRONTEND_FORGE_API_KEY
ARG VITE_FRONTEND_FORGE_API_URL
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID
ENV VITE_APP_URL=$VITE_APP_URL \
    VITE_APP_ID=$VITE_APP_ID \
    VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL \
    VITE_FRONTEND_FORGE_API_KEY=$VITE_FRONTEND_FORGE_API_KEY \
    VITE_FRONTEND_FORGE_API_URL=$VITE_FRONTEND_FORGE_API_URL \
    VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT \
    VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID

# `pnpm build` = vite build (-> dist/public) + esbuild (-> dist/index.js)
RUN pnpm build

# -----------------------------------------------------------------------------
# Stage 2 — runner: minimal runtime with the build output
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# node_modules is needed at runtime because the server is bundled with
# `--packages=external`, and drizzle-kit (used by the entrypoint to run
# migrations) lives in node_modules as well.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY package.json pnpm-lock.yaml ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

# Runs pending DB migrations (if DATABASE_URL is set) then starts the server.
ENTRYPOINT ["./docker-entrypoint.sh"]
