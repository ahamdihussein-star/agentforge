# 🗄️ AgentForge Database Migration Guide

## 📋 Overview

This guide explains how to migrate AgentForge from file-based storage (JSON) to database-backed storage with support for multiple database types.

## 🎯 Benefits

- ✅ **Scalable**: Handle thousands of users, agents, and conversations
- ✅ **ACID Compliance**: Guaranteed data consistency
- ✅ **Concurrent Access**: Multiple users without conflicts
- ✅ **Backup & Recovery**: Industry-standard tools
- ✅ **Query Performance**: Indexed searches and joins
- ✅ **Multi-Database Support**: PostgreSQL, MySQL, SQLite, SQL Server, Oracle

## 🚀 Quick Start

### 1. Choose Your Database

**For Development/Testing:**
```bash
# SQLite (no setup required)
DB_TYPE=sqlite
SQLITE_PATH=data/agentforge.db
```

**For Production (Recommended):**
```bash
# PostgreSQL
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agentforge
DB_USER=agentforge
DB_PASSWORD=your_secure_password
```

### 2. Start Database (Docker)

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Verify it's running
docker-compose ps
```

### 3. Generate Encryption Key

```bash
# Generate encryption key for sensitive data
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Add to .env
ENCRYPTION_KEY=your_generated_key_here
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Initialize Database

```bash
# Create tables
python -m database.init_db

# Verify
python -m database.check_connection
```

### 6. Migrate Data (Optional)

```bash
# Migrate existing JSON data to database
python scripts/migrate_to_db.py

# Options:
# --dry-run: Preview without changing anything
# --backup: Create backup before migration
# --skip-existing: Skip records that already exist
```

## 🔧 Configuration

### Supported Databases

#### PostgreSQL (Recommended)
```bash
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agentforge
DB_USER=agentforge
DB_PASSWORD=your_password
DB_SSL_MODE=require  # Use SSL/TLS
```

#### MySQL
```bash
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=agentforge
DB_USER=agentforge
DB_PASSWORD=your_password
```

#### SQLite (Development)
```bash
DB_TYPE=sqlite
SQLITE_PATH=data/agentforge.db
```

#### SQL Server
```bash
DB_TYPE=sqlserver
DB_HOST=localhost
DB_PORT=1433
DB_NAME=agentforge
DB_USER=agentforge
DB_PASSWORD=your_password
```

#### Oracle
```bash
DB_TYPE=oracle
DB_HOST=localhost
DB_PORT=1521
DB_NAME=agentforge
DB_USER=agentforge
DB_PASSWORD=your_password
```

### Connection Pooling

```bash
DB_POOL_SIZE=20          # Number of connections to keep open
DB_MAX_OVERFLOW=10       # Max connections beyond pool_size
DB_POOL_TIMEOUT=30       # Seconds to wait for connection
DB_POOL_RECYCLE=3600     # Recycle connections after (seconds)
```

## 🔄 Migration Strategy (Parallel Run)

### Phase 1: Dual Write (2 weeks)
- Write to both JSON and Database
- Read from Database (fallback to JSON if needed)
- Zero downtime
- Easy rollback

### Phase 2: Database Primary (1 week)
- Read only from Database
- JSON as backup only
- Monitor for issues

### Phase 3: Complete Migration (1 week)
- Remove JSON file operations
- Database only
- Cleanup old code

## 🗃️ Database Schema

### Core Tables

**Users & Authentication:**
- `users` - User accounts
- `user_sessions` - Active sessions
- `mfa_settings` - MFA configuration
- `password_history` - Password change audit

**Roles & Permissions:**
- `roles` - Role definitions
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mapping
- `user_roles` - User-role assignments

**Organizations:**
- `organizations` - Organization/tenant data
- `departments` - Department structure
- `groups` - User groups

**Agents:**
- `agents` - Agent definitions
- `agent_versions` - Version history
- `agent_tools` - Tool assignments

**Tools:**
- `tools` - Tool configurations
- `tool_permissions` - Access control

**Knowledge Base:**
- `documents` - Uploaded documents
- `document_chunks` - Chunked content with embeddings

**Conversations:**
- `conversations` - Chat sessions
- `messages` - Chat messages
- `attachments` - File attachments

**Security:**
- `audit_logs` - All user actions
- `security_events` - Security incidents
- `oauth_configs` - OAuth providers
- `ldap_configs` - LDAP/AD settings
- `api_keys` - API key management

**Settings:**
- `system_settings` - Global settings (encrypted)
- `org_settings` - Per-organization settings
- `user_preferences` - User preferences

## 🔒 Security Features

### Encryption at Rest
- **Passwords**: bcrypt hashing
- **API Keys**: AES-256 encryption
- **Secrets**: Fernet encryption
- **Tokens**: SHA-256 hashing

### Row-Level Security
- Multi-tenant isolation
- Organization-based access control
- Automatic filtering by org_id

### Audit Logging
- All data modifications logged
- Who, what, when, where
- IP address and user agent tracking

## 📊 Performance

### Indexing Strategy
```sql
-- Critical indexes created automatically
users(email)
users(org_id, email)
audit_logs(user_id, created_at)
document_chunks(tool_id, embedding_vector)
messages(conversation_id, created_at)
```

### Query Optimization
- Connection pooling
- Prepared statements
- Query result caching
- Lazy loading relationships

## 🛠️ Management Tools

### Database CLI
```bash
# Check connection
python -m database.check

# Create tables
python -m database.init

# Run migrations
alembic upgrade head

# Create migration
alembic revision --autogenerate -m "description"

# Rollback
alembic downgrade -1
```

### Backup & Restore
```bash
# PostgreSQL
pg_dump agentforge > backup.sql
psql agentforge < backup.sql

# MySQL
mysqldump agentforge > backup.sql
mysql agentforge < backup.sql

# SQLite
cp data/agentforge.db data/agentforge.backup.db
```

## 🚨 Troubleshooting

### Connection Issues
```bash
# Test connection
python -c "from database import check_connection; check_connection()"

# Check logs
docker-compose logs postgres

# Verify credentials
psql -h localhost -U agentforge -d agentforge
```

### Migration Issues
```bash
# Dry run first
python scripts/migrate_to_db.py --dry-run

# Create backup
python scripts/migrate_to_db.py --backup

# Check for conflicts
python scripts/migrate_to_db.py --check
```

## 📈 Monitoring

### Health Checks
- Database connection pool status
- Query performance metrics
- Storage usage
- Index efficiency

### Alerts
- Connection pool exhaustion
- Slow queries (>1s)
- Failed transactions
- Storage > 80%

## 🔄 Rollback Plan

If issues occur, rollback is simple:

1. Stop application
2. Revert code to previous version
3. Application reads from JSON files again
4. Investigate and fix issues
5. Try migration again

## 📞 Support

- **Documentation**: `/docs/database/`
- **Issues**: GitHub Issues
- **Slack**: #database-migration

---

**Status**: ✅ Ready for Phase 1 (Dual Write)
**Next Steps**: Initialize database and start parallel run

