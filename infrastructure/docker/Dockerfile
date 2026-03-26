# =============================================================================
# Unified Dockerfile: Next.js web server + worker (Playwright/FFmpeg) in one
# =============================================================================

# --- Base with system deps for Chromium + FFmpeg ---
FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Install dependencies (cached unless lockfile/package.json changes) ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/common/package.json packages/common/
COPY packages/content-model/package.json packages/content-model/
COPY packages/storage/package.json packages/storage/
COPY packages/templates/package.json packages/templates/
COPY packages/render-core/package.json packages/render-core/
COPY packages/publish/package.json packages/publish/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

# --- Build both web and worker ---
FROM base AS builder
COPY --from=deps /app ./
COPY . .
RUN mkdir -p /data && touch /data/guest-tv-pages.db && \
    pnpm run build --filter=@hospitality-channels/web --filter=@hospitality-channels/worker

# Copy static assets and public files into the standalone output where Next.js expects them
RUN cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static && \
    cp -r apps/web/public apps/web/.next/standalone/apps/web/public

# Slim down: remove source files, docs, build caches
RUN rm -rf .turbo apps/worker/src packages/*/src docs .github .git

# --- Production runner ---
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser && \
    usermod -aG nodejs appuser

RUN mkdir -p /data /exports && chown -R appuser:nodejs /data /exports

# Copy full built workspace (worker runtime deps via pnpm, plus standalone web server)
COPY --from=builder --chown=appuser:nodejs /app ./

# Install Playwright Chromium to a shared path (appuser has HOME=/nonexistent)
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN pnpm --filter @hospitality-channels/render-core exec playwright install chromium

# Copy the entrypoint
COPY infrastructure/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV WEB_URL=http://localhost:3000

HEALTHCHECK --interval=5m --timeout=10s --retries=5 --start-period=1m \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
