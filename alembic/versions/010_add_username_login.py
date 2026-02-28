"""Add username login identifier

- Add users.username (org-scoped unique)
- Backfill usernames for existing users
- Add unique constraint on (org_id, username)

Revision ID: 010
Revises: 009
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import re

# revision identifiers
revision = "010_add_username_login"
down_revision = "009_allow_shared_emails"
branch_labels = None
depends_on = None


def _col_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    )
    return result.fetchone() is not None


def _sanitize_username(raw: str) -> str:
    s = (raw or "").strip().lower()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9._-]", "", s)
    s = s.strip("._-")
    return s


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    # 1) Add column
    if dialect == "postgresql":
        if not _col_exists(conn, "users", "username"):
            op.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(120)"))
            op.execute(text("CREATE INDEX IF NOT EXISTS ix_users_username ON users (username)"))
    else:
        try:
            op.add_column("users", sa.Column("username", sa.String(120), nullable=True))
        except Exception:
            pass

    # 2) Backfill usernames for existing users
    try:
        rows = conn.execute(
            text("SELECT id, org_id, email FROM users WHERE username IS NULL OR username = ''")
        ).fetchall()
    except Exception:
        rows = []

    # Track per-org used usernames (best effort, avoids collisions)
    used = {}
    for row in rows:
        uid = str(row[0])
        org_id = str(row[1]) if row[1] is not None else ""
        email = str(row[2] or "")

        base = ""
        if email and "@" in email:
            base = _sanitize_username(email.split("@")[0])
        if not base:
            base = "user"

        if base == "admin" and uid != "user_super_admin":
            base = "admin_user"

        key = org_id or "_"
        if key not in used:
            used[key] = set()

        candidate = base
        # Ensure non-empty and not too long
        if not candidate:
            candidate = "user"
        candidate = candidate[:80]

        # Collision handling
        if candidate in used[key]:
            suffix = uid.replace("-", "")[-4:] if uid else "0000"
            candidate = f"{candidate}_{suffix}"[:120]
        counter = 2
        while candidate in used[key]:
            candidate = f"{base}_{counter}"[:120]
            counter += 1

        used[key].add(candidate)

        try:
            conn.execute(
                text("UPDATE users SET username = :u WHERE id = :id"),
                {"u": candidate, "id": uid},
            )
        except Exception:
            # Best effort
            pass

    # 3) Unique constraint (org_id, username)
    if dialect == "postgresql":
        try:
            op.execute(text("ALTER TABLE users ADD CONSTRAINT users_org_username_key UNIQUE (org_id, username)"))
        except Exception:
            # Might already exist or duplicates remain; keep best-effort.
            pass
    else:
        try:
            op.create_unique_constraint("users_org_username_key", "users", ["org_id", "username"])
        except Exception:
            pass


def downgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    # Drop unique constraint
    try:
        op.drop_constraint("users_org_username_key", "users", type_="unique")
    except Exception:
        pass

    # Drop index
    try:
        op.drop_index("ix_users_username", table_name="users")
    except Exception:
        pass

    # Drop column
    try:
        op.drop_column("users", "username")
    except Exception:
        pass
