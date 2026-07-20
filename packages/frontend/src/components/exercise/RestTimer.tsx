import type { RestTimerController } from '../../hooks/useRestTimer';

interface RestTimerProps {
  timer: RestTimerController;
}

/**
 * インターバルタイマーの表示専用コンポーネント。
 * 状態は useRestTimer が持つので、アクティブなセット行に追従して
 * JSX上の位置が変わっても（＝remountされても）カウントダウンは継続する。
 */
export function RestTimer({ timer }: RestTimerProps) {
  const { seconds, isRunning, progress, formattedTime, onTap, onTouchStart, onTouchEnd } = timer;

  return (
    <div
      className="select-none cursor-pointer"
      onClick={onTap}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
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
        <span
          className={`text-lg font-bold tabular-nums ${
            isRunning ? 'text-orange-600' : seconds === 0 ? 'text-green-600' : 'text-gray-700'
          }`}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
