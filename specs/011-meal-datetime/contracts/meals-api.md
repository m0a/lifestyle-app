# API Contract: Meals - 日時更新

**Date**: 2026-01-03
**Feature**: 011-meal-datetime

## エンドポイント

### PATCH /api/meals/:id

食事記録を更新する。**既存のエンドポイント（変更なし）**

#### リクエスト

```http
PATCH /api/meals/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "recordedAt": "2026-01-01T12:00:00.000Z"
}
```

#### リクエストボディ

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| mealType | string | No | 'breakfast' \| 'lunch' \| 'dinner' \| 'snack' |
| content | string | No | 食事内容（1-1000文字） |
| calories | number | No | カロリー（0-10000） |
| recordedAt | string | No | 記録日時（ISO 8601形式） |

#### レスポンス

**成功時 (200 OK)**

```json
{
  "meal": {
    "id": "uuid",
    "userId": "uuid",
    "mealType": "lunch",
    "content": "カレーライス",
    "calories": 700,
    "photoKey": null,
    "totalProtein": null,
    "totalFat": null,
    "totalCarbs": null,
    "analysisSource": null,
    "recordedAt": "2026-01-01T12:00:00.000Z",
    "createdAt": "2026-01-03T10:00:00.000Z",
    "updatedAt": "2026-01-03T15:00:00.000Z"
  }
}
```

**エラー時**

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | バリデーションエラー（未来日時など） |
| 401 | UNAUTHORIZED | 認証エラー |
| 403 | FORBIDDEN | 他ユーザーの記録 |
| 404 | MEAL_NOT_FOUND | 記録が見つからない |

### POST /api/meals（既存・参考）

新規食事記録を作成する。`recordedAt`は必須。

#### リクエスト

```http
POST /api/meals
Authorization: Bearer <token>
Content-Type: application/json

{
  "mealType": "breakfast",
  "content": "トーストと目玉焼き",
  "calories": 400,
  "recordedAt": "2026-01-02T07:30:00.000Z"
}
```

## バリデーション

### recordedAt

```typescript
// 既存のdatetimeSchema（変更なし）
const datetimeSchema = z.string().transform((val, ctx) => {
  // ISO形式またはdatetime-local形式を受け付け
  // → ISO形式に変換して返す
});

// フロントエンドでの追加バリデーション（新規）
const validateNotFuture = (date: string): boolean => {
  return new Date(date) <= new Date();
};
```

## 使用例

### 日時のみ変更

```typescript
// フロントエンド
const updateMealDateTime = async (mealId: string, newRecordedAt: string) => {
  const response = await client.api.meals[':id'].$patch({
    param: { id: mealId },
    json: { recordedAt: newRecordedAt }
  });
  return response.json();
};
```

### datetime-localからの変換

```typescript
// datetime-local: "2026-01-01T12:00"
// → ISO: "2026-01-01T12:00:00.000Z"
const toISO = (datetimeLocal: string): string => {
  return new Date(datetimeLocal).toISOString();
};
```
