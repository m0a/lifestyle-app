/**
 * 週次PFCカードの「前週比」。脂質シェアの差を短いラベルに変換する純関数。
 *
 * カード本体（WeeklyPfcTrendCard）から切り出してあるのは、下の「横ばい」幅が
 * 見た目ではなく判断の閾値だから。ここだけ単体テストで固定しておきたい。
 */

/** tone はテキストの色分けに使う。脂質は下がるほうが良い指標なので減少=better。 */
export type FatShareDeltaTone = 'better' | 'worse' | 'flat' | 'none';

export interface FatShareDelta {
  text: string;
  tone: FatShareDeltaTone;
}

/**
 * 前週比を「横ばい」と見なす幅（%ポイント）。
 *
 * 1750 kcal/日の計画で 1pt は脂質約1.9g/日 — ドレッシング大さじ半分程度で、
 * 献立が変わったとは言えない量。このカード自体が「1日のブレに振り回されずに
 * 週の傾向を見る」ために作られているので、差の読み方も同じ基準に揃え、
 * これ未満は傾向ではなくノイズとして扱う。
 */
export const FAT_SHARE_NOISE_PT = 1;

/**
 * 脂質シェアの前週比を短いラベルにする。
 *
 * `previous` は配列の先頭（最も古い週）で undefined、記録のない週で null になる。
 * どちらも「比較できない」なので tone='none' と空文字を返し、呼び出し側は
 * 何も描画しない — 0pt と表示すると「変化なし」に見えてしまう。
 */
export function describeFatShareDelta(
  current: number | null,
  previous: number | null | undefined
): FatShareDelta {
  // == null で undefined と null の両方を弾く。
  if (current == null || previous == null) return { text: '', tone: 'none' };

  const delta = current - previous;
  if (Math.abs(delta) < FAT_SHARE_NOISE_PT) return { text: '横ばい', tone: 'flat' };

  // 矢印+絶対値の書式は WeeklyMealSummaryCard の体重表記（"7日平均 ↓0.3kg"）に合わせる。
  // 単位は % ではなく pt — 比べているのは割合そのものではなく割合の差。
  const improving = delta < 0;
  return {
    text: `${improving ? '↓' : '↑'}${Math.abs(delta).toFixed(1)}pt`,
    tone: improving ? 'better' : 'worse',
  };
}
