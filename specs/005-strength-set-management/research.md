# Research: 筋トレのセット管理の見直し

## 技術調査結果

### 1. 現在のデータモデル

**現状の`exercise_records`テーブル構造:**
```
id, userId, exerciseType, muscleGroup, sets, reps, weight, recordedAt, createdAt, updatedAt
```

**問題点:**
- `sets`はセット数（例: 5）を表すスカラー値
- 実際のトレーニングでは各セットで重量・回数が異なる
- セットごとのバリエーション（ワイド、ナロウ等）を記録できない

### 2. データモデル変更方針

**Decision**: 1セット = 1レコードのモデルに変更

**Rationale**:
- 各セットの詳細を正確に記録可能
- 種目ごとのグループ化はクエリで実現（同日・同種目でGROUP BY）
- 既存データは移行スクリプトで展開（例: 3セット×10回×45kg → 3レコード）

**Alternatives considered**:
- JSON配列でセットを保存 → クエリ性が低下、移行が複雑
- 別テーブル（exercise_sessions + exercise_sets）→ 過度に複雑

### 3. スキーマ変更

**新しいカラム:**
- `setNumber` (integer): セット番号（1, 2, 3...）
- `variation` (text, nullable): バリエーション（ワイド、ナロウ等）

**削除するカラム:**
- `sets` (integer): セット数サマリー → 不要に

**RM計算:**
- Epley公式: `RM = weight × (1 + reps / 30)`
- フロントエンドで計算・表示（DBには保存しない）

### 4. 移行戦略

**Decision**: 既存データを新形式に展開するマイグレーション

**手順:**
1. 新カラム追加（setNumber, variation）
2. 既存データを展開（sets=3 → 3レコードに分割、setNumber=1,2,3）
3. setsカラム削除

**Rationale**:
- データ損失なし
- 既存のユーザーデータを保持
- 段階的な移行が可能

### 5. API設計方針

**Decision**: 既存エンドポイントを修正 + 新規エンドポイント追加

**変更点:**
- `POST /api/exercises` → 複数セットを一括作成可能に
- `GET /api/exercises` → 種目ごとにグループ化したレスポンス
- `GET /api/exercises/grouped` → 種目・日付でグループ化した新エンドポイント

### 6. UI設計

**Decision**: 種目カード内でセットを追加・表示

**UIコンポーネント:**
- `ExerciseGroupCard`: 種目ごとのカード
- `SetRow`: セット1行（セット番号、重量、回数、RM、バリエーション）
- `AddSetButton`: カード内でセット追加

**表示:**
- 重量: kg表示 + (lbs)
- RM: Epley公式で計算表示
- バリエーション: セット行に小さく表示

### 7. 単位変換

**Decision**: kg → lbs変換はフロントエンドで実施

**公式:**
- 1kg = 2.20462lbs (表示時は小数点1桁に丸める)

### 8. 既存コードへの影響

**Backend:**
- `packages/backend/src/db/schema.ts` - exercise_recordsスキーマ変更
- `packages/backend/src/services/exercise.ts` - create/findByUserId修正
- `packages/backend/src/routes/exercises.ts` - レスポンス形式変更
- `packages/shared/src/schemas/index.ts` - Zodスキーマ変更

**Frontend:**
- `packages/frontend/src/components/exercise/StrengthInput.tsx` - 複数セット入力UI
- `packages/frontend/src/components/exercise/ExerciseList.tsx` - グループ化表示
- `packages/frontend/src/hooks/useExercises.ts` - API呼び出し修正

### 9. テスト方針

**Unit Tests:**
- ExerciseService: create, findByUserId, グループ化ロジック
- RM計算ユーティリティ

**Integration Tests:**
- 複数セット作成API
- グループ化取得API

**E2E Tests:**
- セット追加フロー
- 種目別グループ表示
