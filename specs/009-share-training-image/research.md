# Research: トレーニング画像共有機能

**Date**: 2026-01-02
**Feature**: 009-share-training-image

## 1. 画像生成ライブラリ選定

### html-to-image vs html2canvas 比較

| 観点 | html-to-image | html2canvas |
|------|---------------|-------------|
| **バンドルサイズ** | ~4-6 kB gzipped（軽量） | ~40+ kB gzipped（重い） |
| **アプローチ** | SVG シリアライズ | Canvas 再レンダリング |
| **パフォーマンス** | 高速、メインスレッドブロック少 | 低速、メインスレッドブロック多 |
| **モダンCSS対応** | 良好（CSS変数、transform、グラデーション、shadow） | 制限あり（3D transform非対応） |
| **メンテナンス** | アクティブ（v1.11.13） | 更新頻度低 |

### iOS Safari 既知の問題

- 初回呼び出しで画像が正しく生成されないことがある
- 白背景が表示される場合あり
- **対策**: 2-3回のリトライロジック実装、画像を事前にbase64化

### 決定

**html-to-image を採用**

**理由**:
- バンドルサイズがPWAに適している（軽量）
- モダンCSSサポートが良好（Tailwind CSS使用のため重要）
- Canvas/WebGL不要なユースケースに最適
- iOS Safari対策としてリトライロジックを実装

**代替案として却下**:
- html2canvas: バンドルサイズが大きい、モダンCSS対応が不十分

---

## 2. Web Share API 実装方針

### ブラウザサポート

| ブラウザ | ファイル共有サポート |
|----------|---------------------|
| iOS Safari 15+ | ✅ Web Share Level 2 |
| Android Chrome | ✅ フルサポート |
| Desktop Chrome/Edge | ⚠️ 限定的 |

### 実装パターン

```typescript
async function shareTrainingImage(blob: Blob, title: string) {
  const file = new File([blob], 'training-record.png', { type: 'image/png' });
  const shareData = { files: [file], title };

  // canShare() で事前チェック（ユーザージェスチャー不要）
  if (navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        fallbackDownload(blob, 'training-record.png');
      }
    }
  } else {
    fallbackDownload(blob, 'training-record.png');
  }
}
```

### 決定

- **画像形式**: PNG（品質維持、広くサポート）
- **フォールバック**: Web Share API非対応時はダウンロード保存
- **事前チェック**: `navigator.canShare()` を使用

---

## 3. 1RM計算式

### 主要な計算式

| 計算式 | 数式 | 精度 |
|--------|------|------|
| Epley | `1RM = weight × (1 + 0.0333 × reps)` | 2-5回で高精度 |
| Brzycki | `1RM = weight / (1.0278 - 0.0278 × reps)` | 6-10回で高精度 |

### 精度比較（研究結果）

- **2-5回**: Epleyがより正確（パワーリフティング研究）
- **6-10回**: Brzyckiがより正確（誤差5%未満）
- **10回**: 両式で同一結果
- **10回超**: どちらも精度低下（使用非推奨）

### 決定

**Epley式を採用**

**理由**:
- 筋トレでは低回数（2-5回）が一般的
- 計算がシンプル
- 参考画像でも同様のアプローチと推測

```typescript
function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + 0.0333 * reps));
}
```

---

## 4. 画像レイアウト設計

### 参考画像（筋トレMEMO）の構成要素

1. **ヘッダー**: 日付 + "WorkOut" タイトル（赤背景）
2. **種目カード**: 赤枠で囲む
   - 種目名 + RM値（右寄せ）
   - セット詳細リスト
3. **セット行**: `番号 重量kg × 回数 reps (1RM:計算値) [MAX RM]`
4. **フッター**: "Powered by [アプリ名]"

### CSS実装方針

- Tailwind CSSでスタイリング
- 固定幅（スマホ画面に最適化: 360px程度）
- 白背景 + 赤アクセント（参考画像準拠）
- フォント: システムフォント（日本語対応）

---

## 5. MAX RM判定ロジック

### 要件

- 該当種目の過去全記録と比較
- 現在のセットの推定1RMが過去最高かどうか判定

### 実装方針

1. **バックエンド**: 種目ごとの歴代最高1RM値を取得するAPI追加
2. **フロントエンド**: 各セットの1RMと歴代最高を比較
3. **判定**: `current1RM > historicalMax1RM` の場合に MAX RM タグ表示

### APIエンドポイント

```
GET /api/exercises/max-rm/:exerciseType
Response: { maxRM: number, achievedAt: string }
```

---

## Sources

- [npm-compare: html2canvas vs html-to-image](https://npm-compare.com/html-to-image,html2canvas)
- [monday.com Engineering Blog: DOM to Image](https://engineering.monday.com/capturing-dom-as-image-is-harder-than-you-think-how-we-solved-it-at-monday-com/)
- [MDN: Navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
- [web.dev: Web Share API](https://web.dev/articles/web-share)
- [Wikipedia: One-repetition maximum](https://en.wikipedia.org/wiki/One-repetition_maximum)
- [OpenSIUC: Validation of Brzycki and Epley Equations](https://opensiuc.lib.siu.edu/cgi/viewcontent.cgi?article=1744&context=gs_rp)
