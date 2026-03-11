# Docker Deployment

## Quick Start

```bash
cd infrastructure/docker
docker compose up -d --build
```

The management UI runs on port **3000**. The worker starts automatically once the web service is healthy.

## Environment Variables

Set in `docker-compose.yml` or override with a `.env` file alongside it.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `/data/guest-tv-pages.db` | SQLite database path |
| `ASSET_STORAGE_PATH` | `/data/assets` | Uploaded asset storage |
| `EXPORT_PATH` | `/data/exports` | Published file output |
| `RENDER_OUTPUT_DIR` | `/data/renders` | Rendered video storage |
| `WEB_URL` | `http://web:3000` | Worker → web URL (set by compose) |
| `POLL_INTERVAL_MS` | `2000` | Worker job poll interval |

## Dockhand (Git Deploy)

Push this repo to your Dockhand remote. It will detect `infrastructure/docker/docker-compose.yml`.

```bash
git remote add dockhand ssh://deploy@<server>/hospitality-channels.git
git push dockhand main
```

If Dockhand expects the compose file at the repo root, set its config to point to `infrastructure/docker/docker-compose.yml`, or symlink it.

## Volumes

- **app-data** — database, assets, and renders (persist across deploys)
- **exports** — published output files
