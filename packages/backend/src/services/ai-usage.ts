import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, sql, and, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { aiUsageRecords } from '../db/schema';
import type { AIFeatureType, AIUsageSummary } from '@lifestyle-app/shared';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class AIUsageService {
  constructor(private db: DrizzleD1Database) {}

  /**
   * Record AI usage after a successful API call.
   * Errors are logged but not thrown (fire-and-forget).
   */
  async recordUsage(
    userId: string,
    featureType: AIFeatureType,
    usage: TokenUsage
  ): Promise<void> {
    try {
      await this.db.insert(aiUsageRecords).values({
        id: uuidv4(),
        userId,
        featureType,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        createdAt: new Date().toISOString(),
      });
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
}
