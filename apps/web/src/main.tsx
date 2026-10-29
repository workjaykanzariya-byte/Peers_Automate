import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Peers Automate UI Error Caught]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#090d16] text-slate-100 p-6 font-sans">
          <div className="max-w-xl w-full bg-[#0d1322] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 font-extrabold text-base">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              <span>Peers Automate — Interface Recovery</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              An error occurred during page rendering:
            </p>
            <div className="p-4 rounded-xl bg-[#05070f] border border-slate-800 text-xs font-mono text-rose-400 overflow-x-auto max-h-48">
              {this.state.error?.message || String(this.state.error)}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global unhandled error & promise rejection catcher
window.addEventListener('error', (event) => {
  console.error('[Global Window Error]:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
