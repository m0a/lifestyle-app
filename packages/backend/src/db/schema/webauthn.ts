import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from '../schema';

export const passkeyCredentials = sqliteTable(
  'passkey_credentials',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull().unique(),
    publicKey: text('public_key').notNull(),
    counter: integer('counter').notNull().default(0),
    deviceType: text('device_type').notNull(),
    backedUp: integer('backed_up').notNull().default(0),
    transports: text('transports'),
    name: text('name'),
    lastUsedAt: text('last_used_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_passkey_user_id').on(table.userId),
  })
);

export const webauthnChallenges = sqliteTable(
  'webauthn_challenges',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    challenge: text('challenge').notNull().unique(),
    type: text('type', { enum: ['registration', 'authentication'] }).notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    expiresAtIdx: index('idx_webauthn_challenge_expires').on(table.expiresAt),
  })
);

export type PasskeyCredential = typeof passkeyCredentials.$inferSelect;
export type NewPasskeyCredential = typeof passkeyCredentials.$inferInsert;
export type WebAuthnChallenge = typeof webauthnChallenges.$inferSelect;
export type NewWebAuthnChallenge = typeof webauthnChallenges.$inferInsert;
