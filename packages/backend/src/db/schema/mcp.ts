/**
 * MCP access token schema (Drizzle ORM).
 *
 * Personal, long-lived bearer tokens used by remote MCP clients (e.g. a headless
 * Claude Code) to authenticate to `/api/mcp`. Issuance is gated by a fresh
 * passkey (WebAuthn) step-up in the web app; the token itself then carries every
 * MCP request with no further interactive auth.
 *
 * Only the SHA-256 hash of the token is stored (like the email/password token
 * family) — a leaked DB cannot be replayed. `prefix` keeps the first few plain
 * characters purely so the UI can show which token is which. Tokens are
 * individually revocable via `revoked_at` (no secret rotation needed).
 *
 * Datetime convention (#105): timestamps here are TEXT ISO8601, matching the
 * closest analog table `passkey_credentials` (schema/webauthn.ts) — both are
 * per-user auth rows surfaced in the settings UI with a name + last_used_at.
 * Primary-key convention (#106): TEXT (nanoid), because the id is exposed to the
 * client in the revoke API (`DELETE /api/mcp/tokens/:id`).
 */
import { sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from '../schema';

export const mcpTokens = sqliteTable(
  'mcp_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    name: text('name'),
    prefix: text('prefix').notNull(),
    lastUsedAt: text('last_used_at'),
    revokedAt: text('revoked_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('idx_mcp_token_hash').on(table.tokenHash),
    userIdIdx: index('idx_mcp_token_user_id').on(table.userId),
  })
);

export type McpToken = typeof mcpTokens.$inferSelect;
export type NewMcpToken = typeof mcpTokens.$inferInsert;
