'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Eye,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface HighlightRange {
  start: number;
  end: number;
  type: 'exact' | 'fuzzy';
  score: number;
}

interface GroundingMatch {
  startIndex: number;
  endIndex: number;
  matchScore: number;
  matchedText: string;
}

interface GroundingData {
  isGrounded: boolean;
  matchScore: number;
  matchedPage: number | null;
  matchedSegment: string | null;
  highlightRanges: HighlightRange[];
  hallucinationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  documentText: string | null;
  extractedText: string | null;
  matches: GroundingMatch[];
  error?: string;
}

interface GroundingValidationProps {
  reviewItemId: string;
  onJumpToMatch?: (matchIndex: number) => void;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function RiskBadge({ risk }: { risk: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const config = {
    LOW: {
      icon: CheckCircle,
      label: 'Low Risk',
      bgClass: 'bg-success/10',
      textClass: 'text-success',
      borderClass: 'border-success/30',
    },
    MEDIUM: {
      icon: AlertTriangle,
      label: 'Medium Risk',
      bgClass: 'bg-warning/10',
      textClass: 'text-warning',
      borderClass: 'border-warning/30',
    },
    HIGH: {
      icon: XCircle,
      label: 'High Risk',
      bgClass: 'bg-danger/10',
      textClass: 'text-danger',
      borderClass: 'border-danger/30',
    },
  };

  const { icon: Icon, label, bgClass, textClass, borderClass } = config[risk];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${bgClass} ${textClass} ${borderClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

function MatchScoreBadge({ score }: { score: number }) {
  let bgClass = 'bg-danger/10 text-danger';
  if (score >= 80) {
    bgClass = 'bg-success/10 text-success';
  } else if (score >= 50) {
    bgClass = 'bg-warning/10 text-warning';
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bgClass}`}>
      {Math.round(score)}% match
    </span>
  );
}

function HighlightedText({
  text,
  highlights,
  selectedMatchIndex,
  onMatchClick,
}: {
  text: string;
  highlights: HighlightRange[];
  selectedMatchIndex: number;
  onMatchClick: (index: number) => void;
}) {
  // Sort highlights by start position
  const sortedHighlights = useMemo(
    () => [...highlights].sort((a, b) => a.start - b.start),
    [highlights]
  );

  // Build segments with highlights
  const segments = useMemo(() => {
    const result: Array<{
      text: string;
      highlighted: boolean;
      matchIndex: number;
      type: 'exact' | 'fuzzy';
    }> = [];

    let lastEnd = 0;

    sortedHighlights.forEach((highlight, index) => {
      // Add non-highlighted text before this highlight
      if (highlight.start > lastEnd) {
        result.push({
          text: text.substring(lastEnd, highlight.start),
          highlighted: false,
          matchIndex: -1,
          type: 'exact',
        });
      }

      // Add highlighted text
      result.push({
        text: text.substring(highlight.start, highlight.end),
        highlighted: true,
        matchIndex: index,
        type: highlight.type,
      });

      lastEnd = highlight.end;
    });

    // Add remaining text after last highlight
    if (lastEnd < text.length) {
      result.push({
        text: text.substring(lastEnd),
        highlighted: false,
        matchIndex: -1,
        type: 'exact',
      });
    }

    return result;
  }, [text, sortedHighlights]);

  return (
    <div className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
      {segments.map((segment, idx) => {
        if (segment.highlighted) {
          const isSelected = segment.matchIndex === selectedMatchIndex;
          const highlightClass =
            segment.type === 'exact'
              ? isSelected
                ? 'bg-success/40 ring-2 ring-success'
                : 'bg-success/20'
              : isSelected
                ? 'bg-warning/40 ring-2 ring-warning'
                : 'bg-warning/20';

          return (
            <span
              key={idx}
              className={`${highlightClass} rounded px-0.5 cursor-pointer transition-all`}
              onClick={() => onMatchClick(segment.matchIndex)}
              title={`Match ${segment.matchIndex + 1} (${segment.type} match)`}
            >
              {segment.text}
            </span>
          );
        }
        return <span key={idx}>{segment.text}</span>;
      })}
    </div>
  );
}

// ============================================================================
// FULL PAGE MODAL
// ============================================================================

function FullPageModal({
  isOpen,
  onClose,
  documentText,
  highlights,
  selectedMatchIndex,
  onMatchClick,
}: {
  isOpen: boolean;
  onClose: () => void;
  documentText: string;
  highlights: HighlightRange[];
  selectedMatchIndex: number;
  onMatchClick: (index: number) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col m-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-input-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Full Document Text
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <HighlightedText
            text={documentText}
            highlights={highlights}
            selectedMatchIndex={selectedMatchIndex}
            onMatchClick={onMatchClick}
          />
        </div>
        <div className="px-6 py-4 border-t border-input-border flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GroundingValidation({
  reviewItemId,
  onJumpToMatch,
}: GroundingValidationProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);
  const [showFullPage, setShowFullPage] = useState(false);

  // Fetch grounding validation data
  const { data, isLoading, error } = useQuery<{ data: GroundingData }>({
    queryKey: ['grounding-validation', reviewItemId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/review-queue/${reviewItemId}/grounding`
      );
      return response.data as { data: GroundingData };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const groundingData = data?.data;

  const handleMatchClick = (matchIndex: number) => {
    setSelectedMatchIndex(matchIndex);
    onJumpToMatch?.(matchIndex);
  };

  const handleNextMatch = () => {
    if (groundingData && groundingData.matches.length > 0) {
      const nextIndex = (selectedMatchIndex + 1) % groundingData.matches.length;
      setSelectedMatchIndex(nextIndex);
      onJumpToMatch?.(nextIndex);
    }
  };

  const handlePrevMatch = () => {
    if (groundingData && groundingData.matches.length > 0) {
      const prevIndex =
        selectedMatchIndex === 0
          ? groundingData.matches.length - 1
          : selectedMatchIndex - 1;
      setSelectedMatchIndex(prevIndex);
      onJumpToMatch?.(prevIndex);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-base p-6">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Validating extraction against source document...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !groundingData) {
    return (
      <div className="bg-white rounded-lg shadow-base p-6">
        <div className="flex items-center gap-3 text-danger">
          <XCircle className="h-5 w-5" />
          <span>Failed to validate grounding</span>
        </div>
      </div>
    );
  }

  // No document text available
  if (groundingData.error || !groundingData.documentText) {
    return (
      <div className="bg-white rounded-lg shadow-base p-6">
        <div className="flex items-center gap-3 text-warning">
          <AlertTriangle className="h-5 w-5" />
          <span>
            {groundingData.error || 'Document text not available for validation'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-base overflow-hidden">
        {/* Header - Always visible */}
        <button
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-background-secondary transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-4">
            <FileText className="h-5 w-5 text-text-secondary" />
            <div className="text-left">
              <h3 className="font-semibold text-text-primary">
                Grounding Validation
              </h3>
              <p className="text-sm text-text-secondary">
                {groundingData.isGrounded
                  ? 'Text found in source document'
                  : 'Text not found in source document'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RiskBadge risk={groundingData.hallucinationRisk} />
            <MatchScoreBadge score={groundingData.matchScore} />
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-5 w-5 text-text-tertiary" />
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-input-border">
            {/* Match Navigation */}
            {groundingData.matches.length > 0 && (
              <div className="px-6 py-3 bg-background-secondary flex items-center justify-between border-b border-input-border">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <span>
                    Match {selectedMatchIndex + 1} of{' '}
                    {groundingData.matches.length}
                  </span>
                  {groundingData.matchedPage && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                      Page {groundingData.matchedPage}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevMatch}
                    disabled={groundingData.matches.length <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextMatch}
                    disabled={groundingData.matches.length <= 1}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullPage(true)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Full Page
                  </Button>
                </div>
              </div>
            )}

            {/* Split View */}
            <div className="grid grid-cols-2 divide-x divide-input-border">
              {/* Left: Document Text */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-text-secondary">
                    Source Document
                  </h4>
                  <span className="text-xs text-text-tertiary">
                    Matching sections highlighted
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto bg-background-tertiary rounded-lg p-4">
                  <HighlightedText
                    text={
                      groundingData.documentText.length > 2000
                        ? groundingData.documentText.substring(0, 2000) + '...'
                        : groundingData.documentText
                    }
                    highlights={groundingData.highlightRanges}
                    selectedMatchIndex={selectedMatchIndex}
                    onMatchClick={handleMatchClick}
                  />
                </div>
              </div>

              {/* Right: Extracted Text */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-text-secondary">
                    Extracted Text
                  </h4>
                  <span className="text-xs text-text-tertiary">
                    AI-extracted content
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto bg-background-tertiary rounded-lg p-4">
                  <p className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                    {groundingData.extractedText}
                  </p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="px-6 py-3 bg-background-secondary border-t border-input-border">
              <div className="flex items-center gap-6 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-success/20 rounded" />
                  <span>Exact match</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-warning/20 rounded" />
                  <span>Fuzzy match</span>
                </div>
                <div className="flex-1" />
                <a
                  href="#"
                  className="text-primary hover:underline flex items-center gap-1"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowFullPage(true);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  View full document
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Page Modal */}
      <FullPageModal
        isOpen={showFullPage}
        onClose={() => setShowFullPage(false)}
        documentText={groundingData.documentText}
        highlights={groundingData.highlightRanges}
        selectedMatchIndex={selectedMatchIndex}
        onMatchClick={handleMatchClick}
      />
    </>
  );
}

export default GroundingValidation;
