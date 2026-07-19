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
import { MEAL_TYPE_LABELS, MUSCLE_GROUP_LABELS, type MuscleGroup } from '@lifestyle-app/shared';
import type { Database } from '../db';
import { toJstDisplay, extractJstDate } from '../lib/localDate';
import {
  rankProteinSources,
  proteinGap,
  dailyWeightSeries,
  movingAverageSeries,
  weeklyWeightAverages,
  nutritionTrend,
  exerciseBreakdown,
} from '../lib/mcpAggregate';
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

/** Round to 1 decimal place for display (protein/fat/carbs grams, weights). */
const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
/** Signed 1-decimal string, e.g. +2.5 / -1.0 / ±0.0 — for gaps vs a target. */
const signed = (n: number) => {
  const rounded = Math.round(n * 10) / 10;
  if (rounded === 0) return '±0.0';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
};
/** Human label for a meal type, falling back to the raw value. */
const mealLabel = (t: string) => MEAL_TYPE_LABELS[t as keyof typeof MEAL_TYPE_LABELS] ?? t;

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
        const kcal = m.calories != null ? `${m.calories}kcal` : 'カロリー未計算';
        return `- ${toJstDisplay(m.recordedAt)} [${mealLabel(m.mealType)}] ${m.content ?? ''} (${kcal})`;
      });
      return textResult(lines.join('\n'));
    }
  );

  server.registerTool(
    'get_food_items',
    {
      description:
        '指定日(date)または from〜to 期間の食事を「1品ごと」に分解し、各食材の P/F/C・カロリーを返す。すべて YYYY-MM-DD。',
      inputSchema: {
        date: z.string().optional().describe('対象日 YYYY-MM-DD（単日指定）'),
        from: z.string().optional().describe('開始日 YYYY-MM-DD'),
        to: z.string().optional().describe('終了日 YYYY-MM-DD'),
      },
    },
    async ({ date, from, to }) => {
      const items = await new MealService(db).getFoodItemsByUserId(userId, {
        startDate: date ?? from,
        endDate: date ?? to,
      });
      if (items.length === 0) {
        return textResult('対象期間に食材レベルの記録はありません。');
      }
      const lines = items.map(
        (it) =>
          `- ${extractJstDate(it.recordedAt)} ${mealLabel(it.mealType)} ${it.name}: P${r1(
            it.protein
          )}/F${r1(it.fat)}/C${r1(it.carbs)} ${it.calories}kcal`
      );
      return textResult(lines.join('\n'));
    }
  );

  server.registerTool(
    'get_protein_sources',
    {
      description:
        '指定期間に食べた食材を「たんぱく源」として名前で集約し、累計たんぱく質の多い順にランキングして返す。date 単日 or from〜to。',
      inputSchema: {
        date: z.string().optional().describe('対象日 YYYY-MM-DD（単日指定）'),
        from: z.string().optional().describe('開始日 YYYY-MM-DD'),
        to: z.string().optional().describe('終了日 YYYY-MM-DD'),
        top: z.number().int().min(1).max(50).optional().describe('上位何件を返すか（既定10）'),
      },
    },
    async ({ date, from, to, top }) => {
      const items = await new MealService(db).getFoodItemsByUserId(userId, {
        startDate: date ?? from,
        endDate: date ?? to,
      });
      const ranked = rankProteinSources(items, top ?? 10);
      if (ranked.length === 0) {
        return textResult('対象期間に食材レベルの記録はありません。');
      }
      const lines = ranked.map(
        (s, i) =>
          `${i + 1}. ${s.name} — 累計P${r1(s.totalProtein)}g（${s.count}回, 平均${r1(
            s.avgProtein
          )}g/回, 累計${s.totalCalories}kcal）`
      );
      return textResult(`たんぱく源ランキング（上位${ranked.length}）\n${lines.join('\n')}`);
    }
  );

  server.registerTool(
    'get_protein_gap',
    {
      description:
        'たんぱく質の摂取量を目標(target: 1食あたりg)と比較し、不足(ギャップ)を返す。date 単日なら食事別の内訳も付く。from〜to で期間の日別集計。',
      inputSchema: {
        target: z.number().positive().describe('1食あたりのたんぱく質目標(g)。例: 25'),
        date: z.string().optional().describe('対象日 YYYY-MM-DD（単日指定）'),
        from: z.string().optional().describe('開始日 YYYY-MM-DD'),
        to: z.string().optional().describe('終了日 YYYY-MM-DD'),
      },
    },
    async ({ target, date, from, to }) => {
      const meals = await new MealService(db).findByUserId(userId, {
        startDate: date ?? from,
        endDate: date ?? to,
      });
      if (meals.length === 0) {
        return textResult('対象期間に食事の記録はありません。');
      }
      const { byMeal, byDay } = proteinGap(meals, target);

      // Single day: show the per-meal breakdown, then the day rollup.
      if (date) {
        const mealLines = byMeal.map(
          (m) =>
            `  - ${mealLabel(m.mealType)}: P${r1(m.protein)}（${signed(m.gap)}, ${
              m.met ? '達成✓' : '未達'
            }）`
        );
        const d = byDay[0];
        const dayLine = d
          ? `日合計: P${r1(d.totalProtein)} / 目標${r1(d.dayTarget)}（${signed(d.gap)}, ${d.mealCount}食中${d.mealsMetTarget}食達成）`
          : '';
        return textResult(
          `【${date} たんぱく質ギャップ】目標 ${r1(target)}g/食\n食事別:\n${mealLines.join('\n')}\n${dayLine}`
        );
      }

      // Range: per-day rollup only (keeps output bounded for long spans).
      const lines = byDay.map(
        (d) =>
          `- ${d.date}: P${r1(d.totalProtein)}/目標${r1(d.dayTarget)}（${signed(d.gap)}, ${d.mealCount}食中${d.mealsMetTarget}食達成）`
      );
      return textResult(`たんぱく質ギャップ（目標 ${r1(target)}g/食）\n${lines.join('\n')}`);
    }
  );

  server.registerTool(
    'get_weight_moving_average',
    {
      description:
        '体重の移動平均(既定7日)と週平均を返す。日々±1kgのノイズを均してトレンドを評価するための「要石」。from〜to 省略時は全期間。',
      inputSchema: {
        from: z.string().optional().describe('開始日 YYYY-MM-DD（含む）'),
        to: z.string().optional().describe('終了日 YYYY-MM-DD（含む）'),
        window: z.number().int().min(2).max(30).optional().describe('移動平均の窓(日数, 既定7)'),
      },
    },
    async ({ from, to, window }) => {
      const win = window ?? 7;
      const records = await new WeightService(db).findByUserId(userId, {
        startDate: from,
        endDate: to,
      });
      const daily = dailyWeightSeries(records);
      if (daily.length === 0) {
        return textResult('対象期間に体重の記録はありません。');
      }
      const ma = movingAverageSeries(daily, win);
      const weekly = weeklyWeightAverages(daily);

      const maLines = ma.map(
        (p) => `- ${p.date}: ${r1(p.weight)}kg（MA${r1(p.movingAvg)}）`
      );
      const weeklyLines = weekly.map(
        (w) => `- ${w.weekStart}〜${w.weekEnd}: ${r1(w.avg)}kg（${w.count}日）`
      );
      return textResult(
        `体重移動平均（window=${win}日, ${daily.length}日分）\n${maLines.join(
          '\n'
        )}\n週平均:\n${weeklyLines.join('\n')}`
      );
    }
  );

  server.registerTool(
    'get_nutrition_trend',
    {
      description:
        '期間のカロリー・PFCを週別または月別に集計して推移を返す。groupBy は "week"(既定) か "month"。from〜to 省略時は全期間。',
      inputSchema: {
        from: z.string().optional().describe('開始日 YYYY-MM-DD'),
        to: z.string().optional().describe('終了日 YYYY-MM-DD'),
        groupBy: z.enum(['week', 'month']).optional().describe('集計単位（既定 week）'),
      },
    },
    async ({ from, to, groupBy }) => {
      const unit = groupBy ?? 'week';
      const meals = await new MealService(db).findByUserId(userId, {
        startDate: from,
        endDate: to,
      });
      const buckets = nutritionTrend(meals, unit);
      if (buckets.length === 0) {
        return textResult('対象期間に食事の記録はありません。');
      }
      const suffix = unit === 'week' ? '週' : '';
      const lines = buckets.map(
        (b) =>
          `- ${b.label}${suffix}: ${b.days}日/${b.meals}食 計${b.totalCalories}kcal（P${r1(
            b.totalProtein
          )} F${r1(b.totalFat)} C${r1(b.totalCarbs)}）日平均${Math.round(b.avgCalories)}kcal P${r1(
            b.avgProtein
          )}`
      );
      return textResult(`栄養集計（${unit === 'week' ? '週別' : '月別'}）\n${lines.join('\n')}`);
    }
  );

  server.registerTool(
    'get_exercise_breakdown',
    {
      description:
        '運動記録を部位別(muscle, 既定)または種目別(type)に集計し、セット数・回数・総重量(Σreps×kg)を返す。date 単日 or from〜to。',
      inputSchema: {
        date: z.string().optional().describe('対象日 YYYY-MM-DD（単日指定）'),
        from: z.string().optional().describe('開始日 YYYY-MM-DD'),
        to: z.string().optional().describe('終了日 YYYY-MM-DD'),
        groupBy: z.enum(['muscle', 'type']).optional().describe('集計軸（既定 muscle）'),
      },
    },
    async ({ date, from, to, groupBy }) => {
      const axis = groupBy ?? 'muscle';
      const records = await new ExerciseService(db).findByUserId(userId, {
        startDate: date ?? from,
        endDate: date ?? to,
      });
      const groups = exerciseBreakdown(records, axis);
      if (groups.length === 0) {
        return textResult('対象期間に運動の記録はありません。');
      }
      const lines = groups.map((g) => {
        const label =
          axis === 'muscle'
            ? MUSCLE_GROUP_LABELS[g.key as MuscleGroup] ?? g.key
            : g.key;
        const volume = g.volume > 0 ? `, 総重量${r1(g.volume)}kg` : '';
        return `- ${label}: ${g.sets}セット/${g.reps}回${volume}`;
      });
      return textResult(`運動内訳（${axis === 'muscle' ? '部位別' : '種目別'}）\n${lines.join('\n')}`);
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
