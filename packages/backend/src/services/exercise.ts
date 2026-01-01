import { eq, desc, and } from 'drizzle-orm';
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
      muscleGroup: input.muscleGroup ?? null,
      sets: input.sets,
      reps: input.reps,
      weight: input.weight ?? null,
      recordedAt: input.recordedAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      exerciseType: input.exerciseType,
      muscleGroup: input.muscleGroup ?? null,
      sets: input.sets,
      reps: input.reps,
      weight: input.weight ?? null,
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
    options?: { startDate?: string; endDate?: string; limit?: number; exerciseType?: string }
  ) {
    const records = await this.db
      .select()
      .from(schema.exerciseRecords)
      .where(eq(schema.exerciseRecords.userId, userId))
      .orderBy(desc(schema.exerciseRecords.recordedAt))
      .all();

    let filtered = records;

    if (options?.exerciseType) {
      filtered = filtered.filter((r) => r.exerciseType === options.exerciseType);
    }

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

  async getLastByType(userId: string, exerciseType: string) {
    const record = await this.db
      .select()
      .from(schema.exerciseRecords)
      .where(
        and(
          eq(schema.exerciseRecords.userId, userId),
          eq(schema.exerciseRecords.exerciseType, exerciseType)
        )
      )
      .orderBy(desc(schema.exerciseRecords.recordedAt))
      .limit(1)
      .get();

    return record || null;
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

    const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
    const totalReps = exercises.reduce((sum, e) => sum + e.reps * e.sets, 0);
    const count = exercises.length;

    const byType = exercises.reduce(
      (acc, e) => {
        if (!acc[e.exerciseType]) {
          acc[e.exerciseType] = { sets: 0, reps: 0 };
        }
        acc[e.exerciseType].sets += e.sets;
        acc[e.exerciseType].reps += e.reps * e.sets;
        return acc;
      },
      {} as Record<string, { sets: number; reps: number }>
    );

    return {
      totalSets,
      totalReps,
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

    const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
    const totalReps = exercises.reduce((sum, e) => sum + e.reps * e.sets, 0);
    const count = exercises.length;

    const byType = exercises.reduce(
      (acc, e) => {
        if (!acc[e.exerciseType]) {
          acc[e.exerciseType] = { sets: 0, reps: 0 };
        }
        acc[e.exerciseType].sets += e.sets;
        acc[e.exerciseType].reps += e.reps * e.sets;
        return acc;
      },
      {} as Record<string, { sets: number; reps: number }>
    );

    return {
      totalSets,
      totalReps,
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

    if (input.muscleGroup !== undefined) {
      updateData.muscleGroup = input.muscleGroup;
    }

    if (input.sets !== undefined) {
      updateData.sets = input.sets;
    }

    if (input.reps !== undefined) {
      updateData.reps = input.reps;
    }

    if (input.weight !== undefined) {
      updateData.weight = input.weight;
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

  async getExerciseTypes(userId: string): Promise<{ exerciseType: string; muscleGroup: string | null }[]> {
    const records = await this.db
      .select({
        exerciseType: schema.exerciseRecords.exerciseType,
        muscleGroup: schema.exerciseRecords.muscleGroup,
      })
      .from(schema.exerciseRecords)
      .where(eq(schema.exerciseRecords.userId, userId))
      .orderBy(desc(schema.exerciseRecords.recordedAt));

    // Get unique types preserving most recent order
    const seen = new Set<string>();
    const types: { exerciseType: string; muscleGroup: string | null }[] = [];
    for (const record of records) {
      if (!seen.has(record.exerciseType)) {
        seen.add(record.exerciseType);
        types.push({
          exerciseType: record.exerciseType,
          muscleGroup: record.muscleGroup,
        });
      }
    }
    return types;
  }
}
