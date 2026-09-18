#!/bin/sh
# Container entrypoint for platforms without shell/SSH access (e.g. Render
# free tier): run pending migrations, optionally seed the admin account,
# then start the API. Both steps are idempotent.
set -e

echo "Running database migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/data-source.js

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "Ensuring admin account exists..."
  node dist/seed/seed-admin.js
fi

echo "Starting server..."
exec node dist/main.js
