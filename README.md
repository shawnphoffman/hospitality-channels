# Hospitality Channels

Self-hosted TV channel management for hospitality environments. Create template-driven video clips, compose them into programs with background audio, render to MP4, and publish to [Tunarr](https://github.com/chrisbenincasa/tunarr) channels.

## How It Works

**Clips** are individual video pages built from templates (welcome screens, house guides, etc.) with customizable fields like guest names, WiFi credentials, and background images.

**Programs** compose one or more clips together with audio tracks into a single video. Duration is either set manually or derived from the total audio length, split evenly across clips.

**Publishing** renders a program into an MP4 (headless Chromium screenshots + FFmpeg stitching) and copies it to a configured export path. Multiple publish profiles allow exporting to different locations.

**Tunarr integration** pushes published artifacts to Tunarr channels. The system scans the Tunarr media library to index the file, enriches it with metadata (title, description, artwork, duration), and updates the channel programming.

## Getting Content to Tunarr

There are two workflows:

1. **Program editor** — Save & Publish directly from the program page. After rendering completes, push to a Tunarr channel from the inline push panel.

2. **Channels page** — Bind a Tunarr channel to a program with a push mode (replace or append). After publishing, hit "Push Now" to update the channel with the latest artifact.

Both paths go through the same render → publish → scan → push pipeline.

## Architecture

| Component              | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `apps/web`             | Next.js 14 admin UI + API (App Router, RSC)          |
| `apps/worker`          | Background job processor (render, publish)           |
| `packages/publish`     | Artifact publishing + Tunarr API client              |
| `packages/render-core` | Chromium screenshot capture + FFmpeg video stitching |
| `packages/templates`   | Template registry and schema definitions             |
| `packages/common`      | Shared constants, logger, paths                      |
| `packages/storage`     | Asset storage utilities                              |

## Core Concepts

| Concept             | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| **Template**        | A visual layout with a schema of editable fields               |
| **Clip**            | An instance of a template with specific field values           |
| **Program**         | An ordered set of clips + audio tracks rendered as one video   |
| **Publish Profile** | An export destination (path + file naming pattern)             |
| **Channel**         | A binding between a Tunarr channel and a program               |
| **Asset**           | An uploaded image or audio file used across clips and programs |

## Tech Stack

- Next.js 14 (App Router), React 18, Tailwind CSS
- SQLite via libsql + Drizzle ORM
- Chromium (Playwright) for page capture
- FFmpeg for video encoding and audio concatenation
- pnpm workspaces + Turborepo

## Getting Started

```sh
pnpm install
pnpm turbo build
pnpm --filter @hospitality-channels/web dev
```

## Docker

A single container runs both the web server and worker.

```sh
docker compose up -d
```

## Configuration

Settings are managed through the web UI at `/settings`:

- **Tunarr URL** — Base URL of your Tunarr instance
- **Tunarr Media Path** — Filesystem path where Tunarr can access exported videos
