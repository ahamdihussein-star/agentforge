#!/bin/bash
# Quick Demo Setup Script

echo "🚀 AgentForge Database Demo Setup"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.demo .env
    
    # Generate encryption key
    echo "🔐 Generating encryption key..."
    ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    
    # Update .env with generated key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/ENCRYPTION_KEY=REPLACE_WITH_GENERATED_KEY/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    else
        # Linux
        sed -i "s/ENCRYPTION_KEY=REPLACE_WITH_GENERATED_KEY/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    fi
    
    echo "✅ .env file created with encryption key"
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "Choose database option:"
echo "1) SQLite (fastest, no Docker)"
echo "2) PostgreSQL (production-like, requires Docker)"
read -p "Enter choice [1]: " choice
choice=${choice:-1}

if [ "$choice" = "2" ]; then
    echo ""
    echo "🐳 Starting PostgreSQL container..."
    docker-compose -f docker-compose.demo.yml up -d postgres
    
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
    
    # Update .env for PostgreSQL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's/^DB_TYPE=sqlite/DB_TYPE=postgresql/' .env
        sed -i '' 's/^# DB_HOST=/DB_HOST=/' .env
    else
        sed -i 's/^DB_TYPE=sqlite/DB_TYPE=postgresql/' .env
        sed -i 's/^# DB_HOST=/DB_HOST=/' .env
    fi
    
    echo "✅ PostgreSQL started"
else
    echo "✅ Using SQLite (no Docker needed)"
fi

echo ""
echo "📦 Installing Python dependencies..."
pip install -q sqlalchemy alembic psycopg2-binary cryptography sqlalchemy-utils

echo ""
echo "🗄️  Initializing database..."
python3 database/init_db.py

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================="
    echo "✅ Setup Complete!"
    echo "=================================="
    echo ""
    echo "Next steps:"
    echo "  1. Start server:"
    echo "     uvicorn api.main:app --reload"
    echo ""
    echo "  2. Check database health:"
    echo "     curl http://localhost:8000/api/health/db"
    echo ""
    echo "  3. Access UI:"
    echo "     http://localhost:8000/ui"
    echo ""
    
    if [ "$choice" = "2" ]; then
        echo "  4. pgAdmin (optional):"
        echo "     docker-compose -f docker-compose.demo.yml --profile admin up -d pgadmin"
        echo "     http://localhost:5050"
        echo ""
    fi
else
    echo "❌ Setup failed. Please check the error above."
    exit 1
fi

