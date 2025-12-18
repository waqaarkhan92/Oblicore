'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  FileText, Calendar, User, Eye, ArrowLeftRight, Plus, Minus,
  Edit3, Check, AlertTriangle, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PermitVersion {
  id: string;
  document_id: string;
  version_number: number;
  version_type: string;
  version_date: string;
  effective_date?: string;
  expiry_date?: string;
  change_summary?: string;
  file_url?: string;
  file_name?: string;
  uploaded_at: string;
  uploaded_by?: { full_name: string };
  is_current: boolean;
}

interface TextDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: Array<{
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: number;
  }>;
}

interface ComparisonResult {
  version_a: {
    id: string;
    version_number: number;
    version_type: string;
    version_date: string;
    document_name?: string;
  };
  version_b: {
    id: string;
    version_number: number;
    version_type: string;
    version_date: string;
    document_name?: string;
  };
  text_diff: {
    hunks: TextDiffHunk[];
    stats: { added: number; removed: number; unchanged: number };
    unified_diff: string;
  };
  obligation_changes: {
    added: any[];
    removed: any[];
    modified: any[];
    unchanged: any[];
  };
  summary: {
    text_lines_added: number;
    text_lines_removed: number;
    obligations_added: number;
    obligations_removed: number;
    obligations_modified: number;
  };
}

interface PermitVersionComparisonProps {
  documentId: string;
}

export function PermitVersionComparison({ documentId }: PermitVersionComparisonProps) {
  const [selectedVersions, setSelectedVersions] = useState<[string | null, string | null]>([null, null]);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified' | 'obligations'>('side-by-side');
  const [expandedHunks, setExpandedHunks] = useState<Set<number>>(new Set());

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['permit-versions', documentId],
    queryFn: async () => {
      return apiClient.get<{ data: PermitVersion[] }>('/module-1/permit-versions?document_id=' + documentId);
    },
  });

  const versions = (versionsData as any)?.data || [];
  const [versionA, versionB] = selectedVersions;

  // Auto-select first two versions when loaded
  useEffect(() => {
    if (versions.length >= 2 && !versionA && !versionB) {
      // Select the two most recent versions
      const sortedVersions = [...versions].sort((a: PermitVersion, b: PermitVersion) => b.version_number - a.version_number);
      setSelectedVersions([sortedVersions[1]?.id || null, sortedVersions[0]?.id || null]);
    }
  }, [versions, versionA, versionB]);

  // Fetch comparison data when both versions are selected
  const { data: comparisonData, isLoading: comparisonLoading, refetch: refetchComparison } = useQuery({
    queryKey: ['permit-comparison', versionA, versionB],
    queryFn: async () => {
      if (!versionA || !versionB) return null;
      return apiClient.get<ComparisonResult>(
        `/module-1/permit-versions/compare?v1=${versionA}&v2=${versionB}`
      );
    },
    enabled: !!versionA && !!versionB,
  });

  const comparison = comparisonData as ComparisonResult | null;

  const toggleHunk = (index: number) => {
    const newExpanded = new Set(expandedHunks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedHunks(newExpanded);
  };

  if (versionsLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-primary animate-spin mr-2" />
          <span className="text-gray-500">Loading versions...</span>
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No version history available</p>
        </div>
      </div>
    );
  }

  const versionAData = versions.find((v: PermitVersion) => v.id === versionA);
  const versionBData = versions.find((v: PermitVersion) => v.id === versionB);

  return (
    <div className="space-y-6">
      {/* Version Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Versions to Compare</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Old Version (Base)
            </label>
            <select
              value={versionA || ''}
              onChange={(e) => setSelectedVersions([e.target.value || null, versionB])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select version...</option>
              {versions.map((v: PermitVersion) => (
                <option key={v.id} value={v.id} disabled={v.id === versionB}>
                  v{v.version_number} - {v.version_type} ({new Date(v.version_date).toLocaleDateString()})
                  {v.is_current ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Version (Compare)
            </label>
            <select
              value={versionB || ''}
              onChange={(e) => setSelectedVersions([versionA, e.target.value || null])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select version...</option>
              {versions.map((v: PermitVersion) => (
                <option key={v.id} value={v.id} disabled={v.id === versionA}>
                  v{v.version_number} - {v.version_type} ({new Date(v.version_date).toLocaleDateString()})
                  {v.is_current ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Result */}
      {versionA && versionB && (
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header with stats */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Redline Comparison</h2>
              <p className="text-sm text-gray-500">
                Comparing v{versionAData?.version_number} → v{versionBData?.version_number}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'side-by-side' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('side-by-side')}
              >
                <ArrowLeftRight className="h-4 w-4 mr-1" />
                Side by Side
              </Button>
              <Button
                variant={viewMode === 'unified' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('unified')}
              >
                <FileText className="h-4 w-4 mr-1" />
                Unified
              </Button>
              <Button
                variant={viewMode === 'obligations' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('obligations')}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Obligations
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          {comparison && (
            <div className="grid grid-cols-5 gap-4 mb-6">
              <StatCard
                icon={<Plus className="h-4 w-4" />}
                label="Lines Added"
                value={comparison.summary.text_lines_added}
                color="green"
              />
              <StatCard
                icon={<Minus className="h-4 w-4" />}
                label="Lines Removed"
                value={comparison.summary.text_lines_removed}
                color="red"
              />
              <StatCard
                icon={<Plus className="h-4 w-4" />}
                label="Obligations Added"
                value={comparison.summary.obligations_added}
                color="green"
              />
              <StatCard
                icon={<Minus className="h-4 w-4" />}
                label="Obligations Removed"
                value={comparison.summary.obligations_removed}
                color="red"
              />
              <StatCard
                icon={<Edit3 className="h-4 w-4" />}
                label="Obligations Modified"
                value={comparison.summary.obligations_modified}
                color="yellow"
              />
            </div>
          )}

          {comparisonLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 text-primary animate-spin mr-2" />
              <span className="text-gray-500">Computing differences...</span>
            </div>
          )}

          {/* Diff View */}
          {comparison && !comparisonLoading && viewMode === 'unified' && (
            <UnifiedDiffView hunks={comparison.text_diff.hunks} expandedHunks={expandedHunks} toggleHunk={toggleHunk} />
          )}

          {comparison && !comparisonLoading && viewMode === 'side-by-side' && (
            <SideBySideDiffView hunks={comparison.text_diff.hunks} />
          )}

          {comparison && !comparisonLoading && viewMode === 'obligations' && (
            <ObligationChangesView changes={comparison.obligation_changes} />
          )}
        </div>
      )}

      {/* Version History List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
        <div className="space-y-3">
          {versions.map((version: PermitVersion) => (
            <VersionCard
              key={version.id}
              version={version}
              isSelected={selectedVersions.includes(version.id)}
              selectionRole={
                version.id === versionA ? 'base' : version.id === versionB ? 'compare' : undefined
              }
              onClick={() => {
                if (!versionA || (versionA && versionB)) {
                  setSelectedVersions([version.id, null]);
                } else if (version.id !== versionA) {
                  setSelectedVersions([versionA, version.id]);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className={`rounded-lg border p-3 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// Version Card Component
function VersionCard({
  version,
  isSelected,
  selectionRole,
  onClick,
}: {
  version: PermitVersion;
  isSelected: boolean;
  selectionRole?: 'base' | 'compare';
  onClick: () => void;
}) {
  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded">
            v{version.version_number}
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            {version.version_type}
          </span>
          {version.is_current && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
              Current
            </span>
          )}
          {selectionRole === 'base' && (
            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
              Base
            </span>
          )}
          {selectionRole === 'compare' && (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
              Compare
            </span>
          )}
        </div>
      </div>
      {version.change_summary && (
        <p className="text-sm text-gray-600 mt-2">{version.change_summary}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(version.version_date).toLocaleDateString()}
        </span>
        {version.uploaded_by?.full_name && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {version.uploaded_by.full_name}
          </span>
        )}
      </div>
    </div>
  );
}

// Unified Diff View
function UnifiedDiffView({
  hunks,
  expandedHunks,
  toggleHunk,
}: {
  hunks: TextDiffHunk[];
  expandedHunks: Set<number>;
  toggleHunk: (index: number) => void;
}) {
  if (hunks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
        No differences found between versions
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {hunks.map((hunk, index) => (
        <div key={index} className="border-b last:border-b-0">
          <button
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={() => toggleHunk(index)}
          >
            <span className="text-sm font-mono text-gray-600">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </span>
            {expandedHunks.has(index) ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {(expandedHunks.has(index) || expandedHunks.size === 0) && (
            <div className="font-mono text-sm">
              {hunk.lines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className={`px-4 py-0.5 ${
                    line.type === 'added'
                      ? 'bg-green-50 text-green-800'
                      : line.type === 'removed'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <span className="inline-block w-6 text-gray-400 select-none">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </span>
                  <span>{line.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Side by Side Diff View
function SideBySideDiffView({ hunks }: { hunks: TextDiffHunk[] }) {
  if (hunks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
        No differences found between versions
      </div>
    );
  }

  // Process hunks into left/right aligned lines
  const processedLines: Array<{ left: string | null; right: string | null; type: 'added' | 'removed' | 'unchanged' }> = [];

  hunks.forEach(hunk => {
    hunk.lines.forEach(line => {
      if (line.type === 'unchanged') {
        processedLines.push({ left: line.content, right: line.content, type: 'unchanged' });
      } else if (line.type === 'removed') {
        processedLines.push({ left: line.content, right: null, type: 'removed' });
      } else if (line.type === 'added') {
        processedLines.push({ left: null, right: line.content, type: 'added' });
      }
    });
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 divide-x">
        <div className="bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
          Old Version
        </div>
        <div className="bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
          New Version
        </div>
      </div>
      <div className="max-h-[500px] overflow-auto">
        {processedLines.map((line, index) => (
          <div key={index} className="grid grid-cols-2 divide-x font-mono text-sm">
            <div
              className={`px-4 py-0.5 ${
                line.type === 'removed' ? 'bg-red-100 text-red-800' : 'bg-white text-gray-700'
              }`}
            >
              {line.left !== null ? line.left : '\u00A0'}
            </div>
            <div
              className={`px-4 py-0.5 ${
                line.type === 'added' ? 'bg-green-100 text-green-800' : 'bg-white text-gray-700'
              }`}
            >
              {line.right !== null ? line.right : '\u00A0'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Obligation Changes View
function ObligationChangesView({
  changes,
}: {
  changes: { added: any[]; removed: any[]; modified: any[]; unchanged: any[] };
}) {
  return (
    <div className="space-y-4">
      {changes.added.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-green-800 mb-2">
            <Plus className="h-4 w-4" />
            Added Obligations ({changes.added.length})
          </h3>
          <div className="space-y-2">
            {changes.added.map((ob, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="font-medium text-green-900">
                  {ob.obligation?.obligation_title || 'Untitled Obligation'}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  {ob.obligation?.obligation_description || ob.change_summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.removed.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-red-800 mb-2">
            <Minus className="h-4 w-4" />
            Removed Obligations ({changes.removed.length})
          </h3>
          <div className="space-y-2">
            {changes.removed.map((ob, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="font-medium text-red-900">
                  {ob.obligation?.obligation_title || 'Untitled Obligation'}
                </div>
                <div className="text-sm text-red-700 mt-1">
                  {ob.obligation?.obligation_description || ob.change_summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.modified.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-yellow-800 mb-2">
            <Edit3 className="h-4 w-4" />
            Modified Obligations ({changes.modified.length})
          </h3>
          <div className="space-y-2">
            {changes.modified.map((ob, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="font-medium text-yellow-900">
                  {ob.obligation?.obligation_title || 'Untitled Obligation'}
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  {ob.change_summary || ob.obligation?.obligation_description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.added.length === 0 && changes.removed.length === 0 && changes.modified.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
          No obligation changes between versions
        </div>
      )}
    </div>
  );
}
