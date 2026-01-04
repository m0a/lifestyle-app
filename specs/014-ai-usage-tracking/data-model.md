# Data Model: AI利用量トラッキング

## Entities

### AIUsageRecord

AI機能の利用記録。各AI呼び出しごとに1レコード作成。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | 一意識別子 |
| userId | string | Yes | ユーザーID（users.idへの外部キー） |
| featureType | enum | Yes | 機能種別: `image_analysis`, `text_analysis`, `chat` |
| promptTokens | integer | Yes | 入力トークン数 |
| completionTokens | integer | Yes | 出力トークン数 |
| totalTokens | integer | Yes | 合計トークン数（prompt + completion） |
| createdAt | string (ISO8601) | Yes | 記録日時 |

**Constraints**:
- `userId` は `users.id` への外部キー（CASCADE DELETE）
- `featureType` は定義されたenum値のみ
- トークン数は0以上の整数

**Indexes**:
- `idx_ai_usage_user_date` on `(userId, createdAt)` - ユーザー別・期間別集計用

---

### AIUsageSummary (Computed/Virtual)

集計されたAI利用統計。DBテーブルではなくクエリ結果。

| Field | Type | Description |
|-------|------|-------------|
| totalTokens | integer | 累計トークン量 |
| monthlyTokens | integer | 今月のトークン量 |

**Computation**:
```sql
-- 累計
SELECT COALESCE(SUM(total_tokens), 0) AS totalTokens
FROM ai_usage_records
WHERE user_id = ?;

-- 今月（カレンダー月）
SELECT COALESCE(SUM(total_tokens), 0) AS monthlyTokens
FROM ai_usage_records
WHERE user_id = ?
  AND created_at >= date('now', 'start of month');
```

---

## Relationships

```
users (1) -----> (*) ai_usage_records
```

- 1ユーザーは0以上のAI利用記録を持つ
- ユーザー削除時は関連するAI利用記録も削除（CASCADE）

---

## State Transitions

AIUsageRecordはステートレス（作成後は変更なし）。

```
[AI呼び出し成功] ---> [Record Created]
```

- エラー時はレコード作成しない（FR-007）
- 更新・削除はない（監査ログとして保持）

---

## Drizzle ORM Schema

```typescript
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
```

---

## TypeScript Types (shared)

```typescript
export type AIFeatureType = 'image_analysis' | 'text_analysis' | 'chat';

export interface AIUsageRecord {
  id: string;
  userId: string;
  featureType: AIFeatureType;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt: string;
}

export interface AIUsageSummary {
  totalTokens: number;
  monthlyTokens: number;
}
```
