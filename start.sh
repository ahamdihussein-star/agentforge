#!/bin/sh
set -eu

echo "🚀 Starting AgentForge..."
echo ""

if [ -z "${DATABASE_URL:-}" ]; then
  echo "⚠️  DATABASE_URL not set - using file-based storage"
else
  echo "📊 Database connection detected"
  echo "🔄 Waiting for PostgreSQL to be ready..."

  MAX_ATTEMPTS="${AF_DB_MAX_ATTEMPTS:-15}"
  SLEEP_TIME="${AF_DB_SLEEP_SECONDS:-6}"

  i=1
  while [ "$i" -le "$MAX_ATTEMPTS" ]; do
    ERROR_OUTPUT="$(python3 -c "from database import check_connection; import sys; sys.exit(0 if check_connection() else 1)" 2>&1 || true)"
    if python3 -c "from database import check_connection; import sys; sys.exit(0 if check_connection() else 1)" >/dev/null 2>&1; then
      echo "✅ Database connection successful"
      echo "📋 Initializing database tables..."
      python3 database/init_db.py 2>&1 || echo "⚠️  init_db.py completed with warnings"
      echo ""

      echo "🔧 Creating any missing tables..."
      python3 scripts/create_missing_tables.py 2>&1 || echo "⚠️  create_missing_tables had warnings"
      echo ""

      echo "🔧 Updating schema (idempotent)..."
      python3 scripts/add_user_columns.py 2>&1 || echo "⚠️  add_user_columns had warnings"
      python3 scripts/make_password_hash_nullable.py 2>&1 || echo "⚠️  password_hash nullable script had warnings"
      python3 scripts/add_role_columns.py 2>&1 || echo "⚠️  add_role_columns had warnings"
      python3 scripts/add_organization_oauth_columns.py 2>&1 || echo "⚠️  org OAuth columns script had warnings"
      python3 scripts/add_identity_columns.py 2>&1 || echo "⚠️  identity columns script had warnings"
      echo ""

      # -------------------------------------------------------------------
      # Heavy one-time bootstrap tasks (guarded)
      # -------------------------------------------------------------------
      echo "🔎 Checking if DB bootstrap is needed..."
      NEEDS_BOOTSTRAP="0"
      if python3 - <<'PY' >/dev/null 2>&1
import os
from database.base import get_db_session
from database.models.organization import Organization

with get_db_session() as s:
    count = s.query(Organization).count()
print(count)
PY
      then
        ORG_COUNT="$(python3 - <<'PY'
from database.base import get_db_session
from database.models.organization import Organization
with get_db_session() as s:
    print(s.query(Organization).count())
PY
        )"
        if [ "${ORG_COUNT:-0}" = "0" ]; then
          NEEDS_BOOTSTRAP="1"
        fi
      fi

      if [ "${AF_BOOTSTRAP_FROM_JSON:-}" = "1" ] || [ "$NEEDS_BOOTSTRAP" = "1" ]; then
        echo "📦 Bootstrapping data from JSON → Database (one-time)..."
        python3 scripts/migrate_to_db_complete.py 2>&1 || echo "⚠️  migrate_to_db_complete had warnings"
        echo ""
      else
        echo "✅ DB already has organizations; skipping JSON→DB bootstrap"
        echo ""
      fi

      if [ "${AF_SEED_GOOGLE_OAUTH:-}" = "1" ]; then
        echo "🔧 Seeding Google OAuth credentials..."
        python3 scripts/add_google_oauth_credentials.py 2>&1 || echo "⚠️  Google OAuth credentials script failed (may already be set)"
        echo ""
      fi

      if [ "${AF_FIX_ENUMS:-}" = "1" ]; then
        echo "🔧 Converting ENUMs to VARCHAR (database-agnostic)..."
        python3 scripts/fix_all_enums_to_string.py 2>&1 || echo "⚠️  Some ENUM conversions had issues (may already be VARCHAR)"
        echo ""
      fi

      break
    fi

    if [ "$i" -eq "$MAX_ATTEMPTS" ]; then
      echo "❌ Database connection failed after ${MAX_ATTEMPTS} attempts"
      echo "   Last error: ${ERROR_OUTPUT}"
      echo "⚠️  Starting in file-based mode..."
    else
      echo "   Attempt $i/$MAX_ATTEMPTS - retrying in ${SLEEP_TIME}s..."
      sleep "$SLEEP_TIME"
    fi

    i=$((i + 1))
  done
fi

echo ""
echo "🌐 Starting server on port ${PORT:-8000}..."
exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}"

