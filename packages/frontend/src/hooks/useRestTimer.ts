import { useState, useEffect, useRef, useCallback } from 'react';
import type { TouchEvent } from 'react';

interface UseRestTimerOptions {
  defaultSeconds?: number;
  incrementSeconds?: number;
}

export interface RestTimerController {
  seconds: number;
  isRunning: boolean;
  /** 残り時間の割合 (0-100)。円形プログレスの描画に使う */
  progress: number;
  /** M:SS 形式の表示用文字列 */
  formattedTime: string;
  /** タップ: 停止中なら開始、カウントダウン中ならリセット */
  onTap: () => void;
  onTouchStart: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

/**
 * インターバルタイマーの状態とロジック。
 *
 * 表示コンポーネント (RestTimer) から状態を分離しているのは、タイマーを
 * アクティブなセット行の直下へ移動させるため。JSX上の位置が変わると
 * 表示コンポーネントは unmount/remount されるが、状態はこのフックを呼ぶ
 * 側 (StrengthInput) に留まるのでカウントダウンが途切れない。
 */
export function useRestTimer({
  defaultSeconds = 60,
  incrementSeconds = 60,
}: UseRestTimerOptions = {}): RestTimerController {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const touchStartX = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play alarm sound using Web Audio API
  const playAlarm = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      // Beep pattern: 3 short beeps
      const now = ctx.currentTime;
      oscillator.start(now);

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.setValueAtTime(0, now + 0.15);
      gainNode.gain.setValueAtTime(0.3, now + 0.25);
      gainNode.gain.setValueAtTime(0, now + 0.4);
      gainNode.gain.setValueAtTime(0.3, now + 0.5);
      gainNode.gain.setValueAtTime(0, now + 0.65);

      oscillator.stop(now + 0.7);
    } catch {
      // Audio not supported or blocked
    }
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          playAlarm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, playAlarm]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSeconds(totalSeconds);
  }, [totalSeconds]);

  // Handle tap: start or reset
  const onTap = useCallback(() => {
    if (isRunning) {
      // Reset when tapped during countdown
      reset();
    } else {
      // Start countdown
      if (seconds === 0) {
        setSeconds(totalSeconds);
      }
      setIsRunning(true);
    }
  }, [isRunning, seconds, totalSeconds, reset]);

  // Handle swipe start
  const onTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  // Handle swipe end - right swipe adds time
  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchStartX.current === null) return;

      const touchEndX = e.changedTouches[0]?.clientX ?? 0;
      const diff = touchEndX - touchStartX.current;

      // Right swipe (threshold: 50px)
      if (diff > 50) {
        const newTotal = totalSeconds + incrementSeconds;
        setTotalSeconds(newTotal);
        if (!isRunning) {
          setSeconds(newTotal);
        } else {
          setSeconds((prev) => prev + incrementSeconds);
        }
      }
      // Left swipe - decrease time (minimum 60 seconds)
      else if (diff < -50 && totalSeconds > incrementSeconds) {
        const newTotal = totalSeconds - incrementSeconds;
        setTotalSeconds(newTotal);
        if (!isRunning) {
          setSeconds(newTotal);
        } else {
          setSeconds((prev) => Math.max(1, prev - incrementSeconds));
        }
      }

      touchStartX.current = null;
    },
    [isRunning, totalSeconds, incrementSeconds]
  );

  // Format seconds as MM:SS
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  const formattedTime = `${mins}:${remainingSecs.toString().padStart(2, '0')}`;

  // Calculate progress percentage
  const progress = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;

  return {
    seconds,
    isRunning,
    progress,
    formattedTime,
    onTap,
    onTouchStart,
    onTouchEnd,
  };
}
