#!/bin/sh
# Container entrypoint: apply DB migrations (best-effort) then start the server.
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "==> Running database migrations (drizzle-kit migrate)..."
  # Only applies the committed migration files (drizzle/0000_*, 0001_*).
  # Non-fatal: if the DB is briefly unreachable we still start the server,
  # since the app degrades gracefully when the DB is unavailable.
  ./node_modules/.bin/drizzle-kit migrate \
    || echo "==> Migration step failed or was skipped; continuing to start server."
else
  echo "==> DATABASE_URL not set; skipping migrations (persistence features disabled)."
fi

echo "==> Starting server..."
exec node dist/index.js
