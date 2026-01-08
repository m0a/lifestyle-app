import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';
import type { CreateExerciseInput, UpdateExerciseInput, ExerciseImportSummary, ExerciseRecord, RecentExerciseItem } from '@lifestyle-app/shared';
import { z } from 'zod';
import { createExerciseSetsSchema, calculate1RM } from '@lifestyle-app/shared';

// Type for new multi-set input
export type CreateExerciseSetsInput = z.infer<typeof createExerciseSetsSchema>;

export class ExerciseService {
  constructor(private db: Database) {}

  // New: Create multiple sets at once
  async createSets(userId: string, input: CreateExerciseSetsInput) {
    const now = new Date().toISOString();
    const exercises = [];

    for (let i = 0; i < input.sets.length; i++) {
      const set = input.sets[i];
      if (!set) continue;
      const id = uuidv4();
      const setNumber = i + 1;

      await this.db.insert(schema.exerciseRecords).values({
        id,
        userId,
        exerciseType: input.exerciseType,
        muscleGroup: input.muscleGroup ?? null,
        setNumber,
        reps: set.reps,
        weight: set.weight ?? null,
        variation: set.variation ?? null,
        recordedAt: input.recordedAt,
        createdAt: now,
        updatedAt: now,
      });

      exercises.push({
        id,
        userId,
        exerciseType: input.exerciseType,
        muscleGroup: input.muscleGroup ?? null,
        setNumber,
        reps: set.reps,
        weight: set.weight ?? null,
        variation: set.variation ?? null,
        recordedAt: input.recordedAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    return exercises;
  }

  // Legacy: Create single record (for backward compatibility)
  async create(userId: string, input: CreateExerciseInput) {
    const now = new Date().toISOString();
    const id = uuidv4();

    await this.db.insert(schema.exerciseRecords).values({
      id,
      userId,
      exerciseType: input.exerciseType,
      muscleGroup: input.muscleGroup ?? null,
      setNumber: 1,
      reps: input.reps,
      weight: input.weight ?? null,
      variation: null,
      recordedAt: input.recordedAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      exerciseType: input.exerciseType,
      muscleGroup: input.muscleGroup ?? null,
      setNumber: 1,
      reps: input.reps,
      weight: input.weight ?? null,
      variation: null,
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
      filtered = filtered.filter((r) => {
        const recordDate = r.recordedAt.split('T')[0] ?? '';
        return recordDate >= options.startDate!;
      });
    }

    if (options?.endDate) {
      filtered = filtered.filter((r) => {
        const recordDate = r.recordedAt.split('T')[0] ?? '';
        return recordDate <= options.endDate!;
      });
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

    // Each record is now 1 set
    const totalSets = exercises.length;
    const totalReps = exercises.reduce((sum, e) => sum + e.reps, 0);
    const count = exercises.length;

    const byType = exercises.reduce(
      (acc, e) => {
        if (!acc[e.exerciseType]) {
          acc[e.exerciseType] = { sets: 0, reps: 0 };
        }
        acc[e.exerciseType]!.sets += 1;
        acc[e.exerciseType]!.reps += e.reps;
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

    // Each record is now 1 set
    const totalSets = exercises.length;
    const totalReps = exercises.reduce((sum, e) => sum + e.reps, 0);
    const count = exercises.length;

    const byType = exercises.reduce(
      (acc, e) => {
        if (!acc[e.exerciseType]) {
          acc[e.exerciseType] = { sets: 0, reps: 0 };
        }
        acc[e.exerciseType]!.sets += 1;
        acc[e.exerciseType]!.reps += e.reps;
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
      updateData['exerciseType'] = input.exerciseType;
    }

    if (input.muscleGroup !== undefined) {
      updateData['muscleGroup'] = input.muscleGroup;
    }

    if (input.reps !== undefined) {
      updateData['reps'] = input.reps;
    }

    if (input.weight !== undefined) {
      updateData['weight'] = input.weight;
    }

    if (input.variation !== undefined) {
      updateData['variation'] = input.variation;
    }

    if (input.recordedAt !== undefined) {
      updateData['recordedAt'] = input.recordedAt;
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

  /**
   * Get historical max 1RM for specified exercise types
   * @param userId - User ID
   * @param exerciseTypes - Optional array of exercise types. If empty, returns all types.
   * @returns Array of { exerciseType, maxRM, achievedAt } for each exercise type
   */
  async getMaxRMs(
    userId: string,
    exerciseTypes?: string[]
  ): Promise<{ exerciseType: string; maxRM: number; achievedAt: string }[]> {
    // Get all records for the user (filtered by exercise types if specified)
    const records = await this.db
      .select()
      .from(schema.exerciseRecords)
      .where(eq(schema.exerciseRecords.userId, userId))
      .all();

    // Filter by exercise types if specified
    const filtered = exerciseTypes && exerciseTypes.length > 0
      ? records.filter(r => exerciseTypes.includes(r.exerciseType))
      : records;

    // Group by exercise type and find max 1RM for each
    const maxByType = new Map<string, { maxRM: number; achievedAt: string }>();

    for (const record of filtered) {
      // Skip records without weight (bodyweight exercises)
      if (record.weight === null) continue;

      const estimated1RM = calculate1RM(record.weight, record.reps);
      const existing = maxByType.get(record.exerciseType);

      if (!existing || estimated1RM > existing.maxRM) {
        maxByType.set(record.exerciseType, {
          maxRM: estimated1RM,
          achievedAt: record.recordedAt,
        });
      }
    }

    // Convert to array
    return Array.from(maxByType.entries()).map(([exerciseType, data]) => ({
      exerciseType,
      maxRM: data.maxRM,
      achievedAt: data.achievedAt,
    }));
  }

  // Get recent training sessions (grouped by date)
  async getRecentSessions(
    userId: string,
    options?: { cursor?: string; limit?: number }
  ) {
    const limit = options?.limit ?? 10;

    const records = await this.db
      .select()
      .from(schema.exerciseRecords)
      .where(eq(schema.exerciseRecords.userId, userId))
      .orderBy(desc(schema.exerciseRecords.recordedAt))
      .all();

    // Group by date
    const sessionMap = new Map<string, {
      date: string;
      exercises: typeof records;
    }>();

    for (const record of records) {
      const dateStr = record.recordedAt.split('T')[0] ?? '';
      if (!sessionMap.has(dateStr)) {
        sessionMap.set(dateStr, { date: dateStr, exercises: [] });
      }
      sessionMap.get(dateStr)!.exercises.push(record);
    }

    // Convert to array and sort by date desc
    let sessions = Array.from(sessionMap.values())
      .sort((a, b) => b.date.localeCompare(a.date));

    // Apply cursor pagination
    if (options?.cursor) {
      const cursorIndex = sessions.findIndex(s => s.date === options.cursor);
      if (cursorIndex !== -1) {
        sessions = sessions.slice(cursorIndex + 1);
      }
    }

    // Apply limit
    const hasMore = sessions.length > limit;
    sessions = sessions.slice(0, limit);

    // Format sessions for response
    const formattedSessions = sessions.map(session => {
      // Group exercises by type within the session
      const exerciseGroups: Record<string, {
        exerciseType: string;
        muscleGroup: string | null;
        sets: { setNumber: number; reps: number; weight: number | null; variation: string | null }[];
      }> = {};

      for (const exercise of session.exercises) {
        if (!exerciseGroups[exercise.exerciseType]) {
          exerciseGroups[exercise.exerciseType] = {
            exerciseType: exercise.exerciseType,
            muscleGroup: exercise.muscleGroup,
            sets: [],
          };
        }
        exerciseGroups[exercise.exerciseType]!.sets.push({
          setNumber: exercise.setNumber,
          reps: exercise.reps,
          weight: exercise.weight,
          variation: exercise.variation,
        });
      }

      // Sort sets by setNumber
      for (const group of Object.values(exerciseGroups)) {
        group.sets.sort((a, b) => a.setNumber - b.setNumber);
      }

      return {
        date: session.date,
        exercises: Object.values(exerciseGroups),
      };
    });

    return {
      sessions: formattedSessions,
      nextCursor: hasMore ? sessions[sessions.length - 1]?.date : null,
    };
  }

  /**
   * Aggregate exercise sets by exercise type for import selection
   * Groups sets from the same exercise session and formats display strings
   * @param exercises - Array of exercise records from the same date
   * @returns Array of aggregated exercise summaries
   */
  aggregateExerciseSets(exercises: ExerciseRecord[]): ExerciseImportSummary[] {
    // Group by exerciseType and recordedAt (to handle multiple exercise sessions on same day)
    const groupMap = new Map<string, ExerciseRecord[]>();

    for (const exercise of exercises) {
      // Use exerciseType + recordedAt as key to group exercises from same session
      const key = `${exercise.exerciseType}::${exercise.recordedAt}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(exercise);
    }

    // Convert groups to ExerciseImportSummary
    const summaries: ExerciseImportSummary[] = [];

    for (const records of groupMap.values()) {
      // Sort by setNumber to ensure consistent ordering
      const sortedRecords = records.sort((a, b) => a.setNumber - b.setNumber);
      const firstRecord = sortedRecords[0];
      if (!firstRecord) continue;

      const totalSets = sortedRecords.length;

      // Format displaySets string (e.g., "3セット × 12回 @ 50kg")
      const displaySets = this.formatDisplaySets(sortedRecords);

      // Extract timestamp (HH:mm) from recordedAt
      const timestamp = this.formatTimestamp(firstRecord.recordedAt);

      summaries.push({
        id: firstRecord.id,
        exerciseType: firstRecord.exerciseType,
        muscleGroup: firstRecord.muscleGroup,
        totalSets,
        displaySets,
        timestamp,
        recordedAt: firstRecord.recordedAt,
      });
    }

    // Sort by recordedAt descending (most recent first)
    return summaries.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }

  /**
   * Format display string for exercise sets
   * @param records - Sorted array of exercise records from same session
   * @returns Formatted string like "3セット × 12回 @ 50kg"
   */
  private formatDisplaySets(records: ExerciseRecord[]): string {
    const totalSets = records.length;

    // Get reps and weights from all sets
    const reps = records.map(r => r.reps);
    const weights = records.map(r => r.weight);

    // Check if all reps are the same
    const allSameReps = reps.every(r => r === reps[0]);
    const allSameWeight = weights.every(w => w === weights[0]);

    if (allSameReps && allSameWeight) {
      // All sets identical: "3セット × 12回 @ 50kg" or "3セット × 12回" (bodyweight)
      const weight = weights[0];
      if (weight === null) {
        return `${totalSets}セット × ${reps[0]}回`;
      }
      return `${totalSets}セット × ${reps[0]}回 @ ${weight}kg`;
    }

    // Sets vary: show range or representative values
    const minReps = Math.min(...reps);
    const maxReps = Math.max(...reps);
    const nonNullWeights = weights.filter((w): w is number => w !== null);

    if (nonNullWeights.length === 0) {
      // Bodyweight exercise with varying reps
      if (minReps === maxReps) {
        return `${totalSets}セット × ${minReps}回`;
      }
      return `${totalSets}セット × ${minReps}-${maxReps}回`;
    }

    // Weighted exercise with variations
    const minWeight = Math.min(...nonNullWeights);
    const maxWeight = Math.max(...nonNullWeights);

    if (minReps === maxReps && minWeight === maxWeight) {
      return `${totalSets}セット × ${minReps}回 @ ${minWeight}kg`;
    }

    // Show ranges for both reps and weight
    const repsStr = minReps === maxReps ? `${minReps}回` : `${minReps}-${maxReps}回`;
    const weightStr = minWeight === maxWeight ? `${minWeight}kg` : `${minWeight}-${maxWeight}kg`;

    return `${totalSets}セット × ${repsStr} @ ${weightStr}`;
  }

  /**
   * Format ISO timestamp to HH:mm
   * Extracts time directly from ISO string to avoid timezone conversion
   * @param isoString - ISO 8601 timestamp (e.g., "2026-01-05T10:00:00.000Z")
   * @returns Time string in HH:mm format (e.g., "10:00")
   */
  private formatTimestamp(isoString: string): string {
    // Extract time portion from ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    // Fallback to Date parsing if format doesn't match
    const date = new Date(isoString);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Get recent unique exercises by type
   * Returns the most recent instance of each unique exercise type
   * @param exercises - Array of exercise records
   * @param limit - Maximum number of unique exercises to return (default 10)
   * @returns Array of recent exercise items
   */
  getRecentUniqueExercises(exercises: ExerciseRecord[], limit: number = 10): RecentExerciseItem[] {
    // Group by exerciseType, keeping track of all records for each type
    const byType = new Map<string, ExerciseRecord[]>();

    for (const exercise of exercises) {
      if (!byType.has(exercise.exerciseType)) {
        byType.set(exercise.exerciseType, []);
      }
      byType.get(exercise.exerciseType)!.push(exercise);
    }

    // For each exercise type, find the most recent session
    const recentExercises: RecentExerciseItem[] = [];

    for (const [exerciseType, records] of byType.entries()) {
      // Sort by recordedAt descending to get most recent first
      const sortedRecords = records.sort((a, b) =>
        b.recordedAt.localeCompare(a.recordedAt)
      );

      // Get the most recent record
      const mostRecent = sortedRecords[0];
      if (!mostRecent) continue;

      // Find all records from the same session (same recordedAt)
      const sessionRecords = sortedRecords.filter(
        r => r.recordedAt === mostRecent.recordedAt
      );

      // Extract date and time
      const lastPerformedDate = mostRecent.recordedAt.split('T')[0] ?? '';
      const lastPerformedTime = this.formatTimestamp(mostRecent.recordedAt);

      // Format preview string: "3セット, 50kg" or "3セット" for bodyweight
      const totalSets = sessionRecords.length;
      const hasWeight = sessionRecords.some(r => r.weight !== null);
      const avgWeight = hasWeight
        ? sessionRecords.reduce((sum, r) => sum + (r.weight || 0), 0) / sessionRecords.length
        : null;

      const preview = avgWeight !== null
        ? `${totalSets}セット, ${Math.round(avgWeight)}kg`
        : `${totalSets}セット`;

      recentExercises.push({
        id: mostRecent.id,
        exerciseType,
        muscleGroup: mostRecent.muscleGroup,
        lastPerformedDate,
        lastPerformedTime,
        preview,
      });
    }

    // Sort by most recent first
    recentExercises.sort((a, b) => b.lastPerformedDate.localeCompare(a.lastPerformedDate));

    // Apply limit
    return recentExercises.slice(0, limit);
  }
}
