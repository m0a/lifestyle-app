# Quickstart: AI利用量トラッキング

## 概要

設定ページでAI機能のトークン使用量（累計・今月）を表示する機能。

## ユーザーフロー

### 1. 通常の食事記録

```
1. ユーザーが食事を記録（画像/テキスト/チャット）
2. AI分析が成功
3. バックエンドがトークン使用量を記録
4. ユーザーには通常の分析結果を表示（変更なし）
```

### 2. 利用量の確認

```
1. ユーザーが設定ページ(/settings)にアクセス
2. 「AI利用状況」セクションが表示される
3. 今月のトークン量と累計トークン量を確認
```

---

## 実装チェックポイント

### Phase 1: バックエンド

- [ ] `ai_usage_records`テーブルのマイグレーション作成
- [ ] `AIUsageService`クラス実装
  - `recordUsage(userId, featureType, usage)`
  - `getSummary(userId)`
- [ ] `/api/user/ai-usage`エンドポイント追加
- [ ] 既存AI分析サービスにトークン記録呼び出しを追加

### Phase 2: フロントエンド

- [ ] `Settings.tsx`に「AI利用状況」セクション追加
- [ ] `useQuery`でAI利用統計を取得
- [ ] トークン量の表示フォーマット（1,234 tokens / 1.2M tokens）

### Phase 3: テスト

- [ ] `AIUsageService`ユニットテスト
- [ ] `/api/user/ai-usage`統合テスト
- [ ] E2E: 食事記録後に設定ページでトークン量確認

---

## 手動テストシナリオ

### テスト1: 新規ユーザーの初期状態

1. 新規アカウント作成
2. 設定ページにアクセス
3. **期待結果**: AI利用状況セクションに「今月: 0 tokens」「累計: 0 tokens」と表示

### テスト2: 食事記録後のトークン量更新

1. 食事ページで「サラダチキン」をテキスト入力して分析
2. 記録を保存
3. 設定ページにアクセス
4. **期待結果**: トークン量が0より大きい値で表示

### テスト3: 月をまたいだ場合

1. 月末に食事を記録
2. 翌月1日に設定ページにアクセス
3. **期待結果**: 「今月」が0にリセット、「累計」は前月分を含む

---

## コード例

### バックエンド: トークン記録

```typescript
// ai-analysis.ts
async analyzeMealText(text: string, userId: string, currentTime?: string) {
  const { object, usage } = await generateObject({...});

  if (success && usage) {
    // エラーがあっても分析結果は返す
    await this.aiUsageService.recordUsage(userId, 'text_analysis', usage).catch(console.error);
  }

  return result;
}
```

### フロントエンド: 利用統計表示

```tsx
// Settings.tsx
const { data: aiUsage } = useQuery({
  queryKey: ['user', 'ai-usage'],
  queryFn: async () => {
    const res = await api.user['ai-usage'].$get();
    return res.json();
  },
});

// JSX
<div className="rounded-lg border border-gray-200 bg-white p-6">
  <h2 className="mb-4 text-lg font-semibold text-gray-900">AI利用状況</h2>
  <div className="grid grid-cols-2 gap-4">
    <div className="text-center">
      <p className="text-2xl font-bold text-purple-600">
        {formatTokens(aiUsage?.monthlyTokens ?? 0)}
      </p>
      <p className="text-sm text-gray-500">今月</p>
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900">
        {formatTokens(aiUsage?.totalTokens ?? 0)}
      </p>
      <p className="text-sm text-gray-500">累計</p>
    </div>
  </div>
</div>
```

### ユーティリティ: トークン数フォーマット

```typescript
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  return tokens.toLocaleString();
}
```
