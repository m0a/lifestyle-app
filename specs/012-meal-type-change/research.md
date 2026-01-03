# Research: 食事タイプの変更機能

**Date**: 2026-01-03
**Feature**: 012-meal-type-change

## Technical Context Analysis

この機能は既存のAIチャット機能の拡張であり、新規技術の調査は不要。以下は既存実装の分析結果。

### 既存アーキテクチャの把握

#### 1. ChatChange スキーマ構造

**現状** (`packages/shared/src/schemas/meal-analysis.ts:104-123`):
```typescript
export const chatChangeSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), foodItem: createFoodItemSchema }),
  z.object({ action: z.literal('update'), foodItemId: z.string().uuid(), foodItem: updateFoodItemSchema }),
  z.object({ action: z.literal('remove'), foodItemId: z.string().uuid() }),
  z.object({ action: z.literal('set_datetime'), recordedAt: z.string().datetime() }),
]);
```

**Decision**: `set_meal_type` アクションを追加
**Rationale**: 既存の discriminated union パターンに従い、最小限の変更で機能を追加できる
**Alternatives considered**:
- `set_datetime` と統合する案 → 責務が異なるため却下
- 新しいスキーマを作成する案 → 既存パターンと一貫性がなくなるため却下

#### 2. AIプロンプト構造

**現状** (`packages/backend/src/services/ai-chat.ts:5-53`):
- 日時変更用の `set_datetime` アクションの説明あり
- 食事タイプ（朝食/昼食/夕食/間食）の変更指示なし

**Decision**: AIプロンプトに `set_meal_type` アクションを追加
**Rationale**: 既存の日時変更パターンと同じ形式で、AIが理解しやすい
**Alternatives considered**:
- `set_datetime` と同時に食事タイプを推測させる案 → ユーザーの明示的な指示なしに変更されるリスクがあるため却下

#### 3. バックエンド処理

**現状** (`packages/backend/src/routes/meal-chat.ts:221-269`):
- `switch` 文で各アクションを処理
- `set_datetime` は `mealRecords.recordedAt` を更新

**Decision**: `set_meal_type` ケースを追加し、`mealRecords.mealType` を更新
**Rationale**: 既存のパターンに完全に準拠
**Alternatives considered**: なし（明確な最善策）

#### 4. フロントエンド表示

**現状** (`packages/frontend/src/components/meal/MealChat.tsx:191-196`):
```typescript
{change.action === 'set_datetime' && `日時変更: ${toDateTimeLocal(change.recordedAt)}`}
```

**Decision**: `set_meal_type` の表示ロジックを追加
**Rationale**: ユーザーが変更内容を理解できるよう、日本語で食事タイプを表示
**Alternatives considered**: なし

### 食事タイプの日本語マッピング

| 内部値 | 日本語表示 | 認識すべき表現 |
|--------|-----------|---------------|
| breakfast | 朝食 | 朝ごはん, 朝食, breakfast, モーニング |
| lunch | 昼食 | 昼ごはん, 昼食, ランチ, lunch |
| dinner | 夕食 | 夕ごはん, 夕食, 夕飯, ディナー, dinner |
| snack | 間食 | 間食, おやつ, snack |

### 非標準表現のマッピング

| 表現 | マッピング先 | 理由 |
|------|-------------|------|
| 夜食 | dinner または snack | 時間帯によって判断（22時以降はsnack） |
| ブランチ | lunch | 昼食に最も近い |
| 軽食 | snack | 間食に最も近い |

## データモデル変更

### 変更なし
- `meal_records` テーブルには既に `meal_type` カラムが存在
- 既存の enum 制約 (`breakfast`, `lunch`, `dinner`, `snack`) をそのまま使用

### ChatChange スキーマ追加

```typescript
z.object({
  action: z.literal('set_meal_type'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
})
```

## Implementation Risk Assessment

| リスク | 影響度 | 対策 |
|--------|-------|------|
| AIが食事タイプを誤認識 | 中 | ユーザーが適用前に確認できるUI |
| 既存テストの破損 | 低 | discriminated union の拡張なので後方互換性あり |
| パフォーマンス低下 | 低 | 追加の処理は1つのDB更新のみ |

## Conclusion

すべての技術的な疑問点は解決済み。既存パターンに従った実装で、リスクは最小限。
