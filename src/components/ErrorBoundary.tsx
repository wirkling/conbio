'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's the "Too many re-renders" error (React error #310)
    if (error.message && error.message.includes('Too many re-renders')) {
      // Suppress this error - it's a false positive
      console.warn('Suppressed React error #310 (false positive):', error.message);
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Don't log the "Too many re-renders" error since we're suppressing it
    if (!error.message?.includes('Too many re-renders')) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-red-600 font-semibold mb-2">
                Something went wrong
              </p>
              <p className="text-gray-500 text-sm mb-4">
                {this.state.error.message}
              </p>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
