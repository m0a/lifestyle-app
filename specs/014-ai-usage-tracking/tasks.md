# Tasks: AI利用量トラッキング

**Feature Branch**: `014-ai-usage-tracking`
**Generated**: 2026-01-04
**Source**: [spec.md](./spec.md) | [plan.md](./plan.md) | [data-model.md](./data-model.md) | [contracts/api.md](./contracts/api.md)

## Overview

設定ページでAI機能（食事画像分析、テキスト分析、AIチャット）のトークン使用量を表示する機能の実装タスク。

## Task Dependency Graph

```
T-001 (types) ──┬──> T-002 (schema) ──> T-003 (migration)
                │
                ├──> T-004 (AIUsageService) ──> T-005 (API endpoint)
                │                            │
                │                            ├──> T-006 (ai-analysis integration)
                │                            │
                │                            └──> T-007 (ai-chat integration)
                │
                └──> T-009 (unit tests) [P] ──┐
                                              │
T-005 ──> T-008 (frontend UI)                 │
                                              v
T-006, T-007, T-008 ──────────────────> T-010 (integration tests)
T-010 ──> T-011 (E2E tests)
```

**Note**: T-009（ユニットテスト）は TDD 原則に従い、T-004（実装）と並行して進められる。

---

## Phase 1: Foundation - Shared Types

### T-001: Add AIFeatureType and AIUsageSummary types to shared package

**Priority**: P0 (Blocking)
**Files**: `packages/shared/src/types/index.ts`
**Depends on**: None

**Description**:
shared パッケージに AI 利用量トラッキング用の型定義を追加する。

**Implementation**:
```typescript
// packages/shared/src/types/index.ts に追加

export const AIFeatureTypeSchema = z.enum(['image_analysis', 'text_analysis', 'chat']);
export type AIFeatureType = z.infer<typeof AIFeatureTypeSchema>;

export const AIUsageSummarySchema = z.object({
  totalTokens: z.number().int().min(0),
  monthlyTokens: z.number().int().min(0),
});
export type AIUsageSummary = z.infer<typeof AIUsageSummarySchema>;
```

**Acceptance Criteria**:
- [ ] `AIFeatureType` 型がエクスポートされている
- [ ] `AIUsageSummary` 型がエクスポートされている
- [ ] Zod スキーマも合わせてエクスポートされている
- [ ] `pnpm build:shared` が成功する

---

## Phase 2: Database Schema

### T-002: Add aiUsageRecords table to Drizzle schema

**Priority**: P0 (Blocking)
**Files**: `packages/backend/src/db/schema.ts`
**Depends on**: T-001

**Description**:
AI利用記録を保存する `ai_usage_records` テーブルのスキーマを Drizzle ORM で定義する。

**Implementation**:
```typescript
// packages/backend/src/db/schema.ts に追加

export const aiUsageRecords = sqliteTable(
  'ai_usage_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    featureType: text('feature_type').notNull(), // 'image_analysis' | 'text_analysis' | 'chat'
    promptTokens: integer('prompt_tokens').notNull(),
    completionTokens: integer('completion_tokens').notNull(),
    totalTokens: integer('total_tokens').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_ai_usage_user_date').on(table.userId, table.createdAt)]
);

// Type exports
export type AIUsageRecord = typeof aiUsageRecords.$inferSelect;
export type NewAIUsageRecord = typeof aiUsageRecords.$inferInsert;
```

**Acceptance Criteria**:
- [ ] `aiUsageRecords` テーブルがスキーマに定義されている
- [ ] userId は users.id への外部キー (CASCADE DELETE)
- [ ] `idx_ai_usage_user_date` インデックスが定義されている
- [ ] 型エクスポート (`AIUsageRecord`, `NewAIUsageRecord`) が追加されている

---

### T-003: Generate and apply database migration

**Priority**: P0 (Blocking)
**Files**: `packages/backend/migrations/XXXX_add_ai_usage_records.sql`
**Depends on**: T-002

**Description**:
Drizzle Kit でマイグレーションを生成し、ローカル環境に適用する。

**Commands**:
```bash
pnpm db:generate
pnpm --filter @lifestyle-app/backend db:migrate:local
```

**Acceptance Criteria**:
- [ ] マイグレーションファイルが生成されている
- [ ] ローカル D1 に適用が成功する
- [ ] `ai_usage_records` テーブルが作成されている
- [ ] インデックスが作成されている

---

## Phase 3: Backend Service

### T-004: Implement AIUsageService

**Priority**: P0 (Blocking)
**Files**: `packages/backend/src/services/ai-usage.ts` (新規)
**Depends on**: T-001, T-002

**Description**:
AI利用量の記録・集計を行うサービスクラスを実装する。

**Implementation**:
```typescript
// packages/backend/src/services/ai-usage.ts

import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, sql, and, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { aiUsageRecords } from '../db/schema';
import type { AIFeatureType, AIUsageSummary } from '@lifestyle-app/shared';

interface TokenUsage {
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
```

**Acceptance Criteria**:
- [ ] `recordUsage()` メソッドがトークン使用量を記録する
- [ ] `recordUsage()` のエラーは呑み込み、ログ出力のみ
- [ ] `getSummary()` メソッドが累計・今月のトークン量を返す
- [ ] 未使用ユーザーは `{ totalTokens: 0, monthlyTokens: 0 }` を返す

---

### T-005: Add GET /api/user/ai-usage endpoint

**Priority**: P1
**Files**: `packages/backend/src/routes/user.ts`
**Depends on**: T-004

**Description**:
ユーザーの AI 利用統計を取得する API エンドポイントを追加する。

**Implementation**:
```typescript
// packages/backend/src/routes/user.ts に追加

import { AIUsageService } from '../services/ai-usage';

// 既存のチェーンに追加
.get('/ai-usage', async (c) => {
  const currentUser = c.get('user');
  const db = c.get('db');
  const service = new AIUsageService(db);

  const summary = await service.getSummary(currentUser.id);

  return c.json(summary);
})
```

**Acceptance Criteria**:
- [ ] `GET /api/user/ai-usage` エンドポイントが存在する
- [ ] 認証必須（401 for unauthorized）
- [ ] レスポンス形式: `{ totalTokens: number, monthlyTokens: number }`
- [ ] Hono RPC型に含まれている（フロントエンドから型安全に呼び出せる）

---

## Phase 4: AI Service Integration

### T-006: Add token recording to AIAnalysisService

**Priority**: P1
**Files**: `packages/backend/src/services/ai-analysis.ts`
**Depends on**: T-004

**Description**:
`analyzeMealPhoto` と `analyzeMealText` メソッドでトークン使用量を記録する。

**Implementation**:
```typescript
// ai-analysis.ts の generateObject 呼び出し後に追加

// analyzeMealPhoto 内
const { object, usage } = await generateObject({...});

if (success && usage) {
  await this.aiUsageService.recordUsage(userId, 'image_analysis', usage).catch(console.error);
}

// analyzeMealText 内
const { object, usage } = await generateObject({...});

if (success && usage) {
  await this.aiUsageService.recordUsage(userId, 'text_analysis', usage).catch(console.error);
}
```

**Notes**:
- メソッドシグネチャに `userId` パラメータを追加する必要あり
- AIUsageService をコンストラクタで受け取るか、メソッド引数で受け取る
- 呼び出し元（ルートハンドラ）の修正も必要

**Acceptance Criteria**:
- [ ] `analyzeMealPhoto` 成功時に `image_analysis` として記録
- [ ] `analyzeMealText` 成功時に `text_analysis` として記録
- [ ] エラー時は記録しない（FR-007）
- [ ] トークン記録のエラーは分析結果に影響しない
- [ ] `analyzeMealPhoto` メソッドが `userId` パラメータを受け取る
- [ ] `/api/meals/analyze-photo` ルートハンドラが `userId` を渡すよう修正
- [ ] `/api/meals/analyze-text` ルートハンドラが `userId` を渡すよう修正

---

### T-007: Add token recording to AIChatService

**Priority**: P1
**Files**: `packages/backend/src/services/ai-chat.ts`
**Depends on**: T-004

**Description**:
`chat` メソッドでストリーム完了後にトークン使用量を記録する。

**Implementation**:
```typescript
// ai-chat.ts の streamText 呼び出し後

const result = streamText({...});

// ストリーム完了後に使用量を取得
const usage = await result.usage;
if (usage) {
  await this.aiUsageService.recordUsage(userId, 'chat', usage).catch(console.error);
}
```

**Notes**:
- ストリーミング API では `result.usage` が Promise
- 呼び出し元でストリーム完了を待ってから記録する必要あり
- チャットルートハンドラの修正も必要

**Acceptance Criteria**:
- [ ] チャット完了時に `chat` として記録
- [ ] ストリーム途中でエラーになった場合は記録しない
- [ ] トークン記録のエラーはチャット応答に影響しない
- [ ] `chat` メソッドが `userId` パラメータを受け取る
- [ ] `/api/meals/:id/chat` ルートハンドラがストリーム完了後に usage を記録

---

## Phase 5: Frontend UI

### T-008: Add AI usage section to Settings page

**Priority**: P1
**Files**: `packages/frontend/src/pages/Settings.tsx`
**Depends on**: T-005

**Description**:
設定ページに「AI利用状況」セクションを追加し、今月・累計のトークン量を表示する。

**Implementation**:
```tsx
// Settings.tsx

// クエリ追加
const { data: aiUsage } = useQuery({
  queryKey: ['user', 'ai-usage'],
  queryFn: async () => {
    const res = await api.user['ai-usage'].$get();
    if (!res.ok) {
      throw new Error('Failed to fetch AI usage');
    }
    return res.json();
  },
});

// ヘルパー関数
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  return tokens.toLocaleString();
}

// JSX (Stats Section の後に追加)
{/* AI Usage Section */}
<div className="rounded-lg border border-gray-200 bg-white p-6">
  <h2 className="mb-4 text-lg font-semibold text-gray-900">AI利用状況</h2>
  <div className="grid grid-cols-2 gap-4">
    <div className="text-center">
      <p className="text-2xl font-bold text-purple-600">
        {formatTokens(aiUsage?.monthlyTokens ?? 0)}
      </p>
      <p className="text-sm text-gray-500">今月</p>
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900">
        {formatTokens(aiUsage?.totalTokens ?? 0)}
      </p>
      <p className="text-sm text-gray-500">累計</p>
    </div>
  </div>
</div>
```

**Acceptance Criteria**:
- [ ] 「AI利用状況」セクションが表示される
- [ ] 今月のトークン量が紫色で表示される
- [ ] 累計トークン量がグレーで表示される
- [ ] 数値がフォーマットされている（1,234 / 1.2M）
- [ ] ローディング中はセクション全体が表示されない（または skeleton）

---

## Phase 6: Testing

### T-009: Add unit tests for AIUsageService

**Priority**: P0 (Blocking) [P]
**Files**: `tests/unit/ai-usage.service.test.ts` (新規)
**Depends on**: T-001, T-002

**Description**:
AIUsageService のユニットテストを作成する。

**Rationale for TDD order**:
TDD原則に従い、AIUsageServiceのインターフェース（型定義・スキーマ）が確定した段階でテストを先に書く。実装(T-004)とテスト(T-009)は並行して進められる。

**Test Cases**:
1. `recordUsage` - 正常に記録される
2. `recordUsage` - DB エラー時もスローしない
3. `getSummary` - 累計トークン量の計算
4. `getSummary` - 今月のトークン量の計算
5. `getSummary` - 未使用ユーザーは 0 を返す
6. `recordUsage` - 並行呼び出し時も全て記録される（Edge Case: 複数デバイス同時使用）

**Acceptance Criteria**:
- [ ] 全テストケースがパスする
- [ ] モック DB を使用

---

### T-010: Add integration tests for /api/user/ai-usage

**Priority**: P2
**Files**: `tests/integration/ai-usage.test.ts` (新規)
**Depends on**: T-005

**Description**:
AI 利用統計 API の統合テストを作成する。

**Test Cases**:
1. 未認証リクエストは 401 を返す
2. 認証済みユーザーは統計を取得できる
3. AI 機能使用後に統計が更新される
4. `/api/user/ai-usage` のレスポンス時間が 2 秒以内である (SC-001)

**Acceptance Criteria**:
- [ ] 全テストケースがパスする

---

### T-011: Add E2E test for AI usage display

**Priority**: P3
**Files**: `tests/e2e/settings.spec.ts` (既存に追加)
**Depends on**: T-008

**Description**:
設定ページで AI 利用状況が表示されることを確認する E2E テスト。

**Test Scenario**:
1. ログイン
2. 食事をテキスト入力で記録（AI 分析実行）
3. 設定ページに移動
4. 「AI利用状況」セクションが表示される
5. トークン量が 0 より大きい

**Acceptance Criteria**:
- [ ] E2E テストがパスする

---

## Summary

| Task | Priority | Estimate | Dependencies |
|------|----------|----------|--------------|
| T-001 | P0 | Small | None |
| T-002 | P0 | Small | T-001 |
| T-003 | P0 | Small | T-002 |
| T-004 | P0 | Medium | T-001, T-002 |
| T-005 | P1 | Small | T-004 |
| T-006 | P1 | Medium | T-004 |
| T-007 | P1 | Medium | T-004 |
| T-008 | P1 | Small | T-005 |
| T-009 | P0 [P] | Medium | T-001, T-002 |
| T-010 | P2 | Small | T-005, T-009 |
| T-011 | P3 | Small | T-008 |

**Critical Path**: T-001 → T-002 → T-003 → T-004 → T-005 → T-008
**TDD Path**: T-001 → T-002 → T-009 (並行: T-004) → T-010
