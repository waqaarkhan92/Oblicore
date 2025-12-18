'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-danger/10 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-danger" />
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold text-danger mb-2">500</h1>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Something Went Wrong</h2>

        {/* Description */}
        <p className="text-text-secondary mb-6">
          We encountered an unexpected error. Our team has been notified and is working on a fix.
        </p>

        {/* Error Details (Development Only) */}
        {isDevelopment && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-xs font-mono text-text-tertiary mb-1">Error Details:</p>
            <p className="text-sm font-mono text-danger break-all">{error.message}</p>
            {error.digest && (
              <p className="text-xs font-mono text-text-tertiary mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Error ID for Production */}
        {!isDevelopment && error.digest && (
          <p className="text-xs text-text-tertiary mb-6">
            Error Reference: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={reset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="primary" className="flex items-center gap-2 w-full sm:w-auto">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>

        {/* Help Link */}
        <p className="mt-8 text-sm text-text-tertiary">
          If this problem persists,{' '}
          <a href="mailto:support@ecocomply.io" className="text-primary hover:underline">
            contact support
          </a>
          {error.digest && ` with reference: ${error.digest}`}
        </p>
      </div>
    </div>
  );
}
