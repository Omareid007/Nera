import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">Something went wrong</h2>
            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-surface-0)]"
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
