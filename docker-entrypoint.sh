#!/bin/sh
# Container entrypoint: apply DB migrations (best-effort) then start the server.
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "==> Running database migrations (drizzle-kit migrate)..."
  # Only applies the committed migration files under drizzle/.
  # The DB container may still be booting when we start, so retry a few
  # times before giving up. Non-fatal: the app degrades gracefully when
  # the DB is unavailable, so we still start the server on failure.
  attempt=1
  max_attempts=5
  until ./node_modules/.bin/drizzle-kit migrate; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "==> Migration failed after $max_attempts attempts; continuing to start server."
      break
    fi
    echo "==> Migration attempt $attempt failed (DB not ready?); retrying in 3s..."
    attempt=$((attempt + 1))
    sleep 3
  done
else
  echo "==> DATABASE_URL not set; skipping migrations (persistence features disabled)."
fi

echo "==> Starting server..."
exec node dist/index.js
