import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateNotFuture,
  getCurrentDateTimeLocal,
  getTodayDateString,
  extractLocalDate,
  toISOString,
  toDateTimeLocal,
} from '../../packages/frontend/src/lib/dateValidation';

describe('dateValidation', () => {
  describe('validateNotFuture', () => {
    beforeEach(() => {
      // 2026-01-03T12:00:00.000Z に固定
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-03T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('過去の日時はnullを返す', () => {
      const result = validateNotFuture('2026-01-02T12:00:00.000Z');
      expect(result).toBeNull();
    });

    it('現在の日時はnullを返す', () => {
      const result = validateNotFuture('2026-01-03T12:00:00.000Z');
      expect(result).toBeNull();
    });

    it('未来の日時はエラーメッセージを返す', () => {
      const result = validateNotFuture('2026-01-04T12:00:00.000Z');
      expect(result).toBe('未来の日時は指定できません');
    });

    it('datetime-local形式の過去日時はnullを返す', () => {
      const result = validateNotFuture('2026-01-02T10:00');
      expect(result).toBeNull();
    });

    it('datetime-local形式の未来日時はエラーメッセージを返す', () => {
      const result = validateNotFuture('2026-01-04T10:00');
      expect(result).toBe('未来の日時は指定できません');
    });

    it('無効な日時形式はエラーメッセージを返す', () => {
      const result = validateNotFuture('invalid-date');
      expect(result).toBe('無効な日時形式です');
    });
  });

  describe('getCurrentDateTimeLocal', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-03T12:30:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('datetime-local形式で現在日時を返す', () => {
      const result = getCurrentDateTimeLocal();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('getTodayDateString', () => {
    it('UTC文字列ではなくローカル日付のgetterを使用する', () => {
      const now = new Date('2026-01-16T15:30:00Z');
      vi.spyOn(now, 'getFullYear').mockReturnValue(2026);
      vi.spyOn(now, 'getMonth').mockReturnValue(0);
      vi.spyOn(now, 'getDate').mockReturnValue(17);

      expect(getTodayDateString(now)).toBe('2026-01-17');
    });
  });

  describe('extractLocalDate', () => {
    it.each(['2026-01-17T00:30:00+09:00', '2026-01-17T23:30:00-05:00'])(
      'オフセットにかかわらず記録されたローカル日付を返す: %s',
      (recordedAt) => {
        expect(extractLocalDate(recordedAt)).toBe('2026-01-17');
      }
    );
  });

  describe('toISOString', () => {
    it('datetime-local形式をISO形式に変換する', () => {
      const result = toISOString('2026-01-03T12:30');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('既にISO形式の場合はそのまま返す', () => {
      const input = '2026-01-03T12:30:00.000Z';
      const result = toISOString(input);
      expect(result).toBe(input);
    });
  });

  describe('toDateTimeLocal', () => {
    it('ISO形式をdatetime-local形式に変換する', () => {
      // UTCの12:00をローカルタイムに変換
      const result = toDateTimeLocal('2026-01-03T12:00:00.000Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });
});
