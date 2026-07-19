/**
 * MCP server route (Streamable HTTP transport).
 *
 * Exposes the user's lifestyle data as read-only MCP tools so a remote client
 * (e.g. a headless Claude Code) can query it in natural language. Auth is a
 * personal bearer token (mcpAuth) — no OAuth, no per-request passkey. Each tool
 * calls the existing service layer directly, scoped to the authenticated user.
 *
 * Stateless pattern (fits Cloudflare Workers): a fresh McpServer + transport is
 * built per request, bound to that request's authenticated user via closure.
 */
import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { z } from 'zod';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';
import type { Database } from '../db';
import { toJstDisplay, extractJstDate } from '../lib/localDate';
import { mcpAuth } from '../middleware/mcpAuth';
import { WeightService } from '../services/weight';
import { MealService } from '../services/meal';
import { ExerciseService } from '../services/exercise';

type Bindings = {
  DB: D1Database;
};

/** Wrap a plain string as an MCP text tool result. */
function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

/**
 * Summarize weight records into a compact, LLM-friendly string.
 *
 * The MCP consumer is an LLM, so the goal is a short, information-dense summary
 * rather than a raw row dump — this keeps token cost low and interpretation
 * accurate. `records` come newest-first (WeightService.findByUserId orders by
 * recordedAt desc); each has at least { weight: number; recordedAt: string }.
 */
function summarizeWeightTrend(
  records: Array<{ weight: number; recordedAt: string }>
): string {
  if (records.length === 0) {
    return '対象期間に体重の記録はありません。';
  }

  const count = records.length;
  const latest = records[0]!;
  const start = records[count - 1]!;
  const values = records.map((r) => r.weight);
  const avg = values.reduce((sum, w) => sum + w, 0) / count;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const delta = latest.weight - start.weight;
  const dir = Math.abs(delta) < 0.1 ? '横ばい' : delta < 0 ? '減少' : '増加';
  const sign = delta > 0 ? '+' : '';

  return [
    `体重推移（${extractJstDate(start.recordedAt)}〜${extractJstDate(latest.recordedAt)}, ${count}件）`,
    `開始 ${start.weight}kg → 最新 ${latest.weight}kg（${sign}${delta.toFixed(1)}kg, ${dir}）`,
    `平均 ${avg.toFixed(1)}kg / 最小 ${min}kg / 最大 ${max}kg`,
  ].join('\n');
}

/** Build a per-request MCP server whose tools are scoped to `userId`. */
function buildMcpServer(db: Database, userId: string): McpServer {
  const server = new McpServer({
    name: 'lifestyle-app',
    version: '1.0.0',
  });

  server.registerTool(
    'get_latest_weight',
    { description: '最新の体重記録を1件返す。' },
    async () => {
    const latest = await new WeightService(db).getLatest(userId);
    if (!latest) {
      return textResult('体重の記録はまだありません。');
    }
    return textResult(`最新体重: ${latest.weight}kg（記録日時: ${toJstDisplay(latest.recordedAt)}）`);
    }
  );

  server.registerTool(
    'get_weight_trend',
    {
      description:
        '指定期間の体重推移を要約して返す。from / to は YYYY-MM-DD（含む）。省略時は全期間。',
      inputSchema: {
        from: z.string().optional().describe('開始日 YYYY-MM-DD（含む）'),
        to: z.string().optional().describe('終了日 YYYY-MM-DD（含む）'),
      },
    },
    async ({ from, to }) => {
      const records = await new WeightService(db).findByUserId(userId, {
        startDate: from,
        endDate: to,
      });
      return textResult(summarizeWeightTrend(records));
    }
  );

  server.registerTool(
    'get_daily_summary',
    {
      description: '指定日の体重・食事カロリー・栄養・運動をまとめて返す。date は YYYY-MM-DD。',
      inputSchema: {
        date: z.string().describe('対象日 YYYY-MM-DD'),
      },
    },
    async ({ date }) => {
      const range = { startDate: date, endDate: date };
      const [meal, exercise, dayWeights] = await Promise.all([
        new MealService(db).getCalorieSummary(userId, range),
        new ExerciseService(db).getSummary(userId, range),
        new WeightService(db).findByUserId(userId, range),
      ]);
      const weight = dayWeights[0];

      const lines = [
        `【${date} のサマリー】`,
        `体重: ${weight ? `${weight.weight}kg` : '記録なし'}`,
        `食事: ${meal.totalMeals}件 / 合計${meal.totalCalories}kcal（P${Math.round(
          meal.totalProtein
        )} F${Math.round(meal.totalFat)} C${Math.round(meal.totalCarbs)}g）`,
        `運動: ${exercise.totalSets}セット / ${exercise.totalReps}回`,
      ];
      return textResult(lines.join('\n'));
    }
  );

  server.registerTool(
    'get_meals',
    {
      description:
        '指定日（date）または from〜to 期間の食事記録を一覧で返す。すべて YYYY-MM-DD。',
      inputSchema: {
        date: z.string().optional().describe('対象日 YYYY-MM-DD（単日指定）'),
        from: z.string().optional().describe('開始日 YYYY-MM-DD'),
        to: z.string().optional().describe('終了日 YYYY-MM-DD'),
      },
    },
    async ({ date, from, to }) => {
      const meals = await new MealService(db).findByUserId(userId, {
        startDate: date ?? from,
        endDate: date ?? to,
      });
      if (meals.length === 0) {
        return textResult('対象期間に食事の記録はありません。');
      }
      const lines = meals.map((m) => {
        const label =
          MEAL_TYPE_LABELS[m.mealType as keyof typeof MEAL_TYPE_LABELS] ?? m.mealType;
        const kcal = m.calories != null ? `${m.calories}kcal` : 'カロリー未計算';
        return `- ${toJstDisplay(m.recordedAt)} [${label}] ${m.content ?? ''} (${kcal})`;
      });
      return textResult(lines.join('\n'));
    }
  );

  return server;
}

export const mcp = new Hono<{ Bindings: Bindings }>().all('/', mcpAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  const server = buildMcpServer(db, user.id);
  const transport = new StreamableHTTPTransport();
  await server.connect(transport);
  return transport.handleRequest(c);
});
