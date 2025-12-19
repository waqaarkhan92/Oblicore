'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightsData {
  metrics: {
    patternHitRate: number;
    patternHitRateTrend: number;
    totalAICost: number;
    totalAICostTrend: number;
    activePatternsCount: number;
    avgConfidenceScore: number;
  };
  costTrend: Array<{
    date: string;
    cost: number;
    requests: number;
  }>;
  topPatterns: Array<{
    id: string;
    name: string;
    usageCount: number;
    successRate: number;
    avgConfidence: number;
  }>;
  costByRegulator: Array<{
    regulator: string;
    totalCost: number;
    requestCount: number;
    avgCostPerRequest: number;
  }>;
}

export default function AIInsightsPage() {
  // Fetch AI insights data
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async (): Promise<AIInsightsData> => {
      const response = await apiClient.get<AIInsightsData>('/admin/ai-insights');
      return response.data;
    },
    // For now, this will fail gracefully - we'll show the UI structure
    retry: false,
  });

  const metrics = data?.metrics || {
    patternHitRate: 0,
    patternHitRateTrend: 0,
    totalAICost: 0,
    totalAICostTrend: 0,
    activePatternsCount: 0,
    avgConfidenceScore: 0,
  };

  const costTrend = data?.costTrend || [];
  const topPatterns = data?.topPatterns || [];
  const costByRegulator = data?.costByRegulator || [];

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI Learning Dashboard"
          description="Monitor AI extraction patterns, costs, and performance metrics"
        />

        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">API Endpoint Not Yet Configured</h2>
          <p className="text-text-secondary mb-4">
            The AI insights API endpoint needs to be created at <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/admin/ai-insights</code>
          </p>
          <p className="text-sm text-text-tertiary">
            This page is ready to display data once the backend endpoint is implemented.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI Learning Dashboard"
          description="Monitor AI extraction patterns, costs, and performance metrics"
        />

        {/* Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <Skeleton className="h-4 w-[120px] mb-4" />
              <Skeleton className="h-10 w-[80px] mb-2" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          ))}
        </div>

        {/* Chart Section Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Skeleton className="h-6 w-[200px] mb-6" />
          <Skeleton className="h-[300px] w-full" />
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <Skeleton className="h-6 w-[180px] mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <Skeleton className="h-6 w-[180px] mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="AI Learning Dashboard"
        description="Monitor AI extraction patterns, costs, and performance metrics"
      />

      {/* Hero Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pattern Hit Rate */}
        <MetricCard
          label="Pattern Hit Rate"
          value={`${metrics.patternHitRate}%`}
          trend={metrics.patternHitRateTrend}
          icon={<Target className="h-5 w-5" />}
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
        />

        {/* Total AI Cost */}
        <MetricCard
          label="Total AI Cost"
          value={`$${metrics.totalAICost.toFixed(2)}`}
          trend={metrics.totalAICostTrend}
          subtitle="This month"
          icon={<DollarSign className="h-5 w-5" />}
          iconBgColor="bg-warning/10"
          iconColor="text-warning"
        />

        {/* Active Patterns */}
        <MetricCard
          label="Active Patterns"
          value={metrics.activePatternsCount.toString()}
          icon={<Brain className="h-5 w-5" />}
          iconBgColor="bg-success/10"
          iconColor="text-success"
        />

        {/* Avg Confidence Score */}
        <MetricCard
          label="Avg Confidence Score"
          value={`${metrics.avgConfidenceScore}%`}
          icon={<Activity className="h-5 w-5" />}
          iconBgColor="bg-info/10"
          iconColor="text-info"
        />
      </div>

      {/* Cost Trend Chart Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-text-primary">Cost Trend</h2>
          <p className="text-sm text-text-secondary">AI extraction costs over time</p>
        </div>
        <div className="p-6">
          {costTrend.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-sm font-medium text-text-secondary pb-3 px-4">Date</th>
                    <th className="text-right text-sm font-medium text-text-secondary pb-3 px-4">Cost</th>
                    <th className="text-right text-sm font-medium text-text-secondary pb-3 px-4">Requests</th>
                    <th className="text-right text-sm font-medium text-text-secondary pb-3 px-4">Avg/Request</th>
                  </tr>
                </thead>
                <tbody>
                  {costTrend.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4 text-sm text-text-primary">{item.date}</td>
                      <td className="py-3 px-4 text-sm text-text-primary text-right font-medium">
                        ${item.cost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary text-right">{item.requests}</td>
                      <td className="py-3 px-4 text-sm text-text-secondary text-right">
                        ${(item.cost / item.requests).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <p className="text-sm">No cost data available yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout: Pattern Library + Cost by Regulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pattern Library Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-text-primary">Pattern Library Status</h2>
            <p className="text-sm text-text-secondary">Top 10 patterns by usage</p>
          </div>
          <div className="p-6">
            {topPatterns.length > 0 ? (
              <div className="space-y-3">
                {topPatterns.slice(0, 10).map((pattern, index) => (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-tertiary w-6">#{index + 1}</span>
                        <p className="text-sm font-medium text-text-primary truncate">
                          {pattern.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 ml-8">
                        <span className="text-xs text-text-secondary">
                          {pattern.usageCount} uses
                        </span>
                        <span className="text-xs text-text-secondary">
                          {pattern.avgConfidence}% avg confidence
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <div
                        className={cn(
                          'text-sm font-semibold px-2 py-1 rounded',
                          pattern.successRate >= 90
                            ? 'bg-success/10 text-success'
                            : pattern.successRate >= 70
                            ? 'bg-warning/10 text-warning'
                            : 'bg-danger/10 text-danger'
                        )}
                      >
                        {pattern.successRate}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <p className="text-sm">No pattern data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Cost Breakdown by Regulator */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-text-primary">Cost by Regulator</h2>
            <p className="text-sm text-text-secondary">AI extraction costs per regulator</p>
          </div>
          <div className="p-6">
            {costByRegulator.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-medium text-text-secondary pb-3">Regulator</th>
                      <th className="text-right text-xs font-medium text-text-secondary pb-3">Total Cost</th>
                      <th className="text-right text-xs font-medium text-text-secondary pb-3">Requests</th>
                      <th className="text-right text-xs font-medium text-text-secondary pb-3">Avg/Req</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costByRegulator.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 text-sm text-text-primary font-medium">{item.regulator}</td>
                        <td className="py-3 text-sm text-text-primary text-right font-semibold">
                          ${item.totalCost.toFixed(2)}
                        </td>
                        <td className="py-3 text-sm text-text-secondary text-right">{item.requestCount}</td>
                        <td className="py-3 text-sm text-text-secondary text-right">
                          ${item.avgCostPerRequest.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <p className="text-sm">No cost data available yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  trend?: number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

function MetricCard({
  label,
  value,
  trend,
  subtitle,
  icon,
  iconBgColor,
  iconColor,
}: MetricCardProps) {
  const hasTrend = trend !== undefined && trend !== 0;
  const isPositiveTrend = trend && trend > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        <div className={cn('p-2 rounded-lg', iconBgColor)}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-text-primary tracking-tight">
          {value}
        </span>
      </div>
      {subtitle && (
        <p className="text-xs text-text-tertiary">{subtitle}</p>
      )}
      {hasTrend && (
        <div className="flex items-center gap-1 mt-2">
          {isPositiveTrend ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-danger" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              isPositiveTrend ? 'text-success' : 'text-danger'
            )}
          >
            {isPositiveTrend ? '+' : ''}{trend}% vs last month
          </span>
        </div>
      )}
    </div>
  );
}
