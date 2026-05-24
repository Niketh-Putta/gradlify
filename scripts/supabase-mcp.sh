#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$ROOT/.env" ]]; then
  echo "Missing $ROOT/.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required in .env}"
: "${VITE_SUPABASE_PROJECT_ID:?VITE_SUPABASE_PROJECT_ID is required in .env}"

exec npx -y @supabase/mcp-server-supabase@latest \
  --access-token "$SUPABASE_ACCESS_TOKEN" \
  --project-ref "$VITE_SUPABASE_PROJECT_ID"
