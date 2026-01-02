# Research: 食事編集画面の一貫性改善

**Date**: 2026-01-02
**Feature Branch**: 010-meal-edit-consistency

## Research Tasks

### 1. コンポーネント再利用パターン

**Decision**: AnalysisResult、MealChat、PhotoCaptureを編集モードで直接再利用する

**Rationale**:
- 既存コンポーネントはpropsで制御可能な設計になっている
- SmartMealInputが使用するパターンをMealDetailの編集モードでも適用可能
- 新規抽象化を避け、Simplicity Over Clevernessの原則に準拠

**Alternatives Considered**:
- 新規EditableAnalysisResultコンポーネント作成 → 既存コンポーネントで十分なため却下
- HOCパターンで編集機能をラップ → 過剰な抽象化のため却下

### 2. 状態管理パターン

**Decision**: MealDetailページ内でローカルstate（useState + useReducer）を使用し、TanStack Queryでサーバー状態を同期

**Rationale**:
- SmartMealInputと同じパターンで一貫性を保つ
- 編集中の変更はローカルで管理し、保存時にのみサーバーと同期
- TanStack Queryの`useMutation`で楽観的更新を実装

**Alternatives Considered**:
- Zustandでグローバル編集状態管理 → 編集はページローカルで十分なため却下
- React Contextで編集状態共有 → 単一ページ内なのでprops drillingで十分

### 3. 編集モード切り替えUI

**Decision**: MealDetailページに`isEditing`フラグを追加し、表示モード/編集モードを切り替える

**Rationale**:
- 既存のMealListのインライン編集パターン（editingId state）を参考
- 編集ボタン→編集モード→保存/キャンセルの明確なフロー
- URLは変更せず、同一ページ内でモード切り替え

**Alternatives Considered**:
- 別の編集専用ページ（/meals/:id/edit）→ 画面遷移が増え、UXが低下するため却下
- モーダルダイアログで編集 → 複雑な編集には画面が狭すぎるため却下

### 4. 写真追加/変更のフロー

**Decision**: 既存のPhotoCapture + R2アップロードパターンを再利用

**Rationale**:
- 登録時と同じフローで一貫性を確保
- 一時ストレージ→永続ストレージの移行パターンは変更なし
- 古い写真の削除はR2のオブジェクト削除APIで対応

**Alternatives Considered**:
- 写真の差分アップロード → 実装複雑化、ユースケースが限定的なため却下

### 5. 既存APIの再利用

**Decision**: 既存のmeal-analysis.tsルート（food-items CRUD、recalculateTotals）をそのまま使用

**Rationale**:
- 登録時と編集時で同じAPIを使用することで一貫性を確保
- バックエンドの変更を最小限に抑える
- 既存のテストが編集機能にも適用可能

**Required API Changes**:
- 写真削除API: `DELETE /api/meals/:mealId/photo` を新規追加
- 写真追加/変更: 既存の`POST /api/meals/analyze`を編集モードでも使用可能か検証 → 既存mealIdに写真を紐づける方式が必要

### 6. オフライン対応

**Decision**: 既存のIndexedDBキャッシュを活用し、編集データもローカルに一時保存

**Rationale**:
- Edge Caseで定義された「ネットワーク切断時の動作」に対応
- 既存のオフラインインフラを拡張するだけで実現可能

**Implementation Notes**:
- 編集中のdirty stateをlocalStorageまたはIndexedDBに保存
- オンライン復帰時に自動同期または手動保存を促す

### 7. バックエンド拡張ポイント

**Decision**: 以下のエンドポイントを追加

1. `DELETE /api/meals/:mealId/photo` - 写真削除
2. `POST /api/meals/:mealId/photo` - 既存mealへの写真追加（analyze後にphotoKeyを更新）

**Rationale**:
- 最小限のAPI追加で要件を満たす
- 既存のphotoStorageServiceを再利用

## Technical Decisions Summary

| Area | Decision | Complexity |
|------|----------|------------|
| コンポーネント | 既存を再利用 | Low |
| 状態管理 | useState + TanStack Query | Low |
| UI切り替え | isEditingフラグ | Low |
| 写真操作 | PhotoCapture再利用 + 新規API | Medium |
| API | 既存再利用 + 2エンドポイント追加 | Low |
| オフライン | 既存IndexedDB活用 | Low |

## Dependencies Identified

1. **既存コンポーネント**: AnalysisResult, MealChat, PhotoCapture（変更なし）
2. **既存API**: meal-analysis.ts, meal-chat.ts（変更なし）
3. **新規API**: 写真削除/追加エンドポイント（2件追加）
4. **既存型定義**: FoodItem, MealRecord, ChatMessage（変更なし）

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 既存コンポーネントのpropsが編集モードに不十分 | Medium | 必要に応じてオプショナルpropsを追加 |
| 写真追加APIが複雑化 | Low | 既存のanalyzeフローを参考に設計 |
| 編集中のデータ競合 | Low | 楽観的ロック + 保存時警告で対応（Edge Caseで定義済み） |

## Next Steps

1. data-model.mdで既存エンティティの変更点を明確化
2. contracts/でAPI仕様を定義
3. quickstart.mdで開発開始手順を記載
