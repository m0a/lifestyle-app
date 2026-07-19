/**
 * MCP access token service.
 *
 * Issues and verifies personal bearer tokens used by remote MCP clients to
 * authenticate to `/api/mcp`. The raw token is shown to the user exactly once at
 * creation; only its SHA-256 hash is stored (reusing services/token/crypto), so
 * a leaked DB cannot be replayed. Tokens are individually revocable.
 *
 * The token carries no per-request interactive auth — issuance itself is gated
 * by a passkey step-up in the token API route (routes/mcp-tokens.ts).
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db';
import { schema } from '../db';
import { generateSecureToken, hashToken } from './token/crypto';

/** Prefix that marks a string as an MCP token (also aids quick rejection). */
const TOKEN_PREFIX = 'mcp_';
/** How many leading chars of the raw token to keep in plaintext for UI display. */
const DISPLAY_PREFIX_LEN = 12;

export interface CreatedMcpToken {
  id: string;
  /** Plaintext token — returned only here, never stored or shown again. */
  token: string;
  name: string | null;
  prefix: string;
  createdAt: string;
}

export interface McpTokenSummary {
  id: string;
  name: string | null;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Mint a new token for `userId` and persist only its hash. */
export async function createMcpToken(
  db: Database,
  userId: string,
  name?: string | null
): Promise<CreatedMcpToken> {
  const raw = `${TOKEN_PREFIX}${await generateSecureToken()}`;
  const tokenHash = await hashToken(raw);
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const prefix = raw.slice(0, DISPLAY_PREFIX_LEN);

  await db.insert(schema.mcpTokens).values({
    id,
    userId,
    tokenHash,
    name: name ?? null,
    prefix,
    lastUsedAt: null,
    revokedAt: null,
    createdAt,
  });

  return { id, token: raw, name: name ?? null, prefix, createdAt };
}

/**
 * Resolve a raw bearer token to its owning userId, or null if the token is
 * malformed, unknown, or revoked. Best-effort-updates last_used_at.
 */
export async function verifyMcpToken(db: Database, rawToken: string): Promise<string | null> {
  if (!rawToken.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  const tokenHash = await hashToken(rawToken);
  const row = await db
    .select()
    .from(schema.mcpTokens)
    .where(eq(schema.mcpTokens.tokenHash, tokenHash))
    .get();

  if (!row || row.revokedAt) {
    return null;
  }

  await db
    .update(schema.mcpTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(schema.mcpTokens.id, row.id))
    .run();

  return row.userId;
}

/** List a user's tokens (secret hash never included), newest first. */
export async function listMcpTokens(db: Database, userId: string): Promise<McpTokenSummary[]> {
  const rows = await db
    .select()
    .from(schema.mcpTokens)
    .where(eq(schema.mcpTokens.userId, userId))
    .orderBy(desc(schema.mcpTokens.createdAt))
    .all();

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    lastUsedAt: r.lastUsedAt,
    revokedAt: r.revokedAt,
    createdAt: r.createdAt,
  }));
}

/**
 * Revoke an active token owned by `userId`. Returns false when no active token
 * matched (unknown id, not owner, or already revoked) so the route can 404.
 */
export async function revokeMcpToken(
  db: Database,
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .update(schema.mcpTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(
      and(
        eq(schema.mcpTokens.id, id),
        eq(schema.mcpTokens.userId, userId),
        isNull(schema.mcpTokens.revokedAt)
      )
    )
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
