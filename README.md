# Hospitality Channels

A self-hosted system for creating, rendering, and publishing TV channel pages for hospitality environments (hotel rooms, vacation rentals, etc.).

## What it does

- **Template-driven pages** — Create guest-facing display pages from templates (welcome screens, house guides, etc.)
- **Video rendering** — Pages are rendered into video files using headless Chromium + FFmpeg
- **Publishing** — Rendered videos can be published to configured output profiles
- **Asset management** — Upload and organize images used across pages

## Architecture

Monorepo with two apps and shared packages:

- `apps/web` — Next.js admin UI + API server
- `apps/worker` — Background job processor (render & publish)
- `packages/` — Shared libraries (templates, content model, render core, etc.)

## Getting started

```sh
pnpm install
cp .env.example .env
pnpm dev
```

## Docker

A single container runs both the web server and worker.

```sh
docker compose up -d
```
