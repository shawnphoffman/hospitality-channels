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
| `WEB_URL` | `http://web:3000` | Worker → web URL (set by compose) |
| `POLL_INTERVAL_MS` | `2000` | Worker job poll interval |

Data paths (`DATABASE_URL`, `ASSET_STORAGE_PATH`, renders, exports) are not configurable via environment variables. They are determined by `NODE_ENV`:

- **production**: database at `/data/guest-tv-pages.db`, assets at `/data/assets`, renders at `/data/renders`, exports at `/exports`
- **development**: relative paths under the project root

## Dockhand (Git Deploy)

Push this repo to your Dockhand remote. It will detect `infrastructure/docker/docker-compose.yml`.

```bash
git remote add dockhand ssh://deploy@<server>/hospitality-channels.git
git push dockhand main
```

If Dockhand expects the compose file at the repo root, set its config to point to `infrastructure/docker/docker-compose.yml`, or symlink it.

## Volumes

- **app-data** (`/data`) — database, assets, and intermediate renders (persist across deploys)
- **exports** (`/exports`) — published video output for external consumers (e.g. Tunarr)
