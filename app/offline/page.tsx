/**
 * Offline Page
 * Shown when user is offline and page is not cached
 * Reference: docs/specs/61_Frontend_Routes_Components.md Section 19
 */

'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const router = useRouter();

  const handleRetry = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center">
            <WifiOff className="h-10 w-10 text-warning" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-text-primary mb-2">You're Offline</h1>
        <p className="text-text-secondary mb-6">
          It looks like you've lost your internet connection. Please check your network settings and try again.
        </p>

        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={handleRetry}
            icon={<RefreshCw className="h-4 w-4" />}
            iconPosition="left"
            fullWidth
          >
            Try Again
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            fullWidth
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

