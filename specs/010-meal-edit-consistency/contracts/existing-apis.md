# Existing APIs (Re-used)

本機能で再利用する既存のAPIエンドポイント一覧。

## Meal CRUD (meals.ts)

| Method | Endpoint | Description | Used For |
|--------|----------|-------------|----------|
| GET | `/api/meals/:id` | 食事詳細取得 | 編集画面の初期データ読み込み |
| PATCH | `/api/meals/:id` | 食事更新 | content, calories, mealType, recordedAt の更新 |

## Food Items (meal-analysis.ts)

| Method | Endpoint | Description | Used For |
|--------|----------|-------------|----------|
| GET | `/api/meals/:mealId/food-items` | 食品アイテム一覧 | 編集画面での表示 |
| POST | `/api/meals/:mealId/food-items` | 食品アイテム追加 | 手動での食品追加 |
| PATCH | `/api/meals/:mealId/food-items/:foodItemId` | 食品アイテム更新 | 分量・栄養素の編集 |
| DELETE | `/api/meals/:mealId/food-items/:foodItemId` | 食品アイテム削除 | 食品の削除 |

## Chat (meal-chat.ts)

| Method | Endpoint | Description | Used For |
|--------|----------|-------------|----------|
| GET | `/api/meals/:mealId/chat` | チャット履歴取得 | 編集画面でのチャット履歴表示 |
| POST | `/api/meals/:mealId/chat` | チャットメッセージ送信 | AIへの編集指示 |
| POST | `/api/meals/:mealId/chat/apply` | チャット提案適用 | AI提案の食品アイテム変更適用 |

## Photo (meal-analysis.ts)

| Method | Endpoint | Description | Used For |
|--------|----------|-------------|----------|
| GET | `/api/meals/photos/*` | 写真取得 | 写真の表示 |

## Response Types

### recalculateTotals Response

食品アイテム操作後に返される栄養素合計:

```typescript
{
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}
```

### FoodItem Response

```typescript
{
  id: string;
  name: string;
  portion: 'small' | 'medium' | 'large';
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}
```

## Authorization

すべてのエンドポイントは認証が必要。
`userId`の検証により、自分の食事記録のみ操作可能。
