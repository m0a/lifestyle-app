import type { AIDailyUsage } from '@lifestyle-app/shared';

interface AIUsageBannerProps {
  dailyUsage: AIDailyUsage | null;
  isLoading: boolean;
}

export function AIUsageBanner({ dailyUsage, isLoading }: AIUsageBannerProps) {
  if (isLoading || !dailyUsage) return null;

  const { usagePercentage, isLimitExceeded, isWarning, dailyTokensUsed, dailyTokenLimit } = dailyUsage;

  // Don't show banner when usage is low
  if (!isLimitExceeded && !isWarning && usagePercentage < 50) return null;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return String(tokens);
  };

  // Determine colors based on state
  let barColor = 'bg-blue-500';
  let bgColor = 'bg-blue-50';
  let borderColor = 'border-blue-200';
  let textColor = 'text-blue-700';

  if (isLimitExceeded) {
    barColor = 'bg-red-500';
    bgColor = 'bg-red-50';
    borderColor = 'border-red-200';
    textColor = 'text-red-700';
  } else if (isWarning) {
    barColor = 'bg-orange-500';
    bgColor = 'bg-orange-50';
    borderColor = 'border-orange-200';
    textColor = 'text-orange-700';
  }

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-3`}>
      {isLimitExceeded ? (
        <p className={`text-sm font-medium ${textColor}`}>
          本日のAI使用上限に達しました。明日以降に再度お試しください。
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={`text-xs ${textColor}`}>
              AI使用量: {formatTokens(dailyTokensUsed)} / {formatTokens(dailyTokenLimit)}
            </span>
            <span className={`text-xs ${textColor}`}>
              {usagePercentage}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full ${barColor} transition-all duration-300`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          {isWarning && (
            <p className={`text-xs ${textColor}`}>
              残り{formatTokens(dailyUsage.remainingTokens)}トークンです
            </p>
          )}
        </div>
      )}
    </div>
  );
}
