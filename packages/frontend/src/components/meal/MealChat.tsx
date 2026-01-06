import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mealAnalysisApi } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { toDateTimeLocal } from '../../lib/dateValidation';
import type { FoodItem, NutritionTotals, ChatChange, ChatMessage, MealType } from '@lifestyle-app/shared';

// T011: Helper function to display meal type in Japanese
function getMealTypeLabel(mealType: MealType): string {
  const labels: Record<MealType, string> = {
    breakfast: '朝食',
    lunch: '昼食',
    dinner: '夕食',
    snack: '間食',
  };
  return labels[mealType];
}

// Helper function to get food item name by ID
function getFoodItemName(foodItemId: string, foodItems: FoodItem[]): string {
  const item = foodItems.find(f => f.id === foodItemId);
  return item?.name || '(食材名不明)';
}

interface MealChatProps {
  mealId: string;
  currentFoodItems: FoodItem[];
  onUpdate: (foodItems: FoodItem[], totals: NutritionTotals, recordedAt?: string, mealType?: MealType) => void;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  changes?: ChatChange[];
  isStreaming?: boolean;
}

export function MealChat({ mealId, currentFoodItems, onUpdate }: MealChatProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChatChange[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const { messages: history } = await mealAnalysisApi.getChatHistory(mealId);
        setMessages(
          history.map((msg: ChatMessage) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            changes: msg.appliedChanges,
          }))
        );
      } catch (error) {
        console.error('Failed to load chat history:', error);
        // Show error but don't block chat functionality
        if (error instanceof TypeError && (error as TypeError).message === 'Failed to fetch') {
          toast.warning('チャット履歴の読み込みに失敗しました');
        }
      }
    };
    loadHistory();
  }, [mealId, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: userMessage }]);

    // Add streaming assistant message
    const assistantMsgId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true },
    ]);

    try {
      let fullContent = '';
      let changes: ChatChange[] = [];

      for await (const event of mealAnalysisApi.sendChatMessage(mealId, userMessage)) {
        if (event.text) {
          fullContent += event.text;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: fullContent } : msg
            )
          );
        }

        if (event.done) {
          changes = event.changes || [];
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, id: event.messageId || assistantMsgId, isStreaming: false, changes }
                : msg
            )
          );
          if (changes.length > 0) {
            setPendingChanges(changes);
          }
        }

        if (event.error) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: event.error || 'エラーが発生しました', isStreaming: false }
                : msg
            )
          );
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: 'エラーが発生しました', isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, mealId]);

  const handleApplyChanges = useCallback(async () => {
    if (pendingChanges.length === 0) return;

    console.log('[MealChat] Applying changes:', pendingChanges);

    try {
      const result = await mealAnalysisApi.applyChatSuggestion(mealId, pendingChanges);
      onUpdate(result.foodItems, result.updatedTotals, result.recordedAt, result.mealType);
      setPendingChanges([]);
      toast.success('変更を適用しました');
    } catch (error) {
      console.error('Apply changes error:', error);
      if (error instanceof TypeError && (error as TypeError).message === 'Failed to fetch') {
        toast.error('ネットワークに接続できません');
      } else {
        toast.error('変更の適用に失敗しました');
      }
    }
  }, [mealId, pendingChanges, onUpdate, toast]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('写真のサイズは10MB以下にしてください');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`/api/meals/${mealId}/chat/add-photo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(errorData.message || '写真のアップロードに失敗しました');
      }

      const result = await response.json() as {
        ackMessageId?: string;
        resultMessageId?: string;
        foodItems?: FoodItem[];
        updatedTotals?: NutritionTotals;
        error?: string;
      };

      // Invalidate queries immediately to show the uploaded photo
      queryClient.invalidateQueries({ queryKey: ['meals', mealId, 'photos'] });

      // Add acknowledgment message to chat
      if (result.ackMessageId) {
        const ackMsgId = result.ackMessageId;
        setMessages((prev) => [
          ...prev,
          {
            id: ackMsgId,
            role: 'assistant',
            content: '写真を追加しました。AI分析を実行中です...',
          },
        ]);
      }

      // Wait a bit and add result message
      if (result.resultMessageId && result.updatedTotals && result.foodItems) {
        const resultMsgId = result.resultMessageId;
        const foodItems = result.foodItems;
        const updatedTotals = result.updatedTotals;

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: resultMsgId,
              role: 'assistant',
              content: `分析が完了しました！\n\n追加された食材:\n${foodItems.map((item: FoodItem) => `- ${item.name} (${item.calories}kcal)`).join('\n')}\n\n合計栄養素:\nカロリー: ${updatedTotals.calories}kcal\nタンパク質: ${updatedTotals.protein.toFixed(1)}g\n脂質: ${updatedTotals.fat.toFixed(1)}g\n炭水化物: ${updatedTotals.carbs.toFixed(1)}g`,
            },
          ]);

          // Invalidate queries to refresh photos and meal data
          queryClient.invalidateQueries({ queryKey: ['meals', mealId, 'photos'] });
          queryClient.invalidateQueries({ queryKey: ['meals'] });

          toast.success('写真を追加し、AI分析が完了しました');
        }, 2000);
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('写真のアップロードに失敗しました');
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [mealId, toast, queryClient]);

  return (
    <div className="rounded-lg border">
      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 sm:h-96">
        {messages.length === 0 && (
          <div className="text-center text-gray-400">
            <p>AIアシスタントに質問してください</p>
            <p className="mt-2 text-sm">例: ご飯を半分にしたい、タンパク質を増やすには？</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
              {msg.isStreaming && <span className="ml-1 animate-pulse">...</span>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending changes */}
      {pendingChanges.length > 0 && (
        <div className="border-t bg-yellow-50 p-3">
          <p className="mb-2 text-sm font-medium">AIからの変更提案:</p>
          <ul className="mb-2 text-sm text-gray-600">
            {pendingChanges.map((change, i) => (
              <li key={i}>
                {change.action === 'add' && `追加: ${change.foodItem.name}`}
                {change.action === 'remove' && `削除: ${getFoodItemName(change.foodItemId, currentFoodItems)}`}
                {change.action === 'update' && `変更: ${getFoodItemName(change.foodItemId, currentFoodItems)}`}
                {change.action === 'set_datetime' && `日時変更: ${toDateTimeLocal(change.recordedAt)}`}
                {change.action === 'set_meal_type' && `食事タイプ変更: ${getMealTypeLabel(change.mealType)}`}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={handleApplyChanges}
              className="rounded bg-green-500 px-4 py-1 text-sm text-white hover:bg-green-600"
            >
              適用する
            </button>
            <button
              onClick={() => setPendingChanges([])}
              className="rounded px-4 py-1 text-sm text-gray-500 hover:bg-gray-200"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading}
            className="flex items-center gap-1 rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            title="写真を追加"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {isUploading ? 'アップロード中...' : '写真を追加'}
          </button>
          {isUploading && (
            <span className="text-sm text-gray-500">AI分析を実行中...</span>
          )}
        </div>
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            disabled={isLoading}
            className="flex-1 rounded-l-lg border-y border-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="rounded-r-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
