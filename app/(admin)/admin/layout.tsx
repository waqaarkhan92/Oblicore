'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';
import { Brain, Users, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  {
    label: 'AI Insights',
    href: '/admin/ai-insights',
    icon: <Brain className="h-5 w-5" />,
  },
  {
    label: 'Reviewer Metrics',
    href: '/admin/reviewer-metrics',
    icon: <Users className="h-5 w-5" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, _hasHydrated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (_hasHydrated) {
      // Check if user has OWNER role
      if (!user || user.role !== 'OWNER') {
        router.push('/dashboard');
        return;
      }
      setIsChecking(false);
    }
  }, [_hasHydrated, user, router]);

  // Show loading state while checking permissions
  if (isChecking) {
    return (
      <div className="flex h-screen bg-background-secondary items-center justify-center">
        <div className="text-text-secondary">Checking permissions...</div>
      </div>
    );
  }

  // Don't render if not authorized
  if (!user || user.role !== 'OWNER') {
    return null;
  }

  return (
    <div className="flex h-screen bg-background-secondary">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Admin Panel</h2>
            <p className="text-sm text-text-secondary">System Administration</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer - Back to Dashboard */}
          <div className="p-4 border-t border-gray-200">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background-secondary p-6">
        {children}
      </main>
    </div>
  );
}
