-- Migration 0043: remove email + password auth
--
-- Auth is passkey-only from here on, so password_hash and email_verified have no
-- remaining reader, and the tables that served email verification, email
-- changes, password resets and the send-rate limiter go with them.
--
-- users.email STAYS, deliberately. Dropping it would require rebuilding the
-- table (its UNIQUE constraint creates an implicit sqlite_autoindex, and
-- ALTER TABLE DROP COLUMN refuses an indexed column). That rebuild was measured
-- against a local copy of this schema and it DESTROYS DATA: weight_records,
-- meal_records, exercise_records, passkey_credentials, mcp_tokens and
-- webauthn_challenges all reference users(id) ON DELETE CASCADE, D1 runs with
-- foreign_keys enabled, and `PRAGMA defer_foreign_keys` does NOT survive
-- wrangler's statement-at-a-time migration runner — every child row was deleted.
-- A dead column is a far smaller cost than that risk, so the column is kept and
-- only its contents are neutralised below.
--
-- password_hash and email_verified have no such problem: DROP COLUMN rewrites
-- rows in place without touching foreign keys. email_verified's index must go
-- first, since DROP COLUMN refuses an indexed column.
ALTER TABLE users DROP COLUMN password_hash;

DROP INDEX IF EXISTS idx_users_email_verified_created;
ALTER TABLE users DROP COLUMN email_verified;

-- Neutralise the addresses. The real ones are personal data with no remaining
-- purpose; the synthetic value only exists to satisfy NOT NULL + UNIQUE on
-- inserts. display_name (backfilled in 0042) is the human-readable field now.
-- .invalid is reserved by RFC 2606 and can never resolve or be delivered to.
UPDATE users SET email = id || '@passkey.invalid';

-- idx_user_email served login-by-email lookups; nothing looks up by address any
-- more. The UNIQUE autoindex cannot be dropped and is left in place.
DROP INDEX IF EXISTS idx_user_email;

DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS email_change_requests;
DROP TABLE IF EXISTS email_delivery_logs;
DROP TABLE IF EXISTS email_rate_limits;
