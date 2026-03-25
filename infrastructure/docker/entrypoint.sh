#!/bin/bash
set -e

# Match PUID/PGID from environment so the app user can access host-mounted volumes
PUID=${PUID:-1001}
PGID=${PGID:-1001}

echo "[entrypoint] Configuring user: PUID=$PUID PGID=$PGID (current: uid=$(id -u appuser) gid=$(getent group nodejs | cut -d: -f3))"

# Remove any existing user/group that conflicts with the target PUID/PGID
EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1 2>/dev/null || true)
if [ -n "$EXISTING_USER" ] && [ "$EXISTING_USER" != "appuser" ]; then
  echo "[entrypoint] Removing conflicting user $EXISTING_USER (uid=$PUID)"
  userdel "$EXISTING_USER" 2>/dev/null || true
fi
EXISTING_GROUP=$(getent group "$PGID" | cut -d: -f1 2>/dev/null || true)
if [ -n "$EXISTING_GROUP" ] && [ "$EXISTING_GROUP" != "nodejs" ]; then
  echo "[entrypoint] Removing conflicting group $EXISTING_GROUP (gid=$PGID)"
  groupdel "$EXISTING_GROUP" 2>/dev/null || true
fi

if [ "$(getent group nodejs | cut -d: -f3)" != "$PGID" ]; then
  groupmod -g "$PGID" nodejs || echo "[entrypoint] WARNING: failed to set GID to $PGID"
fi
if [ "$(id -u appuser)" != "$PUID" ]; then
  usermod -u "$PUID" -g "$PGID" appuser || echo "[entrypoint] WARNING: failed to set UID to $PUID"
fi

echo "[entrypoint] Running as: uid=$(id -u appuser) gid=$(id -g appuser) groups=$(id -G appuser)"

# Ensure data directories are writable
chown -R appuser:nodejs /data 2>/dev/null || true
chown -R appuser:nodejs /exports 2>/dev/null || true

# Ensure Next.js cache directory is writable
mkdir -p /app/apps/web/.next/standalone/apps/web/.next/cache 2>/dev/null || true
chown -R appuser:nodejs /app/apps/web/.next/standalone/apps/web/.next/cache 2>/dev/null || true

# Ensure mounted media directories are writable
for dir in /library-local /media /library; do
  if [ -d "$dir" ]; then
    chown -R appuser:nodejs "$dir" 2>/dev/null || echo "[entrypoint] WARNING: cannot chown $dir (may be owned by host)"
  fi
done

echo "[entrypoint] Starting Next.js web server..."
runuser -u appuser -- node apps/web/.next/standalone/apps/web/server.js &
WEB_PID=$!

# Wait for the web server to be ready before starting the worker
echo "[entrypoint] Waiting for web server to be ready..."
until node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 1
done
echo "[entrypoint] Web server is ready"

echo "[entrypoint] Starting worker..."
runuser -u appuser -- node apps/worker/dist/index.js &
WORKER_PID=$!

# Forward signals to both processes
trap 'kill $WEB_PID $WORKER_PID 2>/dev/null; wait $WEB_PID $WORKER_PID 2>/dev/null' SIGTERM SIGINT

# Wait for either process to exit — if one dies, stop the other
wait -n $WEB_PID $WORKER_PID 2>/dev/null
EXIT_CODE=$?
echo "[entrypoint] A process exited (code=$EXIT_CODE), shutting down..."
kill $WEB_PID $WORKER_PID 2>/dev/null || true
wait $WEB_PID $WORKER_PID 2>/dev/null || true
exit $EXIT_CODE
