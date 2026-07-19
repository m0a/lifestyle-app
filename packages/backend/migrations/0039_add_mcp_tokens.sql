-- Migration 0039: MCP access tokens (personal, passkey-gated issuance)
--
-- Long-lived bearer tokens for remote MCP clients (e.g. headless Claude Code)
-- to authenticate to /api/mcp. Only the SHA-256 hash is stored so a leaked DB
-- cannot be replayed; `prefix` is the first plain chars for UI display only.
-- Individually revocable via revoked_at (no secret rotation needed).
--
-- Follows passkey_credentials (schema/webauthn.ts): TEXT id PK (exposed in the
-- revoke API), TEXT ISO8601 timestamps, per-user cascade delete.
CREATE TABLE IF NOT EXISTS mcp_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  prefix TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_token_hash ON mcp_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_token_user_id ON mcp_tokens(user_id);
