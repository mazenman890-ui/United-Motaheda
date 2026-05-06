import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[var(--app-bg)] px-4 py-16">
        <div
          role="alert"
          className="mx-auto max-w-2xl rounded-[2.2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_48px_rgba(15,23,42,0.08)]"
        >
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-slate-950">Something went wrong</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
            The app hit an unexpected error. Reload to recover safely.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition-colors hover:bg-teal-600"
          >
            <RotateCcw className="h-4 w-4" />
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
