import { Component, ReactNode } from 'react';
import { logError } from '../../lib/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// T078: Error boundary for photo upload failures
export class PhotoUploadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, {
      component: 'PhotoUploadErrorBoundary',
      componentStack: errorInfo.componentStack,
    });
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-800">写真のアップロードでエラーが発生しました</h3>
          <p className="mt-2 text-sm text-red-600">
            {this.state.error?.message || '不明なエラーが発生しました'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            再試行
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
