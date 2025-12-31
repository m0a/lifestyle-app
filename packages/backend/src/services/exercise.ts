import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';
import type { CreateExerciseInput, UpdateExerciseInput } from '@lifestyle-app/shared';

export class ExerciseService {
  constructor(private db: Database) {}

  async create(userId: string, input: CreateExerciseInput) {
    const now = new Date().toISOString();
    const id = uuidv4();

    await this.db.insert(schema.exerciseRecords).values({
      id,
      userId,
      exerciseType: input.exerciseType,
      durationMinutes: input.durationMinutes,
      recordedAt: input.recordedAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      exerciseType: input.exerciseType,
      durationMinutes: input.durationMinutes,
      recordedAt: input.recordedAt,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(id: string, userId: string) {
    const record = await this.db
      .select()
      .from(schema.exerciseRecords)
      .where(eq(schema.exerciseRecords.id, id))
      .get();

    if (!record) {
      throw new AppError('運動記録が見つかりません', 404, 'EXERCISE_NOT_FOUND');
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
    const records = await this.db
      .select()
      .from(schema.exerciseRecords)
      .where(eq(schema.exerciseRecords.userId, userId))
      .orderBy(desc(schema.exerciseRecords.recordedAt))
      .all();

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

  async getWeeklySummary(userId: string) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const exercises = await this.findByUserId(userId, {
      startDate: startOfWeek.toISOString(),
      endDate: endOfWeek.toISOString(),
    });

    const totalMinutes = exercises.reduce((sum, e) => sum + e.durationMinutes, 0);
    const count = exercises.length;

    const byType = exercises.reduce(
      (acc, e) => {
        acc[e.exerciseType] = (acc[e.exerciseType] || 0) + e.durationMinutes;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalMinutes,
      count,
      byType,
      weekStart: startOfWeek.toISOString(),
      weekEnd: endOfWeek.toISOString(),
    };
  }

  async getSummary(
    userId: string,
    options?: { startDate?: string; endDate?: string }
  ) {
    const exercises = await this.findByUserId(userId, options);

    const totalMinutes = exercises.reduce((sum, e) => sum + e.durationMinutes, 0);
    const count = exercises.length;

    const byType = exercises.reduce(
      (acc, e) => {
        acc[e.exerciseType] = (acc[e.exerciseType] || 0) + e.durationMinutes;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalMinutes,
      count,
      byType,
    };
  }

  async update(id: string, userId: string, input: UpdateExerciseInput) {
    await this.findById(id, userId);

    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (input.exerciseType !== undefined) {
      updateData.exerciseType = input.exerciseType;
    }

    if (input.durationMinutes !== undefined) {
      updateData.durationMinutes = input.durationMinutes;
    }

    if (input.recordedAt !== undefined) {
      updateData.recordedAt = input.recordedAt;
    }

    await this.db
      .update(schema.exerciseRecords)
      .set(updateData)
      .where(eq(schema.exerciseRecords.id, id));

    return this.findById(id, userId);
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);

    await this.db.delete(schema.exerciseRecords).where(eq(schema.exerciseRecords.id, id));
  }
}
