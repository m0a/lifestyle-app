interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'orange' | 'gray';
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
};

const colorClasses = {
  blue: 'border-blue-600 border-t-transparent',
  green: 'border-green-600 border-t-transparent',
  orange: 'border-orange-600 border-t-transparent',
  gray: 'border-gray-600 border-t-transparent',
};

export function Loading({
  size = 'md',
  color = 'blue',
  text,
  fullScreen = false,
}: LoadingProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export function PageLoading({ text = '読み込み中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loading size="lg" text={text} />
    </div>
  );
}

export function ButtonLoading() {
  return <Loading size="sm" color="gray" />;
}
