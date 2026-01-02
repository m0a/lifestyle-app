# Quickstart: トレーニング画像共有機能

**Date**: 2026-01-02
**Feature**: 009-share-training-image

## 概要

筋トレ記録を画像化してX/LINEに共有する機能。フロントエンドで画像を生成し、Web Share APIで共有する。

## 前提条件

- Node.js 20+
- pnpm
- 既存のlifestyle-app開発環境がセットアップ済み

## セットアップ

```bash
# 依存関係インストール（html-to-imageを追加）
cd packages/frontend
pnpm add html-to-image

# 開発サーバー起動
pnpm dev:all
```

## 主要コンポーネント

### 1. 1RM計算ユーティリティ

```typescript
// packages/shared/src/utils/rm-calculator.ts
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + 0.0333 * reps));
}
```

### 2. 画像生成フック

```typescript
// packages/frontend/src/hooks/useShareImage.ts
import { toPng } from 'html-to-image';

export function useShareImage() {
  const generateImage = async (element: HTMLElement): Promise<Blob> => {
    // iOS Safari対策: リトライロジック
    for (let i = 0; i < 3; i++) {
      try {
        const dataUrl = await toPng(element, { pixelRatio: 2 });
        const response = await fetch(dataUrl);
        return await response.blob();
      } catch (e) {
        if (i === 2) throw e;
        await new Promise(r => setTimeout(r, 100));
      }
    }
    throw new Error('Image generation failed');
  };

  const share = async (blob: Blob, title: string) => {
    const file = new File([blob], 'training.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
    } else {
      // フォールバック: ダウンロード
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'training.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return { generateImage, share };
}
```

### 3. プレビューコンポーネント

```tsx
// packages/frontend/src/components/exercise/TrainingImagePreview.tsx
interface Props {
  data: TrainingImageData;
  onShare: () => void;
  onSave: () => void;
}

export function TrainingImagePreview({ data, onShare, onSave }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* 画像プレビュー領域 */}
      <div id="training-image" className="w-[360px] bg-white">
        {/* ヘッダー */}
        <div className="bg-red-600 text-white p-2 text-center font-bold">
          {data.date} WorkOut
        </div>

        {/* 種目カード */}
        {data.exercises.map(exercise => (
          <TrainingImageCard key={exercise.exerciseType} {...exercise} />
        ))}

        {/* フッター */}
        <div className="text-center text-xs text-gray-500 py-2">
          {data.footer}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button onClick={onShare}>共有</button>
        <button onClick={onSave}>保存</button>
      </div>
    </div>
  );
}
```

## 開発フロー

1. **TDD**: テストを先に書く
   ```bash
   pnpm test tests/unit/rm-calculator.test.ts
   ```

2. **コンポーネント開発**: Storybook不使用、直接ページで確認
   ```bash
   pnpm dev
   # http://localhost:5173/exercise で確認
   ```

3. **E2Eテスト**: Playwrightで共有フロー検証
   ```bash
   pnpm test:e2e tests/e2e/share-training.spec.ts
   ```

## テスト方針

| テスト種別 | 対象 | ツール |
|-----------|------|--------|
| Unit | 1RM計算、データ変換 | Vitest |
| Integration | API呼び出し | Vitest + MSW |
| E2E | 画像生成・共有フロー | Playwright |

## デプロイ

既存のCI/CDパイプラインで自動デプロイ。

```bash
# PRマージ後、Cloudflare Workersに自動デプロイ
git push origin 009-share-training-image
```

## 注意事項

### iOS Safari対応

- `html-to-image`の初回呼び出しが失敗することがあるため、リトライロジック必須
- 画像はbase64埋め込みを推奨

### Web Share API

- `navigator.canShare()`で事前チェック必須
- フォールバック（ダウンロード）を必ず実装

### パフォーマンス

- 画像生成は2秒以内（SC-002）
- 多数の種目（10種目以上）ではフォントサイズ自動調整
