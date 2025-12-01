/**
 * Professional Obligation Card Component
 */

import Link from 'next/link';
import { Calendar, FileText, Tag, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface ObligationCardProps {
  obligation: {
    id: string;
    obligation_title: string;
    original_text: string;
    category: string;
    status: string;
    deadline_date: string | null;
    condition_reference?: string | null;
    page_reference?: number | null;
    frequency?: string | null;
    confidence_score?: number;
  };
}

const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  MONITORING: { bg: 'bg-blue-50', text: 'text-blue-700', icon: '📊' },
  REPORTING: { bg: 'bg-purple-50', text: 'text-purple-700', icon: '📝' },
  RECORD_KEEPING: { bg: 'bg-green-50', text: 'text-green-700', icon: '📁' },
  OPERATIONAL: { bg: 'bg-orange-50', text: 'text-orange-700', icon: '⚙️' },
  MAINTENANCE: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '🔧' },
};

const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2 },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle2 },
};

export function ObligationCard({ obligation }: ObligationCardProps) {
  const categoryStyle = categoryColors[obligation.category] || categoryColors.OPERATIONAL;
  const statusStyle = statusConfig[obligation.status] || statusConfig.PENDING;
  const StatusIcon = statusStyle.icon;

  return (
    <Link
      href={`/dashboard/obligations/${obligation.id}`}
      className="block group"
    >
      <div className="bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 mb-2">
              {obligation.obligation_title}
            </h3>

            {/* Reference Tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {obligation.condition_reference && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                  <FileText className="w-3 h-3 mr-1" />
                  Clause {obligation.condition_reference}
                </span>
              )}
              {obligation.page_reference && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                  📄 Page {obligation.page_reference}
                </span>
              )}
              {obligation.frequency && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                  <Clock className="w-3 h-3 mr-1" />
                  {obligation.frequency}
                </span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} ml-3 flex-shrink-0`}>
            <StatusIcon className="w-3.5 h-3.5 mr-1" />
            {obligation.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Obligation Text Preview */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
          {obligation.original_text}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {/* Category */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>
            <span className="mr-1.5">{categoryStyle.icon}</span>
            {obligation.category.replace(/_/g, ' ')}
          </div>

          {/* Deadline or Confidence */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {obligation.deadline_date ? (
              <div className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                {new Date(obligation.deadline_date).toLocaleDateString()}
              </div>
            ) : obligation.confidence_score ? (
              <div className="flex items-center">
                <span className="mr-1">🎯</span>
                {Math.round(obligation.confidence_score * 100)}% confident
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
