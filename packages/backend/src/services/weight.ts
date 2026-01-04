import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
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
    const query = this.db
      .select()
      .from(schema.weightRecords)
      .where(eq(schema.weightRecords.userId, userId))
      .orderBy(desc(schema.weightRecords.recordedAt));

    // Note: For D1/SQLite, complex queries need to be built differently
    // This is a simplified version
    const records = await query.all();

    let filtered = records;

    if (options?.startDate) {
      filtered = filtered.filter((r) => r.recordedAt >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter((r) => r.recordedAt <= options.endDate!);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
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

    await this.db
      .update(schema.weightRecords)
      .set(updateData)
      .where(eq(schema.weightRecords.id, id));

    return this.findById(id, userId);
  }

  async delete(id: string, userId: string) {
    // First check if record exists and belongs to user
    await this.findById(id, userId);

    await this.db.delete(schema.weightRecords).where(eq(schema.weightRecords.id, id));
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
