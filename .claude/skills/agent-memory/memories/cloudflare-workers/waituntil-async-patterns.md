---
summary: "ctx.waitUntil()の詳細解説 - fire-and-forget vs await vs waitUntilの違い、実装パターン、エラーハンドリング"
created: 2026-01-10
tags: [cloudflare-workers, async, performance, email, background-tasks]
related: [packages/backend/src/routes/auth.ts, packages/backend/src/services/email/]
---

# Cloudflare Workers `ctx.waitUntil()` 完全ガイド

## 問題: Fire-and-forgetが動かない理由

Cloudflare Workersでは、レスポンス返却後にWorkerが停止スケジュールされるため、ペンディング中のPromiseは破棄される。

```typescript
// ❌ これは動かない！
app.post('/register', async (c) => {
  const user = await createUser();
  
  sendEmail(user.email);  // レスポンス後にWorker停止 → 未完了
  
  return c.json({ user }, 201);
});
```

## 3つのパターン比較

### パターン1: `await`（現在の実装）
```typescript
const user = await createUser();
await sendEmail(user.email);  // ← ここで600ms待機
return c.json({ user }, 201);  // 700ms後にレスポンス
```
- ✅ 処理完了保証
- ❌ レスポンスが遅い（ユーザー待機）
- ✅ エラーをレスポンスに反映可能

### パターン2: Fire-and-forget
```typescript
const user = await createUser();
sendEmail(user.email);  // ← 実行されない！
return c.json({ user }, 201);
```
- ❌ **Workersでは動かない**
- ❌ Promise破棄される

### パターン3: `ctx.waitUntil()`（推奨）
```typescript
const user = await createUser();
c.executionCtx.waitUntil(sendEmail(user.email));
return c.json({ user }, 201);  // 即座にレスポンス
```
- ✅ 処理完了保証
- ✅ レスポンスが速い
- ❌ エラーをレスポンスに反映不可

## 実行ライフサイクル

```
1. リクエスト受信 → Worker起動
2. レスポンス返却 → Worker停止スケジュール
3. waitUntilなし → 即座に停止（Promise破棄）
   waitUntilあり → 登録済みPromise完了まで待機 → 停止
```

## 実装パターン

### 基本形
```typescript
c.executionCtx.waitUntil(
  sendVerificationEmail(...)
    .catch(error => console.error('Email failed:', error))
);
```

### エラー時にDB記録
```typescript
c.executionCtx.waitUntil(
  (async () => {
    const result = await sendVerificationEmail(...);
    if (!result.success) {
      await logFailedEmail(db, user.email, result.error);
    }
  })()
);
```

### 複数タスク並列実行
```typescript
c.executionCtx.waitUntil(sendEmail(user.email));
c.executionCtx.waitUntil(logUserRegistration(user.id));
c.executionCtx.waitUntil(updateAnalytics('user_registered'));
// 全て並列実行、全完了後にWorker停止
```

### リトライロジック付き
```typescript
c.executionCtx.waitUntil(
  (async () => {
    try {
      await sendEmailWithRetry(email, { maxRetries: 3 });
    } catch (error) {
      console.error('Email failed after retries:', error);
      await sendToDeadLetterQueue({ email, error });
    }
  })()
);
```

## 使い分けフローチャート

```
タスクの結果がレスポンスに必要？
  ├─ YES → await
  └─ NO → タスクが失敗した場合、ユーザーに通知が必要？
      ├─ YES → await
      └─ NO → waitUntil()

例：
- ユーザー作成 → await（レスポンスに必要）
- 支払い処理 → await（失敗時に通知必要）
- メール送信 → waitUntil（非同期でOK）
- ログ記録 → waitUntil（非同期でOK）
- 分析送信 → waitUntil（失敗OK）
```

## エラーハンドリングの重要性

```typescript
// ❌ 悪い例：エラーハンドリングなし
c.executionCtx.waitUntil(
  sendEmail(email)  // エラーで失敗するとWorkerがクラッシュ
);

// ✅ 良い例：適切なエラーハンドリング
c.executionCtx.waitUntil(
  sendEmail(email).catch((error) => {
    console.error('Background email send failed:', error);
    return logError('email_send_failed', error);
  })
);
```

**重要**: waitUntil内のエラーはユーザーに見えない。ログとメトリクスが唯一のデバッグ手段。

## Cloudflare Workers制約

- **CPU時間**: Free 10ms, Paid 50ms（標準）, 30秒（Unbound）
- **メモリ**: 128MB（標準）
- **サブリクエスト**: Free 50/リクエスト, Paid 1000/リクエスト

## デバッグ用ラッパー

```typescript
function monitoredWaitUntil(
  ctx: ExecutionContext,
  promise: Promise<any>,
  taskName: string
) {
  const startTime = Date.now();
  
  ctx.waitUntil(
    promise
      .then(() => {
        const duration = Date.now() - startTime;
        console.log(`[waitUntil] ${taskName} completed in ${duration}ms`);
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        console.error(`[waitUntil] ${taskName} failed after ${duration}ms:`, error);
      })
  );
}
```

## Honoでの使用方法

```typescript
import { Hono } from 'hono';

export const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .post('/register', async (c) => {
    const user = await createUser();

    // c.executionCtx で ExecutionContext にアクセス
    c.executionCtx.waitUntil(
      sendVerificationEmail(...)
        .then(result => {
          if (result.success) {
            console.log('Email sent successfully');
          } else {
            console.error('Email failed:', result.error);
          }
        })
    );

    return c.json({ user }, 201);  // 即座にレスポンス
  });
```

## テスト環境での考慮

```typescript
if (c.env.ENVIRONMENT === 'test') {
  // テスト環境では await で同期的にテスト
  const result = await sendVerificationEmail(...);
  if (!result.success) {
    console.error('Email failed in test:', result.error);
  }
} else {
  // 本番環境では waitUntil
  c.executionCtx.waitUntil(sendVerificationEmail(...));
}
```

## ベストプラクティス

1. **常にエラーハンドリング**: `.catch()`は必須
2. **ログを充実**: バックグラウンド処理の唯一の可視化手段
3. **タイムアウト設定**: 長時間実行を避ける
4. **リトライロジック**: 重要な処理は指数バックオフでリトライ
5. **メトリクス送信**: 成功率、所要時間を追跡

## パフォーマンス比較

**Before (await)**:
```
登録リクエスト → ユーザー作成（100ms） → メール送信待機（600ms） → レスポンス
合計: 700ms
```

**After (waitUntil)**:
```
登録リクエスト → ユーザー作成（100ms） → レスポンス（メール送信は並行）
合計: 100ms（7倍速い！）
```

## 発見の経緯（lifestyle-app プロジェクト）

プレビュー環境でメール送信が動作しない問題を調査中に発見：

1. fire-and-forget（`.catch()`のみ）で実装
2. ログに「Calling sendVerificationEmail」は出るが、関数内部のログが出ない
3. D1データベース（email_delivery_logs、email_verification_tokens）が完全に空
4. Resend APIへのリクエストも一切なし

**原因**: レスポンス返却後にWorkerが停止し、ペンディング中のPromiseが破棄されていた。

**解決策**: 
- 短期: `await`に変更（動作確認完了）
- 長期: `ctx.waitUntil()`への移行を検討（パフォーマンス向上）

## 関連ファイル

- `packages/backend/src/routes/auth.ts` - 登録処理でメール送信を呼び出し
- `packages/backend/src/services/email/email-verification.service.ts` - メール送信ロジック

## 参考資料

- Cloudflare Workers Documentation: ExecutionContext
- Hono Documentation: Context API
