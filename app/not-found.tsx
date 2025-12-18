'use client';

import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <FileQuestion className="h-10 w-10 text-primary" />
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Page Not Found</h2>

        {/* Description */}
        <p className="text-text-secondary mb-8">
          The page you're looking for doesn't exist or has been moved.
          Check the URL or navigate back to the dashboard.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
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
          Need help?{' '}
          <a href="mailto:support@ecocomply.io" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
