# Data Model: 運動記録フォームと履歴表示のシンプル化

**Date**: 2026-01-09
**Feature**: 001-remove-ui-elements

## Overview

この機能は既存のデータモデルを変更しない。運動記録（Exercise Record）エンティティは既存のまま使用し、UIレイヤーのみを変更する。

## Entities

### Exercise Record（運動記録）

**既存エンティティ - 変更なし**

運動の実施記録を表すエンティティ。筋トレやランニングなどの種目、セット数、回数、実施日時を記録する。

#### Fields

| Field | Type | Required | Description | Validation | Default |
|-------|------|----------|-------------|------------|---------|
| `id` | string | Yes | レコードの一意識別子 | UUID v4 | Auto-generated |
| `userId` | string | Yes | 記録したユーザーのID | Foreign key to users | From auth context |
| `exerciseType` | string | Yes | 運動種目名 | 1-50文字 | None |
| `sets` | number | Yes | セット数 | 1-20の整数 | None |
| `reps` | number | Yes | 1セットあたりの回数 | 1-100の整数 | None |
| `recordedAt` | string (ISO 8601) | Yes | 記録日時 | ISO 8601形式、未来日時は不可 | **変更前**: ユーザー入力<br>**変更後**: 現在時刻（自動） |
| `createdAt` | string (ISO 8601) | Yes | レコード作成日時 | ISO 8601形式 | Auto-generated |
| `updatedAt` | string (ISO 8601) | Yes | レコード更新日時 | ISO 8601形式 | Auto-generated |

#### Relationships

- **Many-to-One** with User: `userId` → `users.id`

#### State Transitions

なし（運動記録は状態を持たない）

#### Validation Rules

既存のZodスキーマ（`packages/shared/src/schemas/exercise.ts`）を使用:

```typescript
export const createExerciseSchema = z.object({
  exerciseType: z.string().min(1).max(50),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  recordedAt: z.string().datetime().optional(), // ← オプショナル（既存）
});
```

**変更内容**:
- `recordedAt`は既にオプショナル
- フロントエンドで省略された場合、`defaultValues`で現在時刻を自動設定
- バックエンドでも省略された場合、サーバー側で現在時刻を設定（既存の実装）

## UI State Model

### ExerciseInput Component State

**変更前**:
```typescript
{
  exerciseType: string,
  sets: number,
  reps: number,
  recordedAt: string,  // ユーザーが datetime-local で入力
  showCustomInput: boolean,
  successMessage: string | null,
}
```

**変更後**:
```typescript
{
  exerciseType: string,
  sets: number,
  reps: number,
  recordedAt: string,  // defaultValues で自動設定（UI非表示）
  showCustomInput: boolean,
  successMessage: string | null,
}
```

**変更点**: `recordedAt`はフォームstateに存在するが、UIには表示されない

### Exercise Page State

**変更前**:
```typescript
{
  filterType: string,           // 種目フィルタ用
  allExerciseTypes: string[],   // フィルタ選択肢
  exercises: ExerciseRecord[],  // フィルタ済みリスト
}
```

**変更後**:
```typescript
{
  exercises: ExerciseRecord[],  // 全記録（フィルタなし）
}
```

**変更点**: `filterType`と`allExerciseTypes`を削除

## API Contracts

### POST /api/exercises

**既存エンドポイント - 変更なし**

運動記録を作成する。

#### Request

```typescript
POST /api/exercises
Content-Type: application/json
Authorization: Bearer {token}

{
  "exerciseType": "ランニング",
  "sets": 1,
  "reps": 30,
  "recordedAt": "2026-01-09T10:30:00.000Z"  // ← オプショナル
}
```

**変更内容**:
- `recordedAt`は既にオプショナル（既存の実装）
- フロントエンドから送信される値は、`defaultValues`で設定された現在時刻
- 省略された場合、バックエンドで現在時刻を設定

#### Response

```typescript
{
  "id": "uuid-here",
  "userId": "user-uuid",
  "exerciseType": "ランニング",
  "sets": 1,
  "reps": 30,
  "recordedAt": "2026-01-09T10:30:00.000Z",
  "createdAt": "2026-01-09T10:30:00.000Z",
  "updatedAt": "2026-01-09T10:30:00.000Z"
}
```

### GET /api/exercises

**既存エンドポイント - 動作変更**

運動記録の一覧を取得する。

**変更前**:
```typescript
GET /api/exercises?exerciseType=ランニング  // フィルタあり
```

**変更後**:
```typescript
GET /api/exercises  // フィルタパラメータなし（すべて取得）
```

**変更内容**:
- フロントエンドから`exerciseType`クエリパラメータを送信しない
- バックエンドAPIはパラメータがない場合、全記録を返す（既存の実装）

#### Response

```typescript
{
  "exercises": [
    {
      "id": "uuid-1",
      "exerciseType": "ランニング",
      "sets": 1,
      "reps": 30,
      "recordedAt": "2026-01-09T10:30:00.000Z",
      // ...
    },
    {
      "id": "uuid-2",
      "exerciseType": "腕立て伏せ",
      "sets": 3,
      "reps": 10,
      "recordedAt": "2026-01-09T09:15:00.000Z",
      // ...
    }
  ],
  "weeklySummary": { /* ... */ }
}
```

## Database Schema

**変更なし**

既存の`exercise_records`テーブルをそのまま使用。

```sql
CREATE TABLE exercise_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,  -- ISO 8601 datetime
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_exercise_user_recorded
  ON exercise_records(user_id, recorded_at DESC);
```

**インデックス**: `user_id`と`recorded_at`の複合インデックスが存在し、時系列ソートに最適化されている。

## Data Flow

### 新規記録作成フロー

```
[ユーザー操作]
  ↓ 1. 種目・セット・回数を入力
[ExerciseInput Component]
  ↓ 2. 「記録する」ボタンクリック
[react-hook-form]
  ↓ 3. defaultValues から recordedAt を取得（現在時刻）
[handleFormSubmit]
  ↓ 4. { exerciseType, sets, reps, recordedAt } を送信
[TanStack Query: useMutation]
  ↓ 5. POST /api/exercises
[Hono API Route]
  ↓ 6. Zod validation（recordedAt は省略可）
[Exercise Service]
  ↓ 7. DB挿入（recordedAt が省略されていればサーバー時刻を使用）
[D1 Database]
  ↓ 8. 保存完了
[API Response]
  ↓ 9. 新規レコードを返す
[TanStack Query]
  ↓ 10. キャッシュ無効化 & 再取得
[ExerciseList Component]
  ↓ 11. 履歴に新規記録を表示（時系列順）
```

**変更点**:
- ステップ3で、ユーザー入力ではなく`defaultValues`から値を取得
- ステップ11で、フィルタなしですべての記録を時系列表示

### 履歴表示フロー（フィルタなし）

```
[Exercise Page Load]
  ↓ 1. useExercises() を呼び出し（パラメータなし）
[TanStack Query: useQuery]
  ↓ 2. GET /api/exercises（クエリパラメータなし）
[Hono API Route]
  ↓ 3. user_id でフィルタ、recorded_at で降順ソート
[D1 Database]
  ↓ 4. すべての運動記録を取得
[API Response]
  ↓ 5. { exercises, weeklySummary } を返す
[Exercise Page]
  ↓ 6. ExerciseList にすべての記録を渡す
[ExerciseList Component]
  ↓ 7. 時系列順に表示（種目ごとのグループ化なし）
```

**変更点**:
- ステップ1-2で、`exerciseType`パラメータを送信しない
- ステップ7で、フィルタUIを表示しない

## Edge Cases & Validation

### 1. 過去の記録を編集する場合

**仕様**: FR-005「記録編集時に、元の記録日時を保持し、編集時刻で上書きしてはならない」

**実装**:
- ExerciseList.tsxの編集機能は`sets`と`reps`のみ変更可能
- `recordedAt`は編集対象外（既存の実装を維持）

**データフロー**:
```
[編集モード]
  ↓ sets/reps を変更
[PATCH /api/exercises/:id]
  ↓ { sets, reps } のみ送信（recordedAt は含まない）
[Exercise Service]
  ↓ recordedAt は変更せず、updatedAt のみ更新
[D1 Database]
  ↓ sets, reps, updatedAt を更新
```

### 2. 複数の記録を短時間で連続登録する場合

**仕様**: エッジケース「それぞれの記録登録時の現在時刻が個別に保存され、秒単位で時系列が正確に記録される」

**実装**:
- 各フォーム送信時に`new Date().toISOString()`を呼び出し
- ミリ秒単位で異なる時刻が保存される

**データフロー**:
```
[記録1] 10:30:00.123 → POST → 保存
[記録2] 10:30:02.456 → POST → 保存  (2.3秒後)
[記録3] 10:30:05.789 → POST → 保存  (3.3秒後)
```

### 3. 時刻の自動記録エラー

**仕様**: エッジケース「クライアントの時刻が不正（未来の日時など）な場合でも、サーバー側で記録時刻を検証・補正する」

**実装**:
- バックエンドで`recordedAt`が未来日時の場合、サーバー時刻で上書き
- または400エラーを返す（既存の実装に依存）

**検証ロジック**（既存のバックエンド実装を確認する必要あり）:
```typescript
// packages/backend/src/services/exercise.ts
if (new Date(recordedAt) > new Date()) {
  // Option 1: サーバー時刻で上書き
  recordedAt = new Date().toISOString();

  // Option 2: エラーを返す
  throw new Error('recordedAt cannot be in the future');
}
```

## Summary

- ✅ データモデルは既存のまま（変更なし）
- ✅ `recordedAt`はオプショナル（既存のスキーマ）
- ✅ UIレイヤーで`defaultValues`を使用して現在時刻を自動設定
- ✅ フィルタパラメータを削除し、すべての記録を取得
- ✅ 編集機能は`recordedAt`を変更しない（既存の動作を維持）

新規のマイグレーションやスキーマ変更は不要。
