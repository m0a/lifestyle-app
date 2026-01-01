# Research: 食事入力フローの改善

**Date**: 2026-01-01
**Feature**: 003-meal-input-flow

## Research Items

### 1. テキストからカロリー推定のAIプロンプト設計

**Decision**: 既存のai-chat.tsのCHAT_SYSTEM_PROMPTを拡張し、テキスト入力専用のプロンプトを追加

**Rationale**:
- 既存のチャットプロンプトは食事記録のコンテキストを前提としている
- 新規プロンプトは単発のテキスト入力からカロリー・栄養素・食事タイプを一度に推定する必要がある
- 構造化された出力（JSON形式）を返すようにする

**Alternatives considered**:
- 別のAIサービスを使う → 不要、既存のgemini-3-flash-previewで十分
- 複数回のAI呼び出し → 遅延が増えるため不採用

**Proposed prompt structure**:
```
入力テキストを分析し、以下のJSON形式で応答してください：
{
  "foodItems": [{"name": "...", "portion": "medium", "calories": 100, ...}],
  "mealType": "breakfast|lunch|dinner|snack|null",
  "mealTypeReason": "テキストから判定|時刻から推測"
}
```

### 2. 食事タイプ自動判定ロジック

**Decision**: AIによるテキスト解析 + 時刻ベースフォールバック

**Rationale**:
- 「朝ごはん」「昼飯」「夜食」などのキーワードはAIが認識可能
- キーワードがない場合は現在時刻から推測（仕様に記載のルール）

**Time-based rules** (from spec):
- 6:00-10:00 → 朝食
- 11:00-14:00 → 昼食
- 17:00-21:00 → 夕食
- その他 → 間食

**Alternatives considered**:
- クライアント側で時刻判定 → AIレスポンスに含めて一貫性を保つ
- 機械学習モデル → 過剰、AIプロンプトで十分

### 3. 統合UIコンポーネント設計

**Decision**: 新規SmartMealInput.tsxコンポーネントを作成し、既存コンポーネントを組み合わせる

**Rationale**:
- 既存のMealInput.tsxは手動入力用で、AIロジックを追加すると複雑化
- PhotoCapture, AnalysisResult, MealChatは再利用可能
- 新規コンポーネントでこれらを統合

**Component composition**:
```
SmartMealInput
├── テキスト入力欄 + 送信ボタン
├── 写真添付ボタン (PhotoCaptureをモーダルで呼び出し)
├── ローディング表示
├── AnalysisResult (結果表示)
├── MealChat (チャット調整、オプション)
└── 保存ボタン + 食事タイプ選択
```

**Alternatives considered**:
- 既存MealInput.tsxを拡張 → 責務が大きくなりすぎる
- MealAnalysis.tsxを流用 → 写真ベースの設計で再設計が必要

### 4. エラーハンドリング・タイムアウト実装

**Decision**: AbortControllerで10秒タイムアウト、エラー時は手動入力にフォールバック

**Rationale**:
- 仕様でタイムアウト10秒と明記
- ネットワークエラー・AIエラー時もユーザーが記録を継続できるようにする

**Implementation**:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch('/api/meals/analyze-text', {
    signal: controller.signal,
    // ...
  });
} catch (error) {
  if (error.name === 'AbortError') {
    // タイムアウトエラー表示
  }
  // 手動入力モードに切り替え
} finally {
  clearTimeout(timeoutId);
}
```

### 5. 既存ページ削除の影響範囲

**Decision**: MealAnalysis.tsx削除、router.tsx更新、関連インポート削除

**Files to modify**:
- `packages/frontend/src/router.tsx` - /meals/analyzeルート削除
- `packages/frontend/src/pages/Meal.tsx` - AI分析リンク削除
- `packages/frontend/src/pages/MealAnalysis.tsx` - ファイル削除

**No breaking changes**: 未リリースのため後方互換性不要

## Summary

すべての調査項目が解決済み。既存のAIインフラストラクチャを活用し、新規コンポーネント（SmartMealInput.tsx）と新規APIエンドポイント（/api/meals/analyze-text）を追加する設計。
