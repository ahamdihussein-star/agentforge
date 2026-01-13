FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Playwright dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (Chromium only to save space)
RUN playwright install chromium

# Copy application
COPY . .

# Create directories
RUN mkdir -p /app/data /app/uploads

# Create startup script that initializes database
RUN echo '#!/bin/sh\n\
echo "🚀 Starting AgentForge..."\n\
echo ""\n\
# Check if DATABASE_URL is set\n\
if [ -z "$DATABASE_URL" ]; then\n\
  echo "⚠️  DATABASE_URL not set - using file-based storage"\n\
else\n\
  echo "📊 Database connection detected"\n\
  echo "🔄 Waiting for PostgreSQL to be ready..."\n\
  \n\
  # Extract host and port from DATABASE_URL for pg_isready check\n\
  DB_HOST=$(echo $DATABASE_URL | sed -n "s|.*@\\([^:]*\\):.*|\\1|p")\n\
  DB_PORT=$(echo $DATABASE_URL | sed -n "s|.*:\\([0-9]*\\)/.*|\\1|p")\n\
  \n\
  # Wait for PostgreSQL to accept connections (max 90 seconds)\n\
  MAX_ATTEMPTS=15\n\
  SLEEP_TIME=6\n\
  \n\
  for i in $(seq 1 $MAX_ATTEMPTS); do\n\
    # Try simple connection test with error output\n\
    ERROR_OUTPUT=$(python -c "from database import check_connection; import sys; result = check_connection(); sys.exit(0 if result else 1)" 2>&1)\n\
    \n\
    if [ $? -eq 0 ]; then\n\
      echo "✅ Database connection successful"\n\
      echo "📋 Initializing database tables..."\n\
      python database/init_db.py 2>&1 | grep -E "✅|❌|Database"\n\
      echo ""\n\
      echo "🔧 Fixing tools table (removing PostgreSQL enum)..."\n\
      python scripts/fix_tools_table.py 2>&1\n\
      echo ""\n\
      echo "🔧 Adding missing columns to users table..."\n\
      python scripts/add_user_columns.py 2>&1\n\
      echo ""\n\
      echo "🔧 Adding missing columns to roles table..."\n\
      python scripts/add_role_columns.py 2>&1\n\
      echo ""\n\
      echo "📦 Migrating data from JSON to Database..."\n\
      python scripts/migrate_to_db_complete.py 2>&1\n\
      echo ""\n\
      echo "🔄 Updating user role_ids (Issue #19 fix)..."\n\
      python scripts/update_user_role_ids.py 2>&1\n\
      echo ""\n\
      echo "🔧 Fixing user roles (ensuring Super Admin role assigned)..."\n\
      python scripts/fix_user_roles.py 2>&1\n\
     echo ""\n\
     echo "🧹 Cleaning up duplicate roles (SMART VERSION - keeps best role)..."\n\
     python scripts/cleanup_duplicate_roles_v2.py 2>&1\n\
     echo ""\n\
     echo "🔧 Fixing Super Admin permissions..."\n\
     python scripts/fix_super_admin_permissions.py 2>&1\n\
     echo ""\n\
     echo "🔍 Diagnosing roles issue (checking why only 1 role visible)..."\n\
     python scripts/diagnose_roles_issue.py 2>&1\n\
     echo ""\n\
     break\n\
    fi\n\
    \n\
    if [ $i -eq $MAX_ATTEMPTS ]; then\n\
      echo "❌ Database connection failed after ${MAX_ATTEMPTS} attempts"\n\
      echo "   Database URL host: $DB_HOST:$DB_PORT"\n\
      echo "   Last error: $ERROR_OUTPUT"\n\
      echo "⚠️  Starting in file-based mode..."\n\
    else\n\
      echo "   Attempt $i/$MAX_ATTEMPTS - retrying in ${SLEEP_TIME}s..."\n\
      sleep $SLEEP_TIME\n\
    fi\n\
  done\n\
fi\n\
\n\
echo ""\n\
echo "🌐 Starting server on port ${PORT:-8000}..."\n\
exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}\n\
' > /app/start.sh && chmod +x /app/start.sh

# Railway uses dynamic PORT, but expose common default
EXPOSE 8000
EXPOSE 8080

CMD ["/app/start.sh"]
