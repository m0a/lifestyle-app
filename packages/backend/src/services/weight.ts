import { eq, desc, and, gte, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { extractLocalDate, nextLocalDate } from '../lib/localDate';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';
import type { CreateWeightInput, UpdateWeightInput } from '@lifestyle-app/shared';

export class WeightService {
  constructor(private db: Database) {}

  async create(userId: string, input: CreateWeightInput) {
    const now = new Date().toISOString();
    const id = uuidv4();

    await this.db.insert(schema.weightRecords).values({
      id,
      userId,
      weight: input.weight,
      recordedAt: input.recordedAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      weight: input.weight,
      recordedAt: input.recordedAt,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(id: string, userId: string) {
    const record = await this.db
      .select()
      .from(schema.weightRecords)
      .where(eq(schema.weightRecords.id, id))
      .get();

    if (!record) {
      throw new AppError('体重記録が見つかりません', 404, 'WEIGHT_NOT_FOUND');
    }

    if (record.userId !== userId) {
      throw new AppError('この記録にアクセスする権限がありません', 403, 'FORBIDDEN');
    }

    return record;
  }

  async findByUserId(
    userId: string,
    options?: { startDate?: string; endDate?: string; limit?: number }
  ) {
    // Push filters into SQL so the idx_weight_user_date range scan is used
    // instead of fetching the user's whole history and filtering in JS (#103).
    // Filter by LOCAL date (gte(extractLocalDate(start)) + lt(nextLocalDate(end)))
    // — this both enables the index AND fixes the previous full-string compare,
    // which excluded same-day records when end was a bare "YYYY-MM-DD" date.
    const conditions = [eq(schema.weightRecords.userId, userId)];
    if (options?.startDate) {
      conditions.push(gte(schema.weightRecords.recordedAt, extractLocalDate(options.startDate)));
    }
    if (options?.endDate) {
      conditions.push(lt(schema.weightRecords.recordedAt, nextLocalDate(options.endDate)));
    }

    const baseQuery = this.db
      .select()
      .from(schema.weightRecords)
      .where(and(...conditions))
      .orderBy(desc(schema.weightRecords.recordedAt));

    return options?.limit
      ? await baseQuery.limit(options.limit).all()
      : await baseQuery.all();
  }

  async update(id: string, userId: string, input: UpdateWeightInput) {
    // First check if record exists and belongs to user
    await this.findById(id, userId);

    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (input.weight !== undefined) {
      updateData['weight'] = input.weight;
    }

    if (input.recordedAt !== undefined) {
      updateData['recordedAt'] = input.recordedAt;
    }

    // Scope by userId as well (defense in depth, #130): findById above already
    // guarantees ownership, but the SQL itself should never be able to touch
    // another user's row.
    await this.db
      .update(schema.weightRecords)
      .set(updateData)
      .where(and(eq(schema.weightRecords.id, id), eq(schema.weightRecords.userId, userId)));

    return this.findById(id, userId);
  }

  async delete(id: string, userId: string) {
    // First check if record exists and belongs to user
    await this.findById(id, userId);

    await this.db
      .delete(schema.weightRecords)
      .where(and(eq(schema.weightRecords.id, id), eq(schema.weightRecords.userId, userId)));
  }

  async getLatest(userId: string) {
    const records = await this.db
      .select()
      .from(schema.weightRecords)
      .where(eq(schema.weightRecords.userId, userId))
      .orderBy(desc(schema.weightRecords.recordedAt))
      .limit(1)
      .all();

    return records[0] || null;
  }
}
