# Data Model: トレーニング画像共有機能

**Date**: 2026-01-02
**Feature**: 009-share-training-image

## 既存エンティティ（変更なし）

### ExerciseRecord（exercise_records テーブル）

```typescript
interface ExerciseRecord {
  id: string;
  userId: string;
  exerciseType: string;       // 種目名（例: "ベンチプレス"）
  muscleGroup?: string;       // 筋肉グループ
  setNumber: number;          // セット番号（1, 2, 3...）
  reps: number;               // 回数
  weight?: number;            // 重量（kg）
  variation?: string;         // バリエーション
  recordedAt: string;         // 記録日時（ISO8601）
  createdAt: string;
  updatedAt: string;
}
```

## 新規エンティティ（フロントエンド専用）

### TrainingImageData

画像生成用のデータ構造。APIレスポンスをこの形式に変換する。

```typescript
interface TrainingImageData {
  date: string;               // 表示日付（例: "2026-01-02"）
  title: string;              // タイトル（例: "WorkOut"）
  exercises: ExerciseCardData[];
  footer: string;             // フッター文言（例: "Powered by Lifestyle App"）
}
```

### ExerciseCardData

種目カードのデータ構造。

```typescript
interface ExerciseCardData {
  exerciseType: string;       // 種目名
  maxRM: number;              // 種目の推定最大重量（最大セットの1RM）
  sets: SetDetailData[];
}
```

### SetDetailData

各セットの詳細データ。

```typescript
interface SetDetailData {
  setNumber: number;          // セット番号
  weight: number;             // 重量（kg）
  reps: number;               // 回数
  estimated1RM: number;       // 推定1RM（Epley式）
  isMaxRM: boolean;           // MAX RMフラグ（歴代最高かどうか）
}
```

### MaxRMRecord

種目ごとの歴代最高1RM（バックエンドで計算）。

```typescript
interface MaxRMRecord {
  exerciseType: string;
  maxRM: number;              // 歴代最高1RM
  achievedAt: string;         // 達成日
}
```

## 状態遷移

### 画像共有フロー

```
[トレーニング記録一覧]
        ↓ 「画像を作成」タップ
[画像データ取得中] ← APIからExerciseRecord[]取得
        ↓           + MaxRMRecord[]取得
[プレビュー表示] → TrainingImageData生成
        ↓ 「共有」タップ
[画像生成中] ← html-to-imageでBLOB生成
        ↓
[共有シート表示] ← Web Share API呼び出し
        ↓ アプリ選択
[共有完了] or [キャンセル → プレビューに戻る]
```

## 計算ロジック

### 1RM計算（Epley式）

```typescript
function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + 0.0333 * reps));
}
```

### MAX RM判定

```typescript
function isMaxRM(current1RM: number, historicalMax1RM: number): boolean {
  return current1RM > historicalMax1RM;
}
```

## バリデーションルール

| フィールド | ルール |
|-----------|--------|
| weight | 0 < weight ≤ 500 |
| reps | 1 ≤ reps ≤ 100 |
| setNumber | 1 ≤ setNumber ≤ 20 |
| exerciseType | 非空、100文字以内 |

## インデックス要件

既存インデックスで対応可能：
- `idx_exercise_user_type_date` on (userId, exerciseType, recordedAt)
  - MAX RM取得クエリで使用
