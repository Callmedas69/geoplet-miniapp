/**
 * ErrorBoundary Component
 *
 * Catches React errors in child components and provides graceful fallback UI
 *
 * Features:
 * - Catches render errors and lifecycle errors
 * - Provides retry functionality
 * - Logs errors for debugging
 * - Accessible fallback UI
 */

"use client";

import { Component, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          className="w-full max-w-md mx-auto p-6 bg-red-50 border-2 border-red-200 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle
              className="w-12 h-12 text-red-600"
              aria-hidden="true"
            />

            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Something went wrong
              </h3>
              <p className="text-sm text-red-700 mb-4">
                The minting button encountered an error. Please try again.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs text-left bg-red-100 p-2 rounded mb-4">
                  <summary className="cursor-pointer font-medium">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>

            <Button
              onClick={this.handleReset}
              className="bg-red-600 hover:bg-red-700 text-white"
              aria-label="Try again after error"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Specialized fallback for button components
 */
export function ButtonErrorFallback({ onReset }: { onReset?: () => void }) {
  return (
    <div
      className="w-full max-w-md mx-auto p-4 bg-amber-50 border border-amber-200 rounded-lg"
      role="alert"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-600" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-amber-900 mb-1">
            Button temporarily unavailable
          </p>
          <p className="text-xs text-amber-700">
            Please refresh the page or try again later
          </p>
        </div>
        {onReset && (
          <Button
            onClick={onReset}
            size="sm"
            variant="outline"
            className="border-amber-300 hover:bg-amber-100"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
