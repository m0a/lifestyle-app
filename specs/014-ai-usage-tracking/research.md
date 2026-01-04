# Research: AI利用量トラッキング

## AI SDKトークン使用量の取得方法

### Decision
Vercel AI SDK (`ai` パッケージ) の `generateObject` と `streamText` から `usage` オブジェクトを取得してトークン量を記録する。

### Rationale
- AI SDKは各API呼び出し後に `usage` オブジェクトを返す
- `usage` には `promptTokens`（入力）と `completionTokens`（出力）が含まれる
- 既存のAI呼び出しコード（`generateObject`, `streamText`）を最小限の変更で拡張可能

### Implementation Details

```typescript
// generateObject の場合
const { object, usage } = await generateObject({...});
// usage = { promptTokens: number, completionTokens: number, totalTokens: number }

// streamText の場合（ストリーム完了後に取得）
const result = streamText({...});
const usage = await result.usage; // Promise<TokenUsage>
```

### Alternatives Considered
1. **トークン数を手動計算**: tiktoken等のライブラリでプロンプト文字列からトークン数を推定 → 不正確、追加依存
2. **APIレスポンスヘッダーから取得**: プロバイダ依存、AI SDKが抽象化 → SDKのusageを使う方がシンプル

---

## データベーススキーマ設計

### Decision
新規テーブル `ai_usage_records` を作成し、各AI呼び出しごとにトークン使用量を記録する。

### Rationale
- 既存テーブル（`meal_records`等）との結合は不要（独立した利用量追跡）
- 将来の機能種別フィルタリングのために `feature_type` カラムを持つ
- 集計クエリのパフォーマンスのために `userId` + `createdAt` にインデックス

### Schema Design

```sql
CREATE TABLE ai_usage_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL,  -- 'image_analysis' | 'text_analysis' | 'chat'
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_ai_usage_user_date ON ai_usage_records(user_id, created_at);
```

### Alternatives Considered
1. **既存テーブルにカラム追加**: `meal_records`に`tokens`カラム → 食事以外のAI利用（将来）に対応できない
2. **累計のみ保存（集計テーブル）**: 詳細履歴が失われる → 将来の分析・デバッグに不便

---

## AI呼び出し箇所の特定

### Decision
以下の3箇所でトークン使用量を記録する：

| 機能 | ファイル | メソッド | feature_type |
|------|----------|----------|--------------|
| 画像分析 | ai-analysis.ts | analyzeMealPhoto | image_analysis |
| テキスト分析 | ai-analysis.ts | analyzeMealText | text_analysis |
| AIチャット | ai-chat.ts | chat | chat |

### Rationale
- これら3つがアプリ内の全AI機能
- 成功時のみ記録（エラー時は記録しない）= 仕様FR-007準拠

---

## 設定ページへの統合

### Decision
既存の `/settings` ページ（`Settings.tsx`）に「AI利用状況」セクションを追加する。

### Rationale
- 既存の「記録統計」セクションと同様のUIパターンを踏襲
- 新規APIエンドポイント `/api/user/ai-usage` を追加して統計を取得

### UI Design
```
+----------------------------------+
| AI利用状況                        |
+----------------------------------+
| 今月のトークン使用量               |
| [12,345] tokens                  |
|                                  |
| 累計トークン使用量                 |
| [123,456] tokens                 |
+----------------------------------+
```

---

## パフォーマンス考慮事項

### Decision
- 集計はDB側のSUM/COUNTクエリで実行
- 設定ページアクセス時にオンデマンドで集計（キャッシュなし）

### Rationale
- 設定ページのアクセス頻度は低い（SC-001: 2秒以内で十分達成可能）
- 初期実装はシンプルに、必要に応じてキャッシュ追加

### Alternatives Considered
1. **定期バッチで累計計算**: 複雑さ増大、リアルタイム性低下
2. **キャッシュ（Redis等）**: 現時点ではオーバーエンジニアリング
