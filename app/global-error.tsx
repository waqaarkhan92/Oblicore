'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#F9FAFB',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ maxWidth: '448px', width: '100%', textAlign: 'center' }}>
            {/* Icon */}
            <div
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle style={{ width: '40px', height: '40px', color: '#DC2626' }} />
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#DC2626',
                marginBottom: '8px',
              }}
            >
              500
            </h1>

            <h2
              style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: '16px',
              }}
            >
              Critical Error
            </h2>

            {/* Description */}
            <p
              style={{
                color: '#6B7280',
                marginBottom: '24px',
                lineHeight: '1.5',
              }}
            >
              A critical error occurred. Please try refreshing the page or contact support if the
              problem persists.
            </p>

            {/* Error ID */}
            {error.digest && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#9CA3AF',
                  marginBottom: '24px',
                }}
              >
                Error Reference: {error.digest}
              </p>
            )}

            {/* Retry Button */}
            <button
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#1E40AF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Try Again
            </button>

            {/* Contact */}
            <p
              style={{
                marginTop: '32px',
                fontSize: '14px',
                color: '#9CA3AF',
              }}
            >
              Need help?{' '}
              <a
                href="mailto:support@ecocomply.io"
                style={{ color: '#1E40AF', textDecoration: 'none' }}
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
