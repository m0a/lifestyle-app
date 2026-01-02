# Research: 食事日時コントロール

**Date**: 2026-01-03
**Feature**: 011-meal-datetime

## 調査項目

### 1. 既存実装の確認

#### バックエンドAPI

**調査結果**: `recordedAt`の更新は既にサポート済み

- `packages/backend/src/services/meal.ts:128-130` で `input.recordedAt` が渡されれば更新される
- `packages/shared/src/schemas/index.ts:71-76` の `updateMealSchema` で `recordedAt` はオプショナルフィールドとして定義済み
- バックエンドの変更は不要

**Decision**: バックエンドはそのまま利用
**Rationale**: 既存のupdateMealSchemaとMealServiceがrecordedAtの更新をサポート
**Alternatives considered**: なし（既に実装済み）

#### フロントエンド新規登録

**調査結果**: `MealInput.tsx` に `datetime-local` 入力あり

- `packages/frontend/src/components/meal/MealInput.tsx:116-130` で日時入力フィールドが存在
- デフォルト値は `new Date().toISOString().slice(0, 16)` で現在日時
- 基本機能は動作するが、UX改善の余地あり

**Decision**: 既存のdatetime-local入力を維持し、UIを改善
**Rationale**: ブラウザネイティブのdatetime-localはモバイルで使いやすいUIを提供
**Alternatives considered**:
- カスタム日時ピッカーライブラリ → バンドルサイズ増加、複雑さ追加のためNG

#### フロントエンド編集画面

**調査結果**: `MealEditMode.tsx` に日時編集機能なし

- `packages/frontend/src/components/meal/MealEditMode.tsx` は食材編集・写真管理のみ
- 日時変更UIを追加する必要あり

**Decision**: MealEditModeに日時編集セクションを追加
**Rationale**: 既存の編集モードUIパターンに合わせる
**Alternatives considered**:
- 別モーダルで日時編集 → タップ数増加でNG（SC-002: 3タップ以内）

### 2. 日時バリデーション

**調査結果**: 未来日時の拒否は既存スキーマで対応可能

- `datetimeSchema` はISO形式への変換のみで、未来チェックなし
- フロントエンドで未来日時チェックを追加する必要あり

**Decision**: フロントエンドで未来日時バリデーションを追加
**Rationale**:
- 即座のフィードバックでUX向上
- バックエンドでも追加バリデーションを検討可能だが、現時点では不要
**Alternatives considered**:
- バックエンドのみでチェック → フィードバック遅延でUX悪化

### 3. ダッシュボード集計への影響

**調査結果**: 既存機能で対応済み

- ダッシュボードは `recordedAt` を基準に集計
- 日時変更後はTanStack Queryのキャッシュ無効化で自動反映

**Decision**: 既存のキャッシュ無効化パターンを利用
**Rationale**: 食事更新時のmutationは既にキャッシュを無効化している
**Alternatives considered**: なし

### 4. 日時入力UI/UXパターン

**調査結果**:

モバイルでの日時入力ベストプラクティス:
1. `datetime-local` タイプはiOS/Androidで各OSネイティブのピッカーを表示
2. 過去の日付への素早いアクセス（「昨日」「一昨日」ボタン）があるとUX向上
3. 時刻の分は15分/30分単位でも可（秒は不要）

**Decision**:
- datetime-local入力を基本として使用
- クイック選択ボタン（「昨日」「今日」）を追加
- 既存の時刻入力UIはそのまま維持

**Rationale**:
- ネイティブUIの活用でバンドルサイズ抑制
- クイック選択で頻出パターンの操作性向上

## まとめ

| 項目 | 結論 |
|------|------|
| バックエンドAPI | 変更不要（既存で対応済み） |
| 共有スキーマ | 変更不要（既存で対応済み） |
| MealInput.tsx | UI改善（クイック日付ボタン追加検討） |
| MealEditMode.tsx | 日時編集セクション追加 |
| バリデーション | フロントエンドで未来日時チェック追加 |
| ダッシュボード | 変更不要（既存で対応済み） |
