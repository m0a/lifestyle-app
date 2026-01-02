import { describe, it, expect } from 'vitest';
import { calculate1RM, isMaxRM } from '../../packages/shared/src/utils/rm-calculator';

describe('calculate1RM', () => {
  describe('Epley formula calculations', () => {
    it('should return exact weight when reps is 1', () => {
      expect(calculate1RM(100, 1)).toBe(100);
      expect(calculate1RM(60, 1)).toBe(60);
      expect(calculate1RM(150, 1)).toBe(150);
    });

    it('should calculate correctly for typical training sets', () => {
      // 100kg × 5 reps: 100 × (1 + 0.0333 × 5) = 100 × 1.1665 = 116.65 → 117
      expect(calculate1RM(100, 5)).toBe(117);

      // 80kg × 10 reps: 80 × (1 + 0.0333 × 10) = 80 × 1.333 = 106.64 → 107
      expect(calculate1RM(80, 10)).toBe(107);

      // 60kg × 3 reps: 60 × (1 + 0.0333 × 3) = 60 × 1.0999 = 65.994 → 66
      expect(calculate1RM(60, 3)).toBe(66);

      // 50kg × 8 reps: 50 × (1 + 0.0333 × 8) = 50 × 1.2664 = 63.32 → 63
      expect(calculate1RM(50, 8)).toBe(63);
    });

    it('should handle decimal weights', () => {
      // 62.5kg × 5 reps: 62.5 × 1.1665 = 72.90625 → 73
      expect(calculate1RM(62.5, 5)).toBe(73);
    });

    it('should round to nearest integer', () => {
      // Verify rounding behavior
      // 100kg × 2 reps: 100 × 1.0666 = 106.66 → 107
      expect(calculate1RM(100, 2)).toBe(107);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for zero weight', () => {
      expect(calculate1RM(0, 5)).toBe(0);
    });

    it('should return 0 for negative weight', () => {
      expect(calculate1RM(-50, 5)).toBe(0);
    });

    it('should return 0 for zero reps', () => {
      expect(calculate1RM(100, 0)).toBe(0);
    });

    it('should return 0 for negative reps', () => {
      expect(calculate1RM(100, -3)).toBe(0);
    });

    it('should handle high rep counts', () => {
      // 50kg × 20 reps: 50 × (1 + 0.0333 × 20) = 50 × 1.666 = 83.3 → 83
      expect(calculate1RM(50, 20)).toBe(83);
    });

    it('should handle very heavy weights', () => {
      // 300kg × 3 reps: 300 × 1.0999 = 329.97 → 330
      expect(calculate1RM(300, 3)).toBe(330);
    });
  });
});

describe('isMaxRM', () => {
  it('should return true when current exceeds historical max', () => {
    expect(isMaxRM(120, 115)).toBe(true);
    expect(isMaxRM(101, 100)).toBe(true);
    expect(isMaxRM(200, 199)).toBe(true);
  });

  it('should return false when current equals historical max', () => {
    expect(isMaxRM(100, 100)).toBe(false);
    expect(isMaxRM(150, 150)).toBe(false);
  });

  it('should return false when current is below historical max', () => {
    expect(isMaxRM(100, 115)).toBe(false);
    expect(isMaxRM(90, 100)).toBe(false);
    expect(isMaxRM(0, 100)).toBe(false);
  });

  it('should handle edge cases with zero', () => {
    expect(isMaxRM(50, 0)).toBe(true);
    expect(isMaxRM(0, 0)).toBe(false);
  });
});
