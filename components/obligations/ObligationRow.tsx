/**
 * Professional Obligation Row Component
 * Displays obligation data in a compact row format for better information density
 */

import Link from 'next/link';
import { Calendar, FileText, AlertCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';

interface ObligationRowProps {
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
  DUE_SOON: { bg: 'bg-orange-100', text: 'text-orange-800', icon: Clock },
  OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle2 },
  NOT_APPLICABLE: { bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle2 },
};

export function ObligationRow({ obligation }: ObligationRowProps) {
  const categoryStyle = categoryColors[obligation.category] || categoryColors.OPERATIONAL;
  const statusStyle = statusConfig[obligation.status] || statusConfig.PENDING;
  const StatusIcon = statusStyle.icon;

  return (
    <Link
      href={`/dashboard/obligations/${obligation.id}`}
      className="block group"
    >
      <div className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
        <div className="px-6 py-4">
          <div className="flex items-start gap-4">
            {/* Left Column - Main Content */}
            <div className="flex-1 min-w-0">
              {/* Title and Status */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary transition-colors flex-1">
                  {obligation.obligation_title}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} flex-shrink-0`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {obligation.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Original Text */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {obligation.original_text}
              </p>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Category */}
                <div className={`inline-flex items-center px-2.5 py-1 rounded-md font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>
                  <span className="mr-1.5">{categoryStyle.icon}</span>
                  {obligation.category.replace(/_/g, ' ')}
                </div>

                {/* Condition Reference */}
                {obligation.condition_reference && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-medium">
                    <FileText className="w-3 h-3 mr-1" />
                    Clause {obligation.condition_reference}
                  </div>
                )}

                {/* Page Reference */}
                {obligation.page_reference && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                    📄 Page {obligation.page_reference}
                  </div>
                )}

                {/* Frequency */}
                {obligation.frequency && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 font-medium">
                    <Clock className="w-3 h-3 mr-1" />
                    {obligation.frequency.replace(/_/g, ' ')}
                  </div>
                )}

                {/* Deadline */}
                {obligation.deadline_date && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(obligation.deadline_date).toLocaleDateString()}
                  </div>
                )}

                {/* Confidence Score */}
                {obligation.confidence_score && !obligation.deadline_date && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                    <span className="mr-1">🎯</span>
                    {Math.round(obligation.confidence_score * 100)}% confident
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Chevron */}
            <div className="flex-shrink-0 pt-1">
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

