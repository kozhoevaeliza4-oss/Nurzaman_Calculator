#!/bin/sh
# Container entrypoint for platforms without shell/SSH access (e.g. Render
# free tier): run pending migrations, optionally seed the first director
# account, then start the API. Both steps are idempotent.
set -e

echo "Running database migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/data-source.js

if [ -n "$DIRECTOR_EMAIL" ] && [ -n "$DIRECTOR_PASSWORD" ]; then
  echo "Ensuring director account exists..."
  node dist/seed/seed-director.js
fi

echo "Starting server..."
exec node dist/main.js
