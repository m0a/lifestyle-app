import { describe, it, expect } from 'vitest';
import {
  describeFatShareDelta,
  FAT_SHARE_NOISE_PT,
} from '../../packages/frontend/src/lib/fatShareDelta';

describe('describeFatShareDelta', () => {
  it('calls a drop an improvement (fat share is a lower-is-better metric)', () => {
    expect(describeFatShareDelta(30.2, 34.5)).toEqual({ text: '↓4.3pt', tone: 'better' });
  });

  it('calls a rise a regression', () => {
    expect(describeFatShareDelta(38.0, 34.5)).toEqual({ text: '↑3.5pt', tone: 'worse' });
  });

  it(`treats a swing under ${FAT_SHARE_NOISE_PT}pt as noise, not a trend`, () => {
    // ~1.9g of fat a day on a 1750 kcal plan — the menu did not really change.
    expect(describeFatShareDelta(30.4, 30.0)).toEqual({ text: '横ばい', tone: 'flat' });
    expect(describeFatShareDelta(30.0, 30.4)).toEqual({ text: '横ばい', tone: 'flat' });
  });

  it('puts the boundary itself outside the noise band', () => {
    // Exactly the threshold reads as a real move; just under it does not.
    expect(describeFatShareDelta(31, 30).tone).toBe('worse');
    expect(describeFatShareDelta(30.99, 30).tone).toBe('flat');
  });

  it('stays silent when there is nothing to compare against', () => {
    // Oldest week in the series (no predecessor).
    expect(describeFatShareDelta(30.0, undefined)).toEqual({ text: '', tone: 'none' });
    // Either side unlogged: "0pt" would read as "unchanged", which is a lie.
    expect(describeFatShareDelta(30.0, null)).toEqual({ text: '', tone: 'none' });
    expect(describeFatShareDelta(null, 30.0)).toEqual({ text: '', tone: 'none' });
  });

  it('rounds only for display, never for the comparison', () => {
    // Rounds to "↑1.0pt" but is genuinely above the band, so it is not flat.
    expect(describeFatShareDelta(31.04, 30.0)).toEqual({ text: '↑1.0pt', tone: 'worse' });
  });
});
