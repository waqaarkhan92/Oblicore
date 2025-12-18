'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  Clock, AlertTriangle, AlertCircle, CheckCircle2, XCircle,
  ArrowRight, TrendingUp, TrendingDown, Activity, Filter,
  RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import Link from 'next/link';

interface ComplianceClock {
  id: string;
  clock_name: string;
  entity_type: string;
  entity_id: string;
  target_date: string;
  status: string;
  criticality: 'RED' | 'AMBER' | 'GREEN';
  days_remaining: number;
  is_overdue: boolean;
  is_critical: boolean;
  is_warning: boolean;
  site_id: string;
  module_id: string;
  sites?: { name: string };
  modules?: { name: string };
}

interface DashboardSummary {
  total: number;
  overdue: number;
  critical: number;
  warning: number;
  completed: number;
}

export default function ComplianceClocksPage() {
  const [filters, setFilters] = useState({
    site_id: '',
    module_id: '',
    status: '',
    criticality: '',
  });
  const [expandedSections, setExpandedSections] = useState({
    red: true,
    amber: true,
    green: false,
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['compliance-clocks-dashboard', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.module_id) params.append('module_id', filters.module_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.criticality) params.append('criticality', filters.criticality);
      params.append('limit', '100');
      const queryString = params.toString();
      const response = await apiClient.get('/compliance-clocks?' + queryString);
      return response as {
        data: ComplianceClock[];
        summary: DashboardSummary;
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const clocks = data?.data || [];
  const summary = data?.summary;

  // Group clocks by criticality
  const groupedClocks = useMemo(() => {
    const groups = {
      red: clocks.filter(c => c.criticality === 'RED' || c.is_overdue || c.days_remaining < 0),
      amber: clocks.filter(c => c.criticality === 'AMBER' && !c.is_overdue && c.days_remaining >= 0 && c.days_remaining <= 30),
      green: clocks.filter(c => c.criticality === 'GREEN' && c.days_remaining > 30),
    };

    // Sort each group by days_remaining
    Object.keys(groups).forEach(key => {
      groups[key as keyof typeof groups].sort((a, b) => a.days_remaining - b.days_remaining);
    });

    return groups;
  }, [clocks]);

  const toggleSection = (section: 'red' | 'amber' | 'green') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Clocks</h1>
          <p className="text-gray-600 mt-2">
            Real-time countdown to critical compliance deadlines
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard
            title="Total Clocks"
            value={summary.total}
            icon={<Clock className="h-6 w-6" />}
            color="blue"
          />
          <SummaryCard
            title="Overdue"
            value={summary.overdue}
            icon={<XCircle className="h-6 w-6" />}
            color="red"
            trend={summary.overdue > 0 ? 'up' : undefined}
          />
          <SummaryCard
            title="Critical (7 days)"
            value={summary.critical}
            icon={<AlertTriangle className="h-6 w-6" />}
            color="orange"
          />
          <SummaryCard
            title="Warning (30 days)"
            value={summary.warning}
            icon={<AlertCircle className="h-6 w-6" />}
            color="yellow"
          />
          <SummaryCard
            title="On Track"
            value={summary.completed}
            icon={<CheckCircle2 className="h-6 w-6" />}
            color="green"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.site_id}
            onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Sites</option>
          </select>

          <select
            value={filters.module_id}
            onChange={(e) => setFilters({ ...filters, module_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Modules</option>
            <option value="module-1">Environmental Permits</option>
            <option value="module-2">Trade Effluent</option>
            <option value="module-3">MCPD/Generators</option>
            <option value="module-4">Hazardous Waste</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="OVERDUE">Overdue</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={filters.criticality}
            onChange={(e) => setFilters({ ...filters, criticality: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Criticality</option>
            <option value="RED">Red (Critical)</option>
            <option value="AMBER">Amber (Warning)</option>
            <option value="GREEN">Green (On Track)</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-md p-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-gray-500">Loading compliance clocks...</p>
          </div>
        </div>
      )}

      {/* Clocks Grouped by Criticality */}
      {!isLoading && (
        <div className="space-y-4">
          {/* RED Section - Critical/Overdue */}
          <CriticalitySection
            title="Critical & Overdue"
            subtitle="Immediate attention required"
            color="red"
            icon={<XCircle className="h-6 w-6" />}
            clocks={groupedClocks.red}
            expanded={expandedSections.red}
            onToggle={() => toggleSection('red')}
          />

          {/* AMBER Section - Warning */}
          <CriticalitySection
            title="Warning Zone"
            subtitle="Due within 30 days"
            color="amber"
            icon={<AlertTriangle className="h-6 w-6" />}
            clocks={groupedClocks.amber}
            expanded={expandedSections.amber}
            onToggle={() => toggleSection('amber')}
          />

          {/* GREEN Section - On Track */}
          <CriticalitySection
            title="On Track"
            subtitle="More than 30 days remaining"
            color="green"
            icon={<CheckCircle2 className="h-6 w-6" />}
            clocks={groupedClocks.green}
            expanded={expandedSections.green}
            onToggle={() => toggleSection('green')}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && clocks.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12">
          <div className="flex flex-col items-center justify-center">
            <Clock className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Compliance Clocks</h3>
            <p className="text-gray-500 text-center max-w-md">
              No active compliance clocks match your filters. Clocks are automatically created
              when obligations with deadlines are added to the system.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  icon,
  color,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'orange' | 'yellow' | 'green';
  trend?: 'up' | 'down';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div className="opacity-70">{icon}</div>
        {trend && (
          <div className={trend === 'up' ? 'text-red-600' : 'text-green-600'}>
            {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm opacity-80">{title}</div>
      </div>
    </div>
  );
}

// Criticality Section Component
function CriticalitySection({
  title,
  subtitle,
  color,
  icon,
  clocks,
  expanded,
  onToggle,
}: {
  title: string;
  subtitle: string;
  color: 'red' | 'amber' | 'green';
  icon: React.ReactNode;
  clocks: ComplianceClock[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      header: 'bg-red-100',
      text: 'text-red-800',
      badge: 'bg-red-600',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      header: 'bg-amber-100',
      text: 'text-amber-800',
      badge: 'bg-amber-500',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      header: 'bg-green-100',
      text: 'text-green-800',
      badge: 'bg-green-600',
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={`rounded-lg border ${classes.border} overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 ${classes.header} ${classes.text} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          {icon}
          <div className="text-left">
            <div className="font-semibold">{title}</div>
            <div className="text-sm opacity-75">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`${classes.badge} text-white px-3 py-1 rounded-full text-sm font-medium`}>
            {clocks.length}
          </span>
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {expanded && (
        <div className={`${classes.bg} p-4`}>
          {clocks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No clocks in this category
            </div>
          ) : (
            <div className="space-y-3">
              {clocks.map((clock) => (
                <ClockCard key={clock.id} clock={clock} color={color} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Clock Card with Countdown Timer
function ClockCard({ clock, color }: { clock: ComplianceClock; color: 'red' | 'amber' | 'green' }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(clock.target_date));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(clock.target_date));
    }, 1000);

    return () => clearInterval(timer);
  }, [clock.target_date]);

  const colorClasses = {
    red: 'border-l-red-500 bg-white',
    amber: 'border-l-amber-500 bg-white',
    green: 'border-l-green-500 bg-white',
  };

  return (
    <Link href={`/dashboard/compliance-clocks/${clock.id}`}>
      <div className={`border-l-4 ${colorClasses[color]} rounded-r-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 mb-1">
              {clock.clock_name}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {clock.entity_type}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {clock.sites?.name && (
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {clock.sites.name}
                </span>
              )}
              {clock.modules?.name && (
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {clock.modules.name}
                </span>
              )}
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="text-right ml-4">
            {clock.is_overdue ? (
              <div className="text-red-600">
                <div className="text-2xl font-bold">{Math.abs(clock.days_remaining)}</div>
                <div className="text-xs font-medium">days overdue</div>
              </div>
            ) : (
              <CountdownDisplay timeLeft={timeLeft} daysRemaining={clock.days_remaining} />
            )}
            <div className="text-xs text-gray-500 mt-2">
              Due: {new Date(clock.target_date).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Countdown Display Component
function CountdownDisplay({
  timeLeft,
  daysRemaining
}: {
  timeLeft: { days: number; hours: number; minutes: number; seconds: number };
  daysRemaining: number;
}) {
  if (daysRemaining > 7) {
    // Show just days for items more than a week away
    return (
      <div className="text-green-600">
        <div className="text-2xl font-bold">{daysRemaining}</div>
        <div className="text-xs font-medium">days left</div>
      </div>
    );
  }

  // Show full countdown for items within a week
  const getTimeColor = () => {
    if (daysRemaining <= 1) return 'text-red-600';
    if (daysRemaining <= 3) return 'text-orange-600';
    return 'text-amber-600';
  };

  return (
    <div className={getTimeColor()}>
      <div className="flex items-baseline gap-1 justify-end">
        {timeLeft.days > 0 && (
          <>
            <span className="text-2xl font-bold">{timeLeft.days}</span>
            <span className="text-xs">d</span>
          </>
        )}
        <span className="text-xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-xs">:</span>
        <span className="text-xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-xs">:</span>
        <span className="text-xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
      <div className="text-xs font-medium">remaining</div>
    </div>
  );
}

// Helper function to calculate time left
function calculateTimeLeft(targetDate: string) {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}
