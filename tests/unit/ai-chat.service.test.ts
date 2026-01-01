import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FoodItem } from '../../packages/shared/src';

// Mock dependencies before importing the service
const mockStreamText = vi.fn();
vi.mock('ai', () => ({
  streamText: mockStreamText,
}));

// Import service after mocks
import { AIChatService } from '../../packages/backend/src/services/ai-chat';

describe('AIChatService', () => {
  let service: AIChatService;
  const mockConfig = {
    provider: 'google' as const,
    apiKey: 'test-api-key',
    model: 'gemini-3-flash',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIChatService(mockConfig);
  });

  describe('parseChanges', () => {
    it('should parse add action from response', () => {
      const response = `ご飯を追加しましょう。
[CHANGE: {"action": "add", "food": {"name": "ご飯", "portion": "medium", "calories": 250, "protein": 4.5, "fat": 0.5, "carbs": 55.0}}]`;

      const changes = service.parseChanges(response);

      expect(changes).toHaveLength(1);
      expect(changes[0].action).toBe('add');
      expect(changes[0].foodItem?.name).toBe('ご飯');
      expect(changes[0].foodItem?.calories).toBe(250);
    });

    it('should parse remove action from response', () => {
      const response = `ラーメンを削除します。
[CHANGE: {"action": "remove", "foodItemId": "item-uuid-123"}]`;

      const changes = service.parseChanges(response);

      expect(changes).toHaveLength(1);
      expect(changes[0].action).toBe('remove');
      expect(changes[0].foodItemId).toBe('item-uuid-123');
    });

    it('should parse update action from response', () => {
      const response = `量を少なめに変更しました。
[CHANGE: {"action": "update", "foodItemId": "item-uuid-456", "food": {"portion": "small", "calories": 150}}]`;

      const changes = service.parseChanges(response);

      expect(changes).toHaveLength(1);
      expect(changes[0].action).toBe('update');
      expect(changes[0].foodItemId).toBe('item-uuid-456');
      expect(changes[0].foodItem?.portion).toBe('small');
    });

    it('should parse multiple changes from response', () => {
      const response = `バランスを改善するため、以下の変更を提案します。
[CHANGE: {"action": "remove", "foodItemId": "item-1"}]
カロリーを抑えるためにご飯を減らし、
[CHANGE: {"action": "add", "food": {"name": "サラダ", "portion": "medium", "calories": 30, "protein": 2.0, "fat": 0.5, "carbs": 5.0}}]
野菜を追加しました。`;

      const changes = service.parseChanges(response);

      expect(changes).toHaveLength(2);
      expect(changes[0].action).toBe('remove');
      expect(changes[1].action).toBe('add');
      expect(changes[1].foodItem?.name).toBe('サラダ');
    });

    it('should return empty array for response without changes', () => {
      const response = 'この食事はバランスが良いですね。特に変更は必要ありません。';

      const changes = service.parseChanges(response);

      expect(changes).toHaveLength(0);
    });

    it('should skip invalid JSON in change markers', () => {
      const response = `変更提案です。
[CHANGE: {"invalid json}]
[CHANGE: {"action": "add", "food": {"name": "味噌汁", "portion": "medium", "calories": 40, "protein": 3.0, "fat": 1.0, "carbs": 4.0}}]`;

      const changes = service.parseChanges(response);

      // Should only parse the valid change
      expect(changes).toHaveLength(1);
      expect(changes[0].foodItem?.name).toBe('味噌汁');
    });

    it('should use default values for missing food properties', () => {
      const response = `[CHANGE: {"action": "add", "food": {"name": "お茶"}}]`;

      const changes = service.parseChanges(response);

      expect(changes).toHaveLength(1);
      expect(changes[0].foodItem?.name).toBe('お茶');
      expect(changes[0].foodItem?.portion).toBe('medium');
      expect(changes[0].foodItem?.calories).toBe(0);
      expect(changes[0].foodItem?.protein).toBe(0);
    });

    it('should normalize invalid portion values to medium', () => {
      const response = `[CHANGE: {"action": "add", "food": {"name": "餅", "portion": "3つ", "calories": 495, "protein": 9, "fat": 1.5, "carbs": 108}}]`;

      const changes = service.parseChanges(response);

      expect(changes).toHaveLength(1);
      expect(changes[0].foodItem?.name).toBe('餅');
      expect(changes[0].foodItem?.portion).toBe('medium'); // Invalid "3つ" normalized to "medium"
      expect(changes[0].foodItem?.calories).toBe(495);
    });

    it('should round calories to integer', () => {
      const response = `[CHANGE: {"action": "add", "food": {"name": "サラダ", "portion": "small", "calories": 45.7, "protein": 2.0, "fat": 0.5, "carbs": 5.0}}]`;

      const changes = service.parseChanges(response);

      expect(changes).toHaveLength(1);
      expect(changes[0].foodItem?.calories).toBe(46); // 45.7 rounded to 46
    });
  });

  describe('extractDisplayText', () => {
    it('should remove change markers from response', () => {
      const response = `バランスを改善しましょう。
[CHANGE: {"action": "add", "food": {"name": "サラダ", "portion": "medium", "calories": 30, "protein": 2.0, "fat": 0.5, "carbs": 5.0}}]
野菜を追加することで栄養バランスが良くなります。`;

      const displayText = service.extractDisplayText(response);

      expect(displayText).not.toContain('[CHANGE:');
      expect(displayText).toContain('バランスを改善しましょう。');
      expect(displayText).toContain('野菜を追加することで栄養バランスが良くなります。');
    });

    it('should handle response without change markers', () => {
      const response = 'この食事は問題ありません。';

      const displayText = service.extractDisplayText(response);

      expect(displayText).toBe('この食事は問題ありません。');
    });

    it('should handle multiple change markers', () => {
      const response = `変更1
[CHANGE: {"action": "remove", "foodItemId": "1"}]
変更2
[CHANGE: {"action": "add", "food": {"name": "x", "portion": "medium", "calories": 100, "protein": 5, "fat": 2, "carbs": 10}}]
完了`;

      const displayText = service.extractDisplayText(response);

      expect(displayText).toBe('変更1\n\n変更2\n\n完了');
    });
  });

  // Note: chat() streaming tests require complex mocking of AI SDK.
  // These are better tested in integration tests with actual API or proper E2E setup.
  // The parseChanges and extractDisplayText tests above cover the critical parsing logic.
});
