'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  AlertTriangle,
  CheckCircle2,
  Upload,
  FileSearch,
  Clock,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface GuidanceItem {
  id: string;
  type: 'overdue' | 'review' | 'evidence_gap' | 'low_compliance' | 'pending_action';
  priority: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  context?: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
}

interface WhatToDoNextProps {
  limit?: number;
  className?: string;
}

export function WhatToDoNext({ limit = 3, className }: WhatToDoNextProps) {
  // Fetch dashboard stats to determine guidance
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/dashboard/stats');
      return response.data;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch review queue count
  const { data: reviewQueue } = useQuery({
    queryKey: ['review-queue-count'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/review-queue?filter[status]=PENDING&limit=1');
      return response.data;
    },
    staleTime: 60000,
  });

  // Fetch sites with low compliance
  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/sites');
      return response.data;
    },
    staleTime: 60000,
  });

  const generateGuidanceItems = (): GuidanceItem[] => {
    const items: GuidanceItem[] = [];
    const totals = stats?.totals || {};
    const sites = sitesData?.data || [];
    const pendingReviews = reviewQueue?.pagination?.total || 0;

    // Priority 1: Overdue items (Critical)
    if (totals.overdue > 0) {
      items.push({
        id: 'overdue-items',
        type: 'overdue',
        priority: 'critical',
        title: `${totals.overdue} overdue ${totals.overdue === 1 ? 'obligation' : 'obligations'} need attention`,
        description: 'These items have passed their deadline. Address them immediately to avoid compliance issues.',
        actionLabel: 'View Overdue Items',
        actionHref: '/dashboard/deadlines?filter=overdue',
        context: 'Overdue obligations may result in regulatory non-compliance',
        icon: <AlertTriangle className="h-5 w-5 text-danger" />,
        bgColor: 'bg-danger/5',
        borderColor: 'border-danger/30',
      });
    }

    // Priority 2: Pending reviews (High)
    if (pendingReviews > 0) {
      items.push({
        id: 'pending-reviews',
        type: 'review',
        priority: 'high',
        title: `${pendingReviews} AI extraction${pendingReviews === 1 ? '' : 's'} awaiting review`,
        description: 'Review and confirm AI-extracted obligations to ensure accuracy.',
        actionLabel: 'Start Review',
        actionHref: '/dashboard/review-queue',
        context: 'Unreviewed extractions may contain errors',
        icon: <FileSearch className="h-5 w-5 text-warning" />,
        bgColor: 'bg-warning/5',
        borderColor: 'border-warning/30',
      });
    }

    // Priority 3: Due soon items (High)
    if (totals.due_soon > 0 && totals.overdue === 0) {
      items.push({
        id: 'due-soon',
        type: 'pending_action',
        priority: 'high',
        title: `${totals.due_soon} ${totals.due_soon === 1 ? 'obligation' : 'obligations'} due within 7 days`,
        description: 'Plan ahead to complete these items before their deadline.',
        actionLabel: 'View Due Soon',
        actionHref: '/dashboard/deadlines?filter=this-week',
        icon: <Clock className="h-5 w-5 text-warning" />,
        bgColor: 'bg-warning/5',
        borderColor: 'border-warning/30',
      });
    }

    // Priority 4: Sites with low compliance (Medium)
    const lowComplianceSites = sites.filter((site: any) =>
      site.compliance_score !== undefined && site.compliance_score < 70
    );
    if (lowComplianceSites.length > 0) {
      const worstSite = lowComplianceSites.sort((a: any, b: any) =>
        (a.compliance_score || 0) - (b.compliance_score || 0)
      )[0];
      items.push({
        id: 'low-compliance',
        type: 'low_compliance',
        priority: 'medium',
        title: `${worstSite.name} has ${worstSite.compliance_score}% compliance`,
        description: 'This site requires attention to improve compliance status.',
        actionLabel: 'View Site',
        actionHref: `/dashboard/sites/${worstSite.id}/dashboard`,
        icon: <RefreshCw className="h-5 w-5 text-primary" />,
        bgColor: 'bg-primary/5',
        borderColor: 'border-primary/30',
      });
    }

    // Priority 5: Evidence upload suggestion (Medium)
    if (totals.evidence === 0 || (totals.obligations > 0 && totals.evidence < totals.obligations * 0.5)) {
      items.push({
        id: 'upload-evidence',
        type: 'evidence_gap',
        priority: 'medium',
        title: 'Upload evidence to strengthen compliance',
        description: 'Attach supporting documents to your obligations for better audit readiness.',
        actionLabel: 'Upload Evidence',
        actionHref: '/dashboard/evidence/upload',
        icon: <Upload className="h-5 w-5 text-primary" />,
        bgColor: 'bg-primary/5',
        borderColor: 'border-primary/30',
      });
    }

    // If everything looks good, show a positive message
    if (items.length === 0) {
      items.push({
        id: 'all-good',
        type: 'pending_action',
        priority: 'medium',
        title: 'Great job! You\'re on top of your compliance',
        description: 'Continue monitoring your obligations and keeping evidence up to date.',
        actionLabel: 'View Dashboard',
        actionHref: '/dashboard',
        icon: <CheckCircle2 className="h-5 w-5 text-success" />,
        bgColor: 'bg-success/5',
        borderColor: 'border-success/30',
      });
    }

    return items.slice(0, limit);
  };

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
        <div className="px-6 py-4 border-b border-gray-100">
          <Skeleton className="h-6 w-[180px]" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-gray-200">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-[250px] mb-2" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-8 w-[100px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = generateGuidanceItems();

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text-primary">What to Do Next</h2>
      </div>

      <div className="p-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'p-4 rounded-lg border-2 transition-all hover:shadow-md',
              item.bgColor,
              item.borderColor
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                'p-2 rounded-lg',
                item.priority === 'critical' ? 'bg-danger/10' :
                item.priority === 'high' ? 'bg-warning/10' : 'bg-primary/10'
              )}>
                {item.icon}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary mb-2">
                  {item.description}
                </p>
                {item.context && (
                  <p className="text-xs text-text-tertiary italic">
                    {item.context}
                  </p>
                )}
              </div>

              <Link href={item.actionHref} className="flex-shrink-0">
                <Button
                  variant={item.priority === 'critical' ? 'danger' : item.priority === 'high' ? 'secondary' : 'outline'}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {item.actionLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
