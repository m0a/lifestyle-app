# Research: 栄養素サマリー表示

**Feature**: 013-nutrient-summary
**Date**: 2026-01-04

## 既存実装の調査

### 1. データベーススキーマ

**Decision**: 既存のmeal_recordsテーブルを使用（スキーマ変更不要）

**Rationale**:
- `totalProtein` (real, nullable)
- `totalFat` (real, nullable)
- `totalCarbs` (real, nullable)

これらのフィールドはすでに存在し、AI分析時に値が設定される。手動入力の場合はnull。

**Alternatives considered**:
- 新規テーブル作成 → 不要（既存フィールドで十分）

### 2. 共有型定義

**Decision**: `MealSummary`型を拡張してマクロ栄養素を追加

**Rationale**:
現在の`MealSummary`型（packages/shared/src/types/index.ts:104-108）:
```typescript
export interface MealSummary {
  totalCalories: number;
  averageCalories: number;
  count: number;
}
```

拡張後:
```typescript
export interface MealSummary {
  totalCalories: number;
  averageCalories: number;
  count: number;
  totalProtein: number;  // 追加
  totalFat: number;      // 追加
  totalCarbs: number;    // 追加
}
```

**Alternatives considered**:
- 別の型を新規作成 → 既存の型を拡張する方がシンプル
- NutritionTotals型を再利用 → MealSummaryはカウントなどの追加情報を持つため別構造が適切

### 3. バックエンド計算ロジック

**Decision**: `DashboardService.calculateMealSummary`メソッドを拡張

**Rationale**:
現在の実装（packages/backend/src/services/dashboard.ts:180-208）はカロリーのみ集計。
拡張して栄養素も集計する。

**変更箇所**:
1. `MealRecord`インターフェースに栄養素フィールド追加（ローカル定義）
2. `calculateMealSummary`で栄養素を合計

**Alternatives considered**:
- 新規メソッド作成 → 既存メソッド拡張の方がシンプル

### 4. フロントエンドUI

**Decision**: 既存カードにコンパクトに統合

**Rationale**:
- CalorieSummary: 「今日のカロリー」カードの下部に `P: XX.Xg F: XX.Xg C: XX.Xg` 形式で追加
- MealSummaryCard: カロリー表示の下部に同様の形式で追加

これは既存のMealList/MealDetailで使用されている表示形式と一貫性がある。

**Alternatives considered**:
- 新規カード追加 → 情報過多、Simple UX原則に反する
- タブ切り替え → 追加のインタラクションが必要

### 5. 表示形式

**Decision**: 「P: 52.3g F: 23.1g C: 45.2g」形式

**Rationale**:
- 既存のMealListで同形式が使用されている
- コンパクトで一目で把握可能
- P=Protein, F=Fat, C=Carbs は国際的に認知された略称

**Alternatives considered**:
- フルネーム表示（たんぱく質: 52.3g） → スペースを取りすぎる
- アイコン使用 → 追加のアセットが必要

### 6. null値の処理

**Decision**: nullは0として扱う

**Rationale**:
- FR-004で明示的に定義
- 手動入力の食事は栄養素データがnull
- 合計計算時は0として含める

**Alternatives considered**:
- nullの食事を除外 → ユーザー混乱の可能性
- 「データなし」表示 → 合計が意味をなさなくなる

## テスト戦略

### ユニットテスト
- `calculateMealSummary`: 栄養素合計の正確性
- null値を含むデータの処理
- 空配列の処理

### 統合テスト
- `/api/dashboard/summary`エンドポイントのレスポンス検証
- 栄養素フィールドが含まれることを確認

### E2Eテスト（オプション）
- 食事一覧ページで栄養素表示を確認
- ダッシュボードで栄養素表示を確認

## リスク評価

| リスク | 影響 | 軽減策 |
|--------|------|--------|
| 既存テストの破損 | 中 | MealSummary型の拡張は後方互換 |
| パフォーマンス低下 | 低 | 既存クエリに追加フィールドを含めるのみ |
| UI表示崩れ | 低 | 既存カードに1行追加のみ |

## 結論

すべてのNEEDS CLARIFICATIONは解決済み。Phase 1に進行可能。
