'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login for now (will be updated with auth check)
    router.replace('/login');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center">
      <div className="text-text-secondary">Redirecting...</div>
    </div>
  );
}

