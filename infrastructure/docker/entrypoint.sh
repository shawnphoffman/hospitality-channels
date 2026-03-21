#!/bin/bash
set -e

# Ensure data directories are writable
chown -R appuser:nodejs /data 2>/dev/null || true
chown -R appuser:nodejs /exports 2>/dev/null || true

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
