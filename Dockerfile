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
  echo "🔄 Waiting for database..."\n\
  \n\
  # Wait for database to be ready (max 30 seconds)\n\
  for i in 1 2 3 4 5 6; do\n\
    python -c "from database import check_connection; exit(0 if check_connection() else 1)" 2>/dev/null\n\
    if [ $? -eq 0 ]; then\n\
      echo "✅ Database connection successful"\n\
      echo "📋 Initializing database tables..."\n\
      python database/init_db.py 2>&1 | grep -E "✅|❌|Database"\n\
      break\n\
    fi\n\
    echo "   Attempt $i/6 - retrying in 5s..."\n\
    sleep 5\n\
  done\n\
fi\n\
\n\
echo ""\n\
echo "🌐 Starting server on port ${PORT:-8000}..."\n\
exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}\n\
' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
