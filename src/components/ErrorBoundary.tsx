import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; info: ErrorInfo | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-xl w-full bg-white rounded-2xl p-8 shadow-lg border border-red-100">
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-4 text-sm">{this.state.error.message}</p>
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer font-medium text-slate-500 mb-1">Component Stack</summary>
            <pre className="whitespace-pre-wrap bg-slate-50 p-3 rounded-lg max-h-48 overflow-auto">
              {(this.state.info as ErrorInfo | null)?.componentStack || 'No stack available'}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}
