import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';

/**
 * Account lookup and creation for passkey-only auth.
 *
 * There is no register()/login() here any more: a credential IS the account, so
 * both ceremonies live in routes/auth/webauthn.ts where the WebAuthn
 * verification happens. This service only owns the user row.
 */
export class AuthService {
  constructor(private db: Database) {}

  /**
   * Create an account whose only authenticator is a passkey.
   *
   * displayName is a cosmetic label, not an identifier: it is not unique and
   * nothing is ever looked up by it.
   *
   * The synthetic email exists only to satisfy the dead-but-NOT-NULL email
   * column (see db/schema.ts and migration 0043). It is never read, never shown
   * and, being .invalid (RFC 2606), can never be delivered to.
   */
  async createPasskeyUser(id: string, displayName: string) {
    const now = new Date().toISOString();

    await this.db.insert(schema.users).values({
      id,
      email: `${id}@passkey.invalid`,
      displayName,
      goalWeight: null,
      goalCalories: 2000,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      displayName,
      goalWeight: null,
      goalCalories: 2000,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getUserById(userId: string) {
    const user = await this.db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        goalWeight: schema.users.goalWeight,
        goalCalories: schema.users.goalCalories,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      throw new AppError('ユーザーが見つかりません', 404, 'USER_NOT_FOUND');
    }

    return user;
  }
}
