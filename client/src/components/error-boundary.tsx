import React, { ReactNode } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component that catches rendering errors in child components
 * Displays a friendly error UI with a retry button
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error || new Error("Unknown error"), this.resetError);
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8 max-w-md w-full border border-slate-200 dark:border-slate-800">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-2">
              Something went wrong
            </h1>

            {/* Error Description */}
            <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
              We encountered an unexpected error. Please try again or contact support if the problem persists.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Try Again Button */}
            <Button
              onClick={this.resetError}
              className="w-full bg-[#00A86B] hover:bg-[#008B57] text-white font-medium py-2 rounded-lg transition-colors"
              size="lg"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            {/* Support Link */}
            <div className="mt-4 text-center">
              <a
                href="/"
                className="text-sm text-[#00A86B] hover:text-[#008B57] dark:text-[#00C878] dark:hover:text-[#00A86B] font-medium transition-colors"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component to wrap a component with ErrorBoundary
 * Usage: const SafeComponent = withErrorBoundary(MyComponent);
 */
function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, retry: () => void) => ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
}

export { ErrorBoundary, withErrorBoundary };
export type { ErrorBoundaryProps };
