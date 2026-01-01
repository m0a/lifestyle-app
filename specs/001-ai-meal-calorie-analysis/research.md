# Research: AI食事写真カロリー分析

**Date**: 2026-01-01
**Feature**: 001-ai-meal-calorie-analysis

## 1. マルチモーダルLLM SDK選定

### Decision: Vercel AI SDK

### Rationale

- **プロバイダー抽象化**: OpenAI, Anthropic, Google等を統一インターフェースで切り替え可能
- **ストリーミング対応**: チャット機能でのリアルタイム応答に必要
- **Edge Runtime対応**: Cloudflare Workersで動作可能
- **TypeScript First**: 型安全性が高い
- **コスト最適化**: プロバイダー切り替えでコスト比較が容易

### Alternatives Considered

| Option | Pros | Cons | Rejected Because |
|--------|------|------|------------------|
| 直接API呼び出し | シンプル、依存少 | プロバイダー切り替え困難 | モデル切り替え要件を満たさない |
| LangChain.js | 機能豊富 | 重い、複雑 | Simplicityの原則に反する |
| OpenAI SDK直接 | 公式サポート | OpenAIロックイン | モデル切り替え要件を満たさない |

### Implementation Notes

```typescript
// ai-provider.ts での抽象化例
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export type AIProvider = 'openai' | 'anthropic' | 'google';

export function getAIProvider(provider: AIProvider, apiKey: string) {
  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey });
    case 'anthropic':
      return createAnthropic({ apiKey });
    case 'google':
      return createGoogleGenerativeAI({ apiKey });
  }
}
```

---

## 2. マルチモーダルLLMモデル選定

### Decision: Gemini 3 Flash (デフォルト)、切り替え可能

### Rationale

- **体験品質**: 最新モデルで画像認識精度・応答品質が最高
- **コスト効率**: Flashモデルで低コストを維持
- **応答速度**: 高速（5秒以内の要件を満たす）
- **日本語対応**: 日本の食事に対応

### Cost Comparison (2026年時点)

| Model | Input (1M tokens) | Output (1M tokens) | 適性 |
|-------|-------------------|-------------------|------|
| Gemini 3 Flash | $0.50 | $3.00 | ✅ 推奨（最新・高品質・高速） |
| Gemini 2.5 Flash | $0.15 | $0.60 | コスト最優先時 |
| GPT-4o-mini | $0.15 | $0.60 | OpenAI希望時 |
| Claude 3.5 Haiku | $0.80 | $4.00 | Anthropic希望時 |

### Configuration

```typescript
// 環境変数でモデル切り替え
AI_PROVIDER=google
AI_MODEL=gemini-3-flash
```

---

## 3. 写真ストレージ（Cloudflare R2）

### Decision: Cloudflare R2を使用

### Rationale

- **Cloudflareエコシステム統合**: Workersから直接アクセス、低レイテンシ
- **S3互換API**: 既存の知識・ツールが使える
- **egress無料**: 読み取りコストがかからない
- **コスト効率**: S3より安価

### Implementation Strategy

```typescript
// photo-storage.ts
export class PhotoStorageService {
  constructor(private r2: R2Bucket) {}

  async uploadForAnalysis(file: File): Promise<string> {
    // 分析用: 一時的にフルサイズで保存（分析後削除）
    const key = `temp/${crypto.randomUUID()}`;
    await this.r2.put(key, file);
    return key;
  }

  async saveForRecord(tempKey: string, mealId: string): Promise<string> {
    // 記録用: リサイズして永続保存
    const tempObject = await this.r2.get(tempKey);
    const resized = await this.resizeImage(tempObject, 800); // 最大800px
    const permanentKey = `meals/${mealId}/photo.jpg`;
    await this.r2.put(permanentKey, resized);
    await this.r2.delete(tempKey); // 一時ファイル削除
    return permanentKey;
  }

  async deleteForRecord(mealId: string): Promise<void> {
    await this.r2.delete(`meals/${mealId}/photo.jpg`);
  }
}
```

---

## 4. 画像リサイズ戦略

### Decision: Cloudflare Imagesまたはブラウザ側リサイズ

### Rationale

#### Option A: ブラウザ側リサイズ（推奨）

- **メリット**: サーバー負荷なし、アップロード転送量削減
- **実装**: Canvas APIでリサイズ後にアップロード

#### Option B: Cloudflare Images

- **メリット**: 高品質リサイズ、Workers負荷なし
- **デメリット**: 追加コスト

### Implementation (Browser-side)

```typescript
// PhotoCapture.tsx
async function resizeImage(file: File, maxSize: number): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = new OffscreenCanvas(img.width * scale, img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
}

// アップロード時
const analysisImage = await resizeImage(file, 1024); // 分析用: 1024px
const recordImage = await resizeImage(file, 800);    // 記録用: 800px
```

---

## 5. 食事分析プロンプト設計

### Decision: 構造化出力（JSON mode）を使用

### Rationale

- **パース容易**: JSON形式で安定した出力
- **型安全**: Zodスキーマで検証可能
- **一貫性**: 同じ形式での出力保証

### Prompt Template

```typescript
const MEAL_ANALYSIS_PROMPT = `
あなたは食事の栄養分析の専門家です。
提供された食事の写真を分析し、以下のJSON形式で結果を返してください。

## 出力形式
{
  "foods": [
    {
      "name": "食材名（日本語）",
      "portion": "small" | "medium" | "large",
      "calories": 推定カロリー（整数）,
      "protein": タンパク質g（小数点1桁）,
      "fat": 脂質g（小数点1桁）,
      "carbs": 炭水化物g（小数点1桁）
    }
  ],
  "isFood": true/false,
  "message": "食事が認識できない場合のメッセージ"
}

## ルール
- 写真に写っている全ての食材を識別してください
- カロリーと栄養素は一般的な量を基準に推定してください
- portion は見た目から small/medium/large で判断してください
- 食事以外の写真の場合は isFood: false を返してください
`;
```

---

## 6. チャット機能設計

### Decision: セッション管理 + ストリーミング応答

### Rationale

- **文脈維持**: 会話履歴を保持して適切な応答
- **リアルタイム**: ストリーミングでUX向上
- **変更適用**: 構造化された変更提案と承認フロー

### Implementation Pattern

```typescript
// ai-chat.ts
export class MealChatService {
  async chat(
    currentMeal: FoodItem[],
    chatHistory: ChatMessage[],
    userMessage: string
  ): AsyncIterable<string> {
    const systemPrompt = `
あなたは食事の栄養アドバイザーです。
現在の食事内容を参照して、ユーザーの質問や調整リクエストに応答してください。

現在の食事:
${JSON.stringify(currentMeal, null, 2)}

## 応答ルール
- 変更を提案する場合は、具体的な食材と量を示してください
- 変更提案は [CHANGE: {"action": "add|remove|update", "food": {...}}] 形式で含めてください
- 栄養バランスについて質問された場合は、具体的な数値で説明してください
`;
    // ストリーミング応答を返す
  }
}
```

---

## 7. データベース拡張

### Decision: 既存meal_recordsテーブルを拡張 + 新規テーブル追加

### Rationale

- **後方互換性**: 既存の食事記録機能を壊さない
- **正規化**: 食材詳細は別テーブルで管理

### Schema Changes

```sql
-- 既存テーブルに列追加
ALTER TABLE meal_records ADD COLUMN photo_key TEXT;
ALTER TABLE meal_records ADD COLUMN total_protein REAL;
ALTER TABLE meal_records ADD COLUMN total_fat REAL;
ALTER TABLE meal_records ADD COLUMN total_carbs REAL;
ALTER TABLE meal_records ADD COLUMN analysis_source TEXT; -- 'ai' | 'manual'

-- 新規: 食材詳細テーブル
CREATE TABLE meal_food_items (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portion TEXT NOT NULL, -- 'small' | 'medium' | 'large'
  calories INTEGER NOT NULL,
  protein REAL NOT NULL,
  fat REAL NOT NULL,
  carbs REAL NOT NULL,
  created_at TEXT NOT NULL
);

-- 新規: チャット履歴テーブル
CREATE TABLE meal_chat_messages (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  applied_changes TEXT, -- JSON: 適用された変更
  created_at TEXT NOT NULL
);
```

---

## Summary

| Area | Decision | Key Dependency |
|------|----------|----------------|
| AI SDK | Vercel AI SDK | `ai`, `@ai-sdk/google` |
| Default Model | Gemini 3 Flash | - |
| Photo Storage | Cloudflare R2 | Wrangler bindings |
| Image Resize | Browser-side Canvas API | - |
| Analysis Output | JSON mode + Zod validation | `zod` |
| Chat | Streaming + session context | - |

