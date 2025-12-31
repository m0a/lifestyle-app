import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';
import type { RegisterInput, LoginInput } from '@lifestyle-app/shared';

export class AuthService {
  constructor(private db: Database) {}

  async register(input: RegisterInput) {
    // Check if email already exists
    const existing = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, input.email))
      .get();

    if (existing) {
      throw new AppError('このメールアドレスは既に登録されています', 400, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const now = new Date().toISOString();
    const id = uuidv4();

    await this.db.insert(schema.users).values({
      id,
      email: input.email,
      passwordHash,
      goalWeight: input.goalWeight ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      email: input.email,
      goalWeight: input.goalWeight ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async login(input: LoginInput) {
    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, input.email))
      .get();

    if (!user) {
      throw new AppError('メールアドレスまたはパスワードが正しくありません', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('メールアドレスまたはパスワードが正しくありません', 401, 'INVALID_CREDENTIALS');
    }

    return {
      id: user.id,
      email: user.email,
      goalWeight: user.goalWeight,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserById(userId: string) {
    const user = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        goalWeight: schema.users.goalWeight,
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
