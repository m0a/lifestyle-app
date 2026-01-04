# API Contract: AI利用量トラッキング

## Endpoints

### GET /api/user/ai-usage

ユーザーのAI利用統計を取得する。

**Authentication**: Required (Bearer token)

**Response 200**:
```json
{
  "totalTokens": 123456,
  "monthlyTokens": 12345
}
```

**Response 401**:
```json
{
  "error": "Unauthorized"
}
```

---

## Internal Service Contracts

### AIUsageService

#### recordUsage(userId, featureType, usage)

AI機能利用後にトークン使用量を記録する。

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| userId | string | Yes | ユーザーID |
| featureType | AIFeatureType | Yes | 機能種別 |
| usage | TokenUsage | Yes | AI SDKからのusageオブジェクト |

**TokenUsage**:
```typescript
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
```

**Returns**: `Promise<void>`

**Behavior**:
- 新規レコードを`ai_usage_records`テーブルに挿入
- エラー時はログ出力のみ（呼び出し元のエラーハンドリングに影響しない）

---

#### getSummary(userId)

ユーザーのAI利用統計を取得する。

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| userId | string | Yes | ユーザーID |

**Returns**: `Promise<AIUsageSummary>`

```typescript
interface AIUsageSummary {
  totalTokens: number;    // 累計トークン量
  monthlyTokens: number;  // 今月のトークン量
}
```

---

## Integration Points

### AI Analysis Service (ai-analysis.ts)

```typescript
// analyzeMealPhoto 内
const { object, usage } = await generateObject({...});
if (success) {
  await aiUsageService.recordUsage(userId, 'image_analysis', usage);
}

// analyzeMealText 内
const { object, usage } = await generateObject({...});
if (success) {
  await aiUsageService.recordUsage(userId, 'text_analysis', usage);
}
```

### AI Chat Service (ai-chat.ts)

```typescript
// chat 内
const result = streamText({...});
// ストリーム完了後
const usage = await result.usage;
await aiUsageService.recordUsage(userId, 'chat', usage);
```

---

## Zod Schemas

```typescript
// shared/src/types/index.ts に追加

export const AIFeatureTypeSchema = z.enum(['image_analysis', 'text_analysis', 'chat']);
export type AIFeatureType = z.infer<typeof AIFeatureTypeSchema>;

export const AIUsageSummarySchema = z.object({
  totalTokens: z.number().int().min(0),
  monthlyTokens: z.number().int().min(0),
});
export type AIUsageSummary = z.infer<typeof AIUsageSummarySchema>;
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| recordUsage fails | ログ出力、エラーは呑み込む（AI機能自体は成功させる） |
| getSummary fails | 500エラーを返す |
| Unauthorized | 401エラーを返す |
