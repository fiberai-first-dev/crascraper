#!/usr/bin/env bash
set -euo pipefail

DUMP="${1:-crascraper.sql}"
if [[ ! -f "$DUMP" ]]; then
  echo "Dump not found: $DUMP"
  echo "Usage: ./scripts/restore-catalog.sh crascraper.sql"
  exit 1
fi

echo "Restoring $DUMP into postgres..."
docker compose cp "$DUMP" postgres:/tmp/crascraper.sql
docker compose exec -T postgres psql -U crafter -d crafter -v ON_ERROR_STOP=1 -f /tmp/crascraper.sql
echo "Restore finished. Restarting API..."
docker compose restart backend
