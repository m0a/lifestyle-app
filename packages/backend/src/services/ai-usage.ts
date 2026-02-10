import { eq, sql, and, gte, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { aiUsageRecords, mealRecords } from '../db/schema';
import { AI_USAGE_LIMITS } from '@lifestyle-app/shared';
import type { AIFeatureType, AIUsageSummary, AIDailyUsage } from '@lifestyle-app/shared';
import type { Database } from '../db';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class AIUsageService {
  constructor(
    private db: Database,
    private environment: string = 'production'
  ) {}

  /**
   * Record AI usage after a successful API call.
   * Errors are logged but not thrown (fire-and-forget).
   */
  async recordUsage(
    userId: string,
    featureType: AIFeatureType,
    usage: TokenUsage
  ): Promise<void> {
    console.log('AIUsageService.recordUsage called:', { userId, featureType, usage });
    try {
      const record = {
        id: uuidv4(),
        userId,
        featureType,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        createdAt: new Date().toISOString(),
      };
      console.log('Inserting record:', record);
      await this.db.insert(aiUsageRecords).values(record);
      console.log('Record inserted successfully');
    } catch (error) {
      console.error('Failed to record AI usage:', error);
      // Do not throw - usage recording should not affect main functionality
    }
  }

  /**
   * Get usage summary for a user.
   */
  async getSummary(userId: string): Promise<AIUsageSummary> {
    // Get total tokens
    const totalResult = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${aiUsageRecords.totalTokens}), 0)` })
      .from(aiUsageRecords)
      .where(eq(aiUsageRecords.userId, userId));

    // Get monthly tokens (current calendar month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyResult = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${aiUsageRecords.totalTokens}), 0)` })
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, userId),
          gte(aiUsageRecords.createdAt, startOfMonth.toISOString())
        )
      );

    return {
      totalTokens: totalResult[0]?.total ?? 0,
      monthlyTokens: monthlyResult[0]?.total ?? 0,
    };
  }

  /**
   * Get user's timezone offset from recent meal records.
   * Extracts timezone offset from recorded_at (e.g., "2024-01-01T12:00:00+09:00").
   * Falls back to JST (+09:00) if no records found.
   */
  async getUserTimezoneOffset(userId: string): Promise<string> {
    const recentMeals = await this.db
      .select({ recordedAt: mealRecords.recordedAt })
      .from(mealRecords)
      .where(eq(mealRecords.userId, userId))
      .orderBy(desc(mealRecords.createdAt))
      .limit(3);

    if (recentMeals.length === 0) {
      return '+09:00';
    }

    // Extract timezone offsets and find the most frequent one
    const offsetCounts = new Map<string, number>();
    for (const meal of recentMeals) {
      const match = meal.recordedAt.match(/([+-]\d{2}:\d{2})$/);
      const offset = match?.[1] ?? (meal.recordedAt.endsWith('Z') ? '+00:00' : '+09:00');
      offsetCounts.set(offset, (offsetCounts.get(offset) ?? 0) + 1);
    }

    let maxCount = 0;
    let mostFrequent = '+09:00';
    for (const [offset, count] of offsetCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = offset;
      }
    }

    return mostFrequent;
  }

  /**
   * Get the start of the user's local day in UTC.
   */
  private getStartOfDayUTC(timezoneOffset: string): string {
    const now = new Date();
    // Parse offset like "+09:00" or "-05:00"
    const match = timezoneOffset.match(/^([+-])(\d{2}):(\d{2})$/);
    if (!match) {
      // Fallback: JST
      const jstOffset = 9 * 60;
      const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
      const localNow = new Date(utcNow + jstOffset * 60000);
      localNow.setHours(0, 0, 0, 0);
      const startOfDayUTC = new Date(localNow.getTime() - jstOffset * 60000);
      return startOfDayUTC.toISOString();
    }

    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2]!, 10);
    const minutes = parseInt(match[3]!, 10);
    const offsetMinutes = sign * (hours * 60 + minutes);

    // Get current time in user's local timezone
    const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
    const localNow = new Date(utcNow + offsetMinutes * 60000);

    // Set to start of day in local time
    localNow.setHours(0, 0, 0, 0);

    // Convert back to UTC
    const startOfDayUTC = new Date(localNow.getTime() - offsetMinutes * 60000);
    return startOfDayUTC.toISOString();
  }

  /**
   * Get the next reset time (start of tomorrow) in user's local timezone.
   */
  private getNextResetTimeISO(timezoneOffset: string): string {
    const now = new Date();
    const match = timezoneOffset.match(/^([+-])(\d{2}):(\d{2})$/);
    const sign = match?.[1] === '+' ? 1 : -1;
    const hours = match ? parseInt(match[2]!, 10) : 9;
    const minutes = match ? parseInt(match[3]!, 10) : 0;
    const offsetMinutes = (match ? sign : 1) * (hours * 60 + minutes);

    const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
    const localNow = new Date(utcNow + offsetMinutes * 60000);

    // Set to start of tomorrow in local time
    localNow.setHours(0, 0, 0, 0);
    localNow.setDate(localNow.getDate() + 1);

    // Convert back to UTC
    const resetUTC = new Date(localNow.getTime() - offsetMinutes * 60000);
    return resetUTC.toISOString();
  }

  /**
   * Get the effective daily token limit based on environment.
   * Development uses a smaller limit for easier testing.
   */
  private getEffectiveLimit(): number {
    return this.environment === 'production'
      ? AI_USAGE_LIMITS.dailyTokenLimit
      : AI_USAGE_LIMITS.devDailyTokenLimit;
  }

  /**
   * Check if user has exceeded daily AI usage limit.
   * Returns whether the request is allowed and current daily usage.
   */
  async checkDailyLimit(userId: string): Promise<{ allowed: boolean; dailyTokensUsed: number }> {
    const offset = await this.getUserTimezoneOffset(userId);
    const startOfDay = this.getStartOfDayUTC(offset);

    const result = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${aiUsageRecords.totalTokens}), 0)` })
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, userId),
          gte(aiUsageRecords.createdAt, startOfDay)
        )
      );

    const dailyTokensUsed = result[0]?.total ?? 0;
    return {
      allowed: dailyTokensUsed < this.getEffectiveLimit(),
      dailyTokensUsed,
    };
  }

  /**
   * Get detailed daily usage information for frontend display.
   */
  async getDailyUsage(userId: string): Promise<AIDailyUsage> {
    const offset = await this.getUserTimezoneOffset(userId);
    const startOfDay = this.getStartOfDayUTC(offset);

    const result = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${aiUsageRecords.totalTokens}), 0)` })
      .from(aiUsageRecords)
      .where(
        and(
          eq(aiUsageRecords.userId, userId),
          gte(aiUsageRecords.createdAt, startOfDay)
        )
      );

    const dailyTokensUsed = result[0]?.total ?? 0;
    const dailyTokenLimit = this.getEffectiveLimit();
    const { warningThresholdPercent } = AI_USAGE_LIMITS;
    const remainingTokens = Math.max(0, dailyTokenLimit - dailyTokensUsed);
    const usagePercentage = Math.min(100, Math.round((dailyTokensUsed / dailyTokenLimit) * 100));

    return {
      dailyTokensUsed,
      dailyTokenLimit,
      remainingTokens,
      usagePercentage,
      isLimitExceeded: dailyTokensUsed >= dailyTokenLimit,
      isWarning: usagePercentage >= warningThresholdPercent && dailyTokensUsed < dailyTokenLimit,
      resetsAt: this.getNextResetTimeISO(offset),
    };
  }
}
