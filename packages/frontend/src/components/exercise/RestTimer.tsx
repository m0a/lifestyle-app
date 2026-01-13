import { useState, useEffect, useRef, useCallback } from 'react';

interface RestTimerProps {
  defaultSeconds?: number;
  incrementSeconds?: number;
}

export function RestTimer({ defaultSeconds = 60, incrementSeconds = 60 }: RestTimerProps) {
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

  // Handle tap: start or reset
  const handleTap = () => {
    if (isRunning) {
      // Reset when tapped during countdown
      setIsRunning(false);
      setSeconds(totalSeconds);
    } else {
      // Start countdown
      if (seconds === 0) {
        setSeconds(totalSeconds);
      }
      setIsRunning(true);
    }
  };

  // Handle swipe start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  // Handle swipe end - right swipe adds time
  const handleTouchEnd = (e: React.TouchEvent) => {
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
  };

  // Format seconds as MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;

  return (
    <div
      className="select-none cursor-pointer"
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center gap-2">
        {/* Circular progress indicator */}
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            {/* Background circle */}
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="4"
            />
            {/* Progress circle */}
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke={isRunning ? '#f97316' : '#9ca3af'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 125.6} 125.6`}
              className="transition-all duration-200"
            />
          </svg>
          {/* Timer icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className={`w-5 h-5 ${isRunning ? 'text-orange-600' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Time display */}
        <div className="flex flex-col">
          <span
            className={`text-lg font-bold tabular-nums ${
              isRunning ? 'text-orange-600' : seconds === 0 ? 'text-green-600' : 'text-gray-700'
            }`}
          >
            {formatTime(seconds)}
          </span>
          <span className="text-xs text-gray-400">
            {isRunning ? 'タップでリセット' : 'タップでスタート'}
          </span>
        </div>
      </div>

      {/* Swipe hint */}
      <p className="text-xs text-gray-400 mt-1">
        ← → スワイプで{incrementSeconds}秒調整
      </p>
    </div>
  );
}
