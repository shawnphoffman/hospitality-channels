# Hospitality Channels

Self-hosted TV channel management for hospitality environments. Create template-driven video clips, compose them into programs with background audio, render to MP4, and publish to [Tunarr](https://github.com/chrisbenincasa/tunarr) channels.

## How It Works

**Templates** provide visual layouts (welcome screens, daily agendas, local info, amenities, checkout, emergency info, etc.) with editable fields and optional background images.

**Clips** are instances of a template with specific field values — guest names, Wi-Fi credentials, schedules, photos, and more.

**Programs** compose one or more clips together with audio tracks into a single video. Duration is either set manually or derived from the total audio length, with an optional minimum clip duration to control pacing.

**Publishing** renders a program into an MP4 via headless Chromium screenshots + FFmpeg stitching, then copies it to a configured export path. Multiple publish profiles allow exporting to different locations simultaneously.

**Tunarr integration** pushes published artifacts to Tunarr channels. The system scans the Tunarr media library to index the file, enriches it with metadata (title, description, artwork, duration), and updates the channel programming.

## Quick Start

### Docker (recommended)

A single container runs both the web server and background worker. Pre-built images are available from the GitHub Container Registry.

```sh
docker compose up -d
```

Or run directly:

```sh
docker run -d -p 3000:3000 -v app-data:/data -v exports:/exports ghcr.io/shawnphoffman/hospitality-channels:latest
```

The web UI is available at `http://localhost:3000`.

See [`docker-compose.yml`](docker-compose.yml) for configuration options. Key environment variables:

| Variable | Default | Description                   |
| -------- | ------- | ----------------------------- |
| `PORT`   | `3000`  | Web server port               |
| `TZ`     | `UTC`   | Timezone                      |
| `PUID`   | `1000`  | User ID for file permissions  |
| `PGID`   | `1000`  | Group ID for file permissions |

#### Volumes

| Mount            | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `/data`          | SQLite database, uploaded assets, cover art         |
| `/exports`       | Rendered MP4 artifacts                              |
| `/library-local` | Optional: shared media directory readable by Tunarr |

### Development

```sh
pnpm install
pnpm turbo build
pnpm --filter @hospitality-channels/web dev
```

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

| Concept             | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| **Template**        | A visual layout with a schema of editable fields and optional background image |
| **Clip**            | An instance of a template with specific field values                           |
| **Program**         | An ordered set of clips + audio tracks rendered as one video                   |
| **Publish Profile** | An export destination (path + file naming pattern)                             |
| **Artifact**        | A rendered MP4 output from a published program or clip                         |
| **Channel**         | A binding between a Tunarr channel and a program for one-click publishing      |
| **Asset**           | An uploaded image or audio file used across clips and programs                 |

## Built-in Templates

- **Welcome** — Personalized guest welcome with Wi-Fi QR code
- **Hotel Welcome** — Full-bleed background image with guest name overlay
- **House Guide** — Wi-Fi, house rules, and general info
- **Daily Agenda** — Up to 4 scheduled items with times and descriptions
- **Local Info** — Switchable layouts (photo left, photo right, two-row)
- **Amenities** — Property facilities with hours, details, and photos
- **Checkout** — Checkout time, policies, and contact info
- **Contact Directory** — Phone directory with up to 6 entries
- **Emergency Info** — Emergency number, contacts, and safety information

All templates support optional background images with automatic frosted-glass content overlays, background audio, and basic markdown in text fields.

## Configuration

Settings are managed through the web UI at `/settings`:

- **Tunarr URL** — Base URL of your Tunarr instance
- **Tunarr Media Library** — Which library to scan when pushing artifacts
- **Tunarr Media Path** — Filesystem path where Tunarr can access exported videos
- **Publish Profiles** — Export destinations with path and naming patterns
- **NFO Generation** — Toggle `.nfo` sidecar file creation

## Tech Stack

- Next.js 14 (App Router), React 18, Tailwind CSS
- SQLite via libsql + Drizzle ORM
- Chromium (Playwright) for page capture
- FFmpeg for video encoding and audio processing
- pnpm workspaces + Turborepo
- Docker with built-in healthchecks

## License

MIT
