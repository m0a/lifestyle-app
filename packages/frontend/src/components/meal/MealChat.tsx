import { useState, useCallback, useRef, useEffect } from 'react';
import { mealAnalysisApi, type MealChatEvent } from '../../lib/api';
import { useToast } from '../ui/Toast';
import type { FoodItem, NutritionTotals, FoodItemChange, ChatMessage } from '@lifestyle-app/shared';

interface MealChatProps {
  mealId: string;
  currentFoodItems: FoodItem[];
  onUpdate: (foodItems: FoodItem[], totals: NutritionTotals) => void;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  changes?: FoodItemChange[];
  isStreaming?: boolean;
}

export function MealChat({ mealId, currentFoodItems, onUpdate }: MealChatProps) {
  const toast = useToast();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FoodItemChange[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      let changes: FoodItemChange[] = [];

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

    try {
      const result = await mealAnalysisApi.applyChatSuggestion(mealId, pendingChanges);
      onUpdate(result.foodItems, result.updatedTotals);
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

  return (
    <div className="rounded-lg border">
      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4">
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
                {change.action === 'add' && `追加: ${change.foodItem?.name}`}
                {change.action === 'remove' && '削除: (食材)'}
                {change.action === 'update' && '変更: (食材)'}
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
      <div className="flex border-t p-3">
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
  );
}
