<p align="center">
  <img src="logo2c.png" alt="Hospitality Channels" width="200" />
</p>

# Hospitality Channels

Self-hosted TV channel management for hospitality environments. Create template-driven video clips, compose them into programs with background audio, and render to MP4. Use the exported videos however you want — play them on a media player, loop them on a lobby TV, or push them directly to [Tunarr](https://github.com/chrisbenincasa/tunarr) channels with the built-in integration.

## Sample Output

https://github.com/user-attachments/assets/8d8b1187-91cf-469e-8b78-eafacabfb216

## Who Is This For

- Tunarr tinkerers with a guest room IPTV playlist
- Airbnb / VRBO hosts with a media player hooked up to the TV
- Small hotels or B&Bs that want a DIY channel without enterprise software
- Home lab enthusiasts looking for a new project to over-engineer
- Randos with a laptop, a TV, and some free time

## How It Works

**Templates** provide visual layouts (welcome screens, daily agendas, local info, amenities, checkout, emergency info, etc.) with editable fields and optional background images.

**Clips** are instances of a template with specific field values — guest names, Wi-Fi credentials, schedules, photos, and more.

**Programs** compose one or more clips together with audio tracks into a single video. Duration is either set manually or derived from the total audio length, with an optional minimum clip duration to control pacing.

**Publishing** renders a program into an MP4 via headless Chromium screenshots + FFmpeg stitching, then copies it to a configured export path. Multiple publish profiles allow exporting to different locations simultaneously.

**Tunarr integration** pushes published artifacts to Tunarr channels. The system scans the Tunarr media library to index the file, enriches it with metadata (title, description, artwork, duration), and updates the channel programming.

## AI Contribution Disclosure
![Level 6](https://badgen.net/badge/AI%20Assistance/Level%206?color=red)
> [!IMPORTANT]
> This project is an experiment in [Level 6 AI-assisted coding](https://www.visidata.org/blog/2026/ai/) — AI does most of the coding while the human acts as team lead, driving development direction and testing empirically. The author is a seasoned software engineer who steers architecture and reviews results, but defers much of the implementation to AI tooling. This is not production-ready software; it's a hobby project and a learning exercise in pushing the boundaries of AI-assisted development.
>
> **AI Model:** Claude Opus 4

## Quick Start

### Docker (recommended)

A single container runs both the web server and background worker. Pre-built images are available from the GitHub Container Registry.

```sh
docker compose up -d
```

Or run directly:

```sh
docker run -d -p 3000:3000 -v app-data:/data -v exports:/exports ghcr.io/YOUR_ORG/hospitality-channels:latest
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

## Configuration

Settings are managed through the web UI at `/settings`:

- **Tunarr URL** — Base URL of your Tunarr instance
- **Tunarr Media Library** — Which library to scan when pushing artifacts
- **Tunarr Media Path** — Filesystem path where Tunarr can access exported videos
- **Publish Profiles** — Export destinations with path and naming patterns

## License

AGPL-3.0

## More Screenshots and Samples

https://github.com/user-attachments/assets/140825f6-3469-4184-95d7-65a8251e3b4d

<img width="2740" height="2000" alt="Dashboard" src="https://github.com/user-attachments/assets/87cadd81-ae0e-4473-a04c-5686a6707d3c" />

<img width="2740" height="2000" alt="Program Creation" src="https://github.com/user-attachments/assets/62c330d2-d70d-4b6e-a041-e02df69af122" />
