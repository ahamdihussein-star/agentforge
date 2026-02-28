"""Allow shared user emails

- Add security_settings.allow_shared_emails (org-scoped toggle)
- Drop UNIQUE constraint / unique index on users.email (so multiple independent users can share the same email)

Revision ID: 009
Revises: 008
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers
revision = "009_allow_shared_emails"
down_revision = "008_identity_fields"
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


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    # --- security_settings.allow_shared_emails ---
    if dialect == "postgresql":
        if not _col_exists(conn, "security_settings", "allow_shared_emails"):
            op.execute(
                text(
                    "ALTER TABLE security_settings "
                    "ADD COLUMN allow_shared_emails BOOLEAN DEFAULT FALSE"
                )
            )
    else:
        try:
            op.add_column(
                "security_settings",
                sa.Column("allow_shared_emails", sa.Boolean(), nullable=True, server_default=sa.text("0")),
            )
        except Exception:
            pass

    # --- Drop UNIQUE on users.email ---
    # Note: different DBs / naming conventions can create either:
    # - a UNIQUE constraint (e.g., users_email_key)
    # - a UNIQUE index
    if dialect == "postgresql":
        # Drop UNIQUE constraints that include the email column
        try:
            rows = conn.execute(
                text(
                    """
                    SELECT DISTINCT c.conname
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
                    WHERE t.relname = 'users'
                      AND c.contype = 'u'
                      AND a.attname = 'email'
                    """
                )
            ).fetchall()
            for (conname,) in rows:
                op.execute(text(f'ALTER TABLE users DROP CONSTRAINT IF EXISTS "{conname}"'))
        except Exception:
            # Best effort; continue to indexes
            pass

        # Drop UNIQUE indexes on (email)
        try:
            rows = conn.execute(
                text(
                    """
                    SELECT indexname
                    FROM pg_indexes
                    WHERE tablename = 'users'
                      AND indexdef ILIKE '%unique%'
                      AND indexdef ILIKE '%(email)%'
                    """
                )
            ).fetchall()
            for (idxname,) in rows:
                op.execute(text(f'DROP INDEX IF EXISTS "{idxname}"'))
        except Exception:
            pass


def downgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    # Remove allow_shared_emails column
    try:
        op.drop_column("security_settings", "allow_shared_emails")
    except Exception:
        pass

    # Best-effort re-add UNIQUE constraint on users.email.
    # This will fail if duplicates already exist, so we only attempt it on PostgreSQL and ignore failures.
    if dialect == "postgresql":
        try:
            dup = conn.execute(
                text(
                    """
                    SELECT email
                    FROM users
                    GROUP BY email
                    HAVING COUNT(*) > 1
                    LIMIT 1
                    """
                )
            ).fetchone()
            if dup is None:
                op.execute(text('ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)'))
        except Exception:
            pass
