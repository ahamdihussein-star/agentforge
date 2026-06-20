#!/usr/bin/env python3
"""
AgentForge - reset TEST DATA (agents, tools, knowledge, conversations, process runs)
while KEEPING users, roles, organizations, and all settings.

SAFETY:
- Dry-run by default: prints row counts and exits. Nothing is deleted.
- Real delete requires:  --confirm   AND typing the confirmation phrase.
- Wrapped in a single transaction (all-or-nothing).
- BACK UP FIRST (this is irreversible). For Railway Postgres:
      pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M).sql

USAGE:
    python scripts/reset_test_data.py            # dry-run: show what WOULD be deleted
    python scripts/reset_test_data.py --confirm  # actually delete (asks to type a phrase)

After deleting, RESTART the Railway service (or redeploy) so the in-memory
cache (app_state.agents) reloads empty from the database.
"""

import os
import sys

# --- Tables to DELETE (test content). Order doesn't matter: TRUNCATE ... CASCADE. ---
DELETE_TABLES = [
    # agents and everything attached to an agent
    "agents",
    "agent_access_policies",
    "agent_data_policies",
    "agent_action_policies",
    "agent_deployments",
    "end_user_sessions",
    # conversations / chat
    "conversations",
    "messages",
    "conversation_shares",
    # tools
    "tools",
    "tool_executions",
    "tool_permissions",
    "db_permissions",
    # knowledge bases / documents
    "knowledge_bases",
    "documents",
    "document_chunks",
    "kb_queries",
    "kb_permissions",
    # process / workflow runs
    "process_executions",
    "process_node_executions",
    "process_approval_requests",
    # demo lab test data
    "lab_history_items",
    "lab_mock_apis",
]

# --- Tables explicitly KEPT (for transparency; never touched by this script). ---
KEEP_TABLES = [
    "users", "user_sessions", "password_history", "mfa_settings", "user_integrations",
    "roles", "permissions", "role_permissions",
    "organizations", "organization_settings", "departments", "user_groups",
    "system_settings", "security_settings", "email_settings",
    "api_keys", "integrations", "invitations",
    "ldap_configs", "oauth_configs", "policies",
    "audit_logs", "security_events", "compliance_reports", "data_exports",
    "process_node_types", "process_org_settings", "process_templates",
]

CONFIRM_PHRASE = "DELETE TEST DATA"


def _load_database_url():
    url = os.environ.get("DATABASE_URL")
    if not url:
        # Fall back to .env in repo root.
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        env_path = os.path.join(root, ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("DATABASE_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    if not url:
        print("ERROR: DATABASE_URL not found in environment or .env", file=sys.stderr)
        sys.exit(1)
    # SQLAlchemy needs postgresql:// (Railway sometimes gives postgres://)
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


def main():
    confirm = "--confirm" in sys.argv

    try:
        from sqlalchemy import create_engine, text
    except Exception:
        print("ERROR: SQLAlchemy not installed. Run inside the project venv.", file=sys.stderr)
        sys.exit(1)

    engine = create_engine(_load_database_url())

    # Count rows per table (skip tables that don't exist).
    counts = {}
    with engine.connect() as conn:
        existing = set(
            r[0] for r in conn.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
            ))
        )
        total = 0
        for t in DELETE_TABLES:
            if t not in existing:
                counts[t] = None
                continue
            n = conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
            counts[t] = n
            total += n or 0

    print("=" * 60)
    print("WILL DELETE (test data):")
    for t in DELETE_TABLES:
        c = counts[t]
        print(f"  {t:<30} {'(missing)' if c is None else str(c) + ' rows'}")
    print(f"\n  TOTAL rows to delete: {total}")
    print("\nWILL KEEP (untouched): users, roles, organizations, settings, audit, "
          "process config/templates, etc.")
    print("=" * 60)

    if not confirm:
        print("\nDRY-RUN only. Nothing deleted.")
        print("To delete for real:  python scripts/reset_test_data.py --confirm")
        print("BACK UP FIRST:        pg_dump \"$DATABASE_URL\" > backup.sql")
        return

    print(f"\n⚠️  This permanently deletes the above ({total} rows). Cannot be undone.")
    ans = input(f'Type exactly  "{CONFIRM_PHRASE}"  to proceed: ')
    if ans.strip() != CONFIRM_PHRASE:
        print("Phrase did not match. Aborted. Nothing deleted.")
        return

    tables_present = [t for t in DELETE_TABLES if counts[t] is not None]
    with engine.begin() as conn:  # transaction: all-or-nothing
        joined = ", ".join(f'"{t}"' for t in tables_present)
        conn.execute(text(f"TRUNCATE {joined} RESTART IDENTITY CASCADE"))

    print(f"\n✅ Done. Deleted test data from {len(tables_present)} tables.")
    print("Next: RESTART / redeploy the Railway service so the in-memory cache reloads empty.")


if __name__ == "__main__":
    main()
