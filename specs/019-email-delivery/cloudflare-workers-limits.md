# Cloudflare Workers の制限とバンドルサイズ管理

**作成日**: 2026-01-10
**関連プロジェクト**: lifestyle-app (019-email-delivery)

---

## スクリプトサイズ制限

| プラン | 圧縮後サイズ上限 | 備考 |
|--------|-----------------|------|
| **Free** | 1 MB | 多くのプロジェクトで使用 |
| **Paid** ($5/月〜) | 10 MB | 大規模プロジェクト向け |

### 何がカウントされるか

圧縮後のJavaScriptバンドルサイズ。Wranglerが自動的にminify/圧縮します。

```bash
# バンドルサイズ確認方法
pnpm build
ls -lh dist/index.js
# 例: -rw-r--r-- 1 user user 543K Jan 10 12:00 index.js
```

**現在値**: 543KB (残り 457KB / 1MB)

---

## 実例: React Email を採用しなかった理由

### バンドルサイズの比較

**React Email採用時**:
```
react-email: ~500KB
@react-email/components: ~300KB
react: ~130KB
合計: ~930KB (1MBの93%を消費！)
```

**文字列テンプレート採用時**:
```
追加依存: 0KB
自前実装: ~5KB
```

### 判断基準

1. **スケールの見極め**: 3つのシンプルなメールテンプレートに800KBは過剰
2. **環境制約**: Free プランの1MB制限下では危険
3. **保守性**: 150行の自前コードの方がデバッグ・カスタマイズが容易

### コード例

```typescript
// React Emailの代わりに文字列テンプレート
function passwordResetTemplate(resetUrl: string, locale: 'ja' | 'en'): string {
  const msg = messages[locale];
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <body style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
      <h1>${msg.title}</h1>
      <p>${msg.body}</p>
      <a href="${resetUrl}" style="padding: 12px 32px; background: #007bff; color: white;">
        ${msg.button}
      </a>
    </body>
    </html>
  `;
}
```

---

## その他の重要な制限

| 項目 | Free | Paid |
|------|------|------|
| **CPU時間** | 10ms/リクエスト | 50ms/リクエスト |
| **メモリ** | 128MB | 128MB |
| **リクエスト数** | 100,000/日 | 無制限 |
| **同時実行数** | 1,000 | 無制限 |

### CPU時間制限の影響

```
React Emailのレンダリング: 5-10ms消費
残りの処理時間: 0-5ms（DB、API呼び出し等）
→ リスク: タイムアウトでリクエスト失敗
```

**教訓**: 重い処理は避け、軽量なライブラリを選択する

---

## エッジコンピューティングの設計哲学

### なぜ制限が厳しいか

Cloudflare Workersは**世界275箇所のエッジサーバー**で動作します:

- 各サーバーにスクリプトを配布
- 1MBのスクリプト × 275箇所 = 275MB のグローバル帯域消費
- コスト効率のため制限が必要

### 推奨設計パターン

1. **軽量・高速**: Workersの強みを活かす
2. **重い処理は別サービスへ**: R2 (ストレージ), D1 (DB), Durable Objects (ステート管理)
3. **依存管理**: 「このライブラリは制限の何%を消費するか?」を常に意識

**危険信号**: 1つの依存が制限の50%以上を消費する場合

---

## 制限超過時の挙動

```bash
pnpm wrangler deploy

# エラー例
✘ [ERROR] Script is too large. Maximum size is 1 MiB.
  Your script is 1.2 MiB in size.
```

→ **デプロイ失敗**。本番環境に反映されません。

---

## ベストプラクティス

### 1. 定期的なバンドルサイズ確認

```bash
# CI/CDに組み込む
pnpm build
size=$(stat -f%z dist/index.js 2>/dev/null || stat -c%s dist/index.js)
max_size=1000000  # 1MB

if [ $size -gt $max_size ]; then
  echo "❌ Bundle too large: ${size} bytes (max: ${max_size})"
  exit 1
else
  echo "✅ Bundle size OK: ${size} bytes"
fi
```

### 2. 依存追加時のチェックリスト

新しい依存を追加する前に:

- [ ] **必須の機能か?** 自前実装できないか?
- [ ] **バンドルサイズへの影響は?** `npm view <package> dist.unpackedSize`で確認
- [ ] **Workers環境で動作するか?** Node.js API依存していないか?
- [ ] **CPU時間への影響は?** 重い初期化処理がないか?

### 3. Tree-shakingの活用

```typescript
// ❌ 悪い例: 全体をインポート
import _ from 'lodash';
// → lodashの全機能（~100KB）がバンドルされる

// ✅ 良い例: 必要な関数のみ
import debounce from 'lodash/debounce';
// → debounce関数のみ（~5KB）
```

### 4. 動的インポートの活用（該当する場合）

```typescript
// ❌ すべてのルートで重いライブラリを読み込む
import heavyLib from 'heavy-library';

// ✅ 必要なルートでのみ動的読み込み
const handler = async () => {
  if (needsHeavyProcessing) {
    const { process } = await import('heavy-library');
    return process(data);
  }
};
```

---

## バンドルサイズ削減テクニック

### 1. 不要なポリフィル削除

```javascript
// wrangler.toml
[build]
command = "esbuild src/index.ts --bundle --outfile=dist/index.js --target=esnext"
# target=esnextで最新のJS機能を使用、古いブラウザ用ポリフィル不要
```

### 2. ライブラリの置き換え

| 重いライブラリ | 軽量代替 | サイズ削減 |
|--------------|---------|----------|
| `moment.js` (67KB) | `date-fns` (13KB) | -54KB |
| `axios` (30KB) | `fetch` (組み込み) | -30KB |
| `lodash` (100KB) | 個別import or 自前実装 | -90KB |
| `React Email` (800KB) | 文字列テンプレート | -800KB |

### 3. バンドル分析

```bash
# esbuild metafile生成
esbuild src/index.ts --bundle --metafile=meta.json

# バンドル内容を視覚化
npx esbuild-visualizer --metadata meta.json
```

---

## 実プロジェクトでの適用例

### lifestyle-app (019-email-delivery)

**要件**: パスワードリセット、メール確認、メール変更の3つのHTMLメール送信

**技術選定**:

| 候補 | バンドルサイズ | 決定 |
|-----|-------------|------|
| React Email | +800KB | ❌ 却下 |
| Handlebars | +50KB | ❌ 却下 |
| 文字列テンプレート | +0KB | ✅ 採用 |

**理由**:
- 3つのシンプルなテンプレート（各50行以下）
- テンプレートの変更頻度低い
- 800KBは制限の80%を消費（危険）

**実装**:
```typescript
// packages/backend/src/services/email/templates/password-reset.ts
export function passwordResetTemplate(resetUrl: string, locale: 'ja' | 'en'): string {
  // 50行のHTML文字列
}
```

**結果**: 依存追加なし、バンドルサイズ影響ゼロ

---

## トラブルシューティング

### Q1: バンドルサイズが突然増えた

```bash
# 依存を可視化
pnpm why <package-name>

# 最近追加した依存を確認
git diff HEAD~1 package.json
```

### Q2: Workers環境でNode.js APIエラー

```
Error: Cannot find module 'fs'
```

→ **解決**: Node.js専用APIは使用不可。Workers互換の代替を使用

| Node.js API | Workers代替 |
|------------|------------|
| `fs` | R2, KV |
| `crypto.randomBytes` | `crypto.getRandomValues` (Web Crypto API) |
| `http` | `fetch` |
| `path` | 文字列操作 |

### Q3: CPU時間制限超過

```
Error: Worker exceeded CPU time limit
```

→ **解決**:
1. 重い処理をDurable Objectsに移動
2. 同期処理を非同期に変更
3. キャッシュ活用

---

## まとめ

### 重要ポイント

1. **1MB制限は厳守**: Freeプランでは特に重要
2. **依存は慎重に**: 各依存のサイズとWorkers互換性を確認
3. **定期的な計測**: CI/CDでバンドルサイズをチェック
4. **シンプルさ優先**: 自前実装できるなら依存を増やさない

### 判断基準

| 依存のバンドルサイズ | 判断 |
|------------------|------|
| < 50KB | ✅ 採用検討 |
| 50-200KB | ⚠️ 慎重に評価 |
| 200-500KB | ⚠️ 強い正当化が必要 |
| > 500KB | ❌ 基本的に却下 |

---

## 参考リンク

- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [esbuild Bundle Analysis](https://esbuild.github.io/api/#analyze)
- [OWASP Dependency Management](https://owasp.org/www-project-dependency-check/)
