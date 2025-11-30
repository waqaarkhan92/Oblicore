/**
 * PWA Provider
 * Registers service worker and handles PWA lifecycle
 * Reference: docs/specs/61_Frontend_Routes_Components.md Section 19-20
 */

'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa/register-service-worker';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}

