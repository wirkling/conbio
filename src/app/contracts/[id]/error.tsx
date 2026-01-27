'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Contract page error:', error);
  }, [error]);

  // If it's the "too many re-renders" error, try to reset automatically
  useEffect(() => {
    if (error.message && error.message.includes('Too many re-renders')) {
      console.warn('Auto-recovering from React error #310...');
      // Try to reset after a short delay
      const timeout = setTimeout(() => {
        reset();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [error, reset]);

  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <p className="text-red-600 font-semibold mb-2">
          Something went wrong
        </p>
        <p className="text-gray-500 text-sm mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={() => reset()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
