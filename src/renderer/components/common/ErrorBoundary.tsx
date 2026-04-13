import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI to display instead of the default */
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  /** Component name for logging / identification */
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { name = 'UnknownComponent' } = this.props;

    // Always log to console
    console.error(`[ErrorBoundary] ${name} caught an error:`, error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Try to persist via IPC if available
    this.logErrorViaIPC(name, error, errorInfo);

    // Update state with errorInfo for display
    this.setState({ errorInfo });
  }

  private async logErrorViaIPC(name: string, error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const api = window.babaAPI;
      if (api?.logError) {
        await api.logError({
          name,
          message: error.message,
          stack: error.stack || errorInfo.componentStack || 'No stack available',
        });
      }
    } catch {
      // IPC logging failed; already logged to console
    }
  }

  private resetError = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, name = 'UnknownComponent' } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback !== undefined) {
        if (typeof fallback === 'function') {
          return fallback(error, this.resetError);
        }
        return fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            padding: '24px',
            margin: '16px',
            background: 'var(--bg-secondary, #1a1d23)',
            border: '1px solid var(--border-color, #2a2d35)',
            borderRadius: '8px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: 'var(--text-primary, #e1e4e8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              Something went wrong in {name}
            </h3>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-secondary, #8b949e)' }}>
            This component encountered an unexpected error. The rest of the app remains functional.
          </p>
          <details
            style={{
              margin: '12px 0',
              padding: '8px',
              background: 'var(--bg-primary, #0f1117)',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
              maxHeight: '200px',
              overflow: 'auto',
            }}
          >
            <summary style={{ cursor: 'pointer', color: 'var(--text-secondary, #8b949e)' }}>
              Error details
            </summary>
            <div style={{ marginTop: '8px', wordBreak: 'break-word' }}>
              <div style={{ color: '#f85149', marginBottom: '4px' }}>{error.message}</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-secondary, #8b949e)' }}>
                {error.stack || errorInfo?.componentStack || 'No stack trace available'}
              </pre>
            </div>
          </details>
          <button
            onClick={this.resetError}
            style={{
              padding: '8px 16px',
              background: 'var(--accent, #5865f2)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              marginTop: '8px',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return children;
  }
}
