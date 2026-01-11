# 🎯 Quick Test Guide

## Test 1: SQLite (Fastest)

```bash
# 1. Install dependencies
pip install sqlalchemy psycopg2-binary cryptography sqlalchemy-utils

# 2. Set environment
export DB_TYPE=sqlite
export SQLITE_PATH=data/test.db
export ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# 3. Initialize database
python3 database/init_db.py

# 4. Test (Python)
python3 << EOF
from database import get_db_session, check_connection
from database.models import User, Organization

# Check connection
print("Testing connection...")
assert check_connection(), "Connection failed!"
print("✅ Connection successful!")

# Create test organization
with get_db_session() as db:
    org = Organization(name="Test Org", slug="test-org")
    db.add(org)
    db.commit()
    print(f"✅ Created organization: {org.name}")
    
    # Create test user
    user = User(
        email="admin@test.com",
        password_hash="dummy_hash",
        first_name="Admin",
        org_id=org.id
    )
    db.add(user)
    db.commit()
    print(f"✅ Created user: {user.email}")

print("\n🎉 All tests passed!")
EOF
```

## Test 2: API Health Check

```bash
# 1. Start server (in another terminal)
uvicorn api.main:app --reload

# 2. Test health endpoint
curl http://localhost:8000/api/health/db | jq

# Expected output:
# {
#   "status": "healthy",
#   "database": {
#     "type": "sqlite",
#     "connected": true,
#     ...
#   }
# }
```

## Test 3: PostgreSQL (Production-like)

```bash
# 1. Start PostgreSQL
docker-compose -f docker-compose.demo.yml up -d postgres

# 2. Wait for it
sleep 5

# 3. Set environment
export DB_TYPE=postgresql
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=agentforge
export DB_USER=agentforge
export DB_PASSWORD=agentforge_demo_password
export ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# 4. Initialize
python3 database/init_db.py

# 5. Verify with psql
docker exec -it agentforge-demo-postgres psql -U agentforge -d agentforge -c "\dt"
```

---

**Status**: Ready for testing! 🚀

