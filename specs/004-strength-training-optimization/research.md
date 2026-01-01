# Research: 筋トレ最適化運動記録

**Date**: 2026-01-01
**Feature**: 004-strength-training-optimization

## Research Tasks

### 1. 筋トレプリセット種目の定義

**Task**: 一般的な筋トレ種目と部位分類を調査

**Decision**: 以下の7カテゴリ・主要種目を採用

| 部位 (muscleGroup) | 種目名 |
|-------------------|--------|
| chest | ベンチプレス, ダンベルフライ, プッシュアップ |
| back | デッドリフト, ラットプルダウン, ベントオーバーロウ |
| legs | スクワット, レッグプレス, ランジ, カーフレイズ |
| shoulders | ショルダープレス, サイドレイズ, フロントレイズ |
| arms | バイセップカール, トライセップエクステンション |
| core | プランク, クランチ, レッグレイズ |
| other | その他（カスタム入力用） |

**Rationale**:
- ジムでよく使われる基本種目をカバー
- 部位別に分類することで、ユーザーが目的の種目を見つけやすい
- 「その他」でカスタム種目にも対応

**Alternatives considered**:
- より詳細な分類（前腕、僧帽筋など）→ 複雑すぎる、シンプルさ優先
- BIG3のみ → 自重トレやアイソレーション種目に対応できない

### 2. データモデル設計

**Task**: 既存exerciseRecordsからの移行方法を調査

**Decision**: exerciseRecordsテーブルのカラム変更

```
既存:
- id, userId, exerciseType, durationMinutes, recordedAt, createdAt, updatedAt

新規:
- id, userId, exerciseType, sets, reps, weight (nullable), recordedAt, createdAt, updatedAt
```

**Rationale**:
- 既存データがないため、カラムの完全な置き換えが可能
- durationMinutesを削除し、sets/reps/weightに置き換え
- weightはnullable（自重トレーニング対応）

**Alternatives considered**:
- 別テーブル作成 → 不要な複雑さ、既存データなし
- durationMinutesを残す → 筋トレ専用なので不要

### 3. 前回記録取得のAPI設計

**Task**: 種目ごとの直近記録を効率的に取得する方法

**Decision**: GET /api/exercises/last/:exerciseType エンドポイント追加

**Rationale**:
- 種目選択時に1回のAPIコールで前回記録を取得
- クエリ: `ORDER BY recordedAt DESC LIMIT 1`
- インデックス: `idx_exercise_user_type_date` を追加

**Alternatives considered**:
- フロントエンドでフィルタ → パフォーマンス悪化の可能性
- 全履歴取得時に含める → 初期表示時のみ利用可能、種目選択時に再取得必要

### 4. UI/UXパターン

**Task**: 30秒以内記録を実現するUI設計

**Decision**:
1. プリセット種目をボタングリッドで表示
2. 種目選択→セット/レップ/重量入力→記録の3ステップ
3. 前回記録を薄く表示し、タップでコピー

**Rationale**:
- Constitution「3タップ以内で1アクション完了」に準拠
- 既存のMealTypeボタン選択UIパターンを踏襲

**Alternatives considered**:
- ドロップダウン選択 → タップ数増加
- 検索入力 → キーボード表示が面倒

## Resolved Clarifications

すべてのNEEDS CLARIFICATIONは解決済み:

1. ✅ 筋トレ種目プリセット → 7カテゴリ・主要種目で決定
2. ✅ データモデル移行 → 既存カラム置き換え
3. ✅ 前回記録API → 専用エンドポイント追加
4. ✅ UI設計 → ボタングリッド + 3ステップ入力
