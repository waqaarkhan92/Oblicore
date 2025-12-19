'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Brain,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Zap,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractionExplanation {
  source: 'RULE_LIBRARY' | 'LLM_EXTRACTION' | 'HYBRID';
  ruleLibraryMatch?: {
    patternId: string;
    version: number;
    matchScore: number;
  };
  llmExtraction?: {
    model: string;
    pass: number;
    tokensUsed: number;
  };
  groundingValidation: {
    textFound: boolean;
    pageNumber?: number;
    hallucinationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  confidence: number;
  extractedAt: string;
}

export interface ExtractionExplanationProps {
  explanation: ExtractionExplanation | null;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ExtractionExplanation({
  explanation,
  isLoading = false,
  className,
}: ExtractionExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return <ExtractionExplanationSkeleton className={className} />;
  }

  if (!explanation) {
    return null;
  }

  const {
    source,
    ruleLibraryMatch,
    llmExtraction,
    groundingValidation,
    confidence,
    extractedAt,
  } = explanation;

  const confidencePercentage = Math.round(confidence * 100);
  const { color, label, icon: ConfidenceIcon } = getConfidenceDisplay(confidence);

  return (
    <div className={cn('rounded-lg border bg-white shadow-sm', className)}>
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-background-secondary transition-colors rounded-t-lg"
        aria-expanded={isExpanded}
        aria-label="Toggle extraction explanation"
      >
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div className="text-left">
            <p className="font-semibold text-text-primary">How was this extracted?</p>
            <p className="text-xs text-text-tertiary">
              {getSourceDescription(source)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SourceBadge source={source} />
          <ConfidenceBadge confidence={confidence} />
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-text-tertiary flex-shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-tertiary flex-shrink-0" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t">
          <div className="p-4 space-y-6">
            {/* Confidence Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <ConfidenceIcon className={cn('h-4 w-4', color)} />
                Confidence Score
              </h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Overall Confidence</span>
                  <span className={cn('font-semibold', color)}>
                    {confidencePercentage}% - {label}
                  </span>
                </div>

                {/* Visual confidence bar */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getConfidenceBarColor(confidence))}
                    style={{ width: `${confidencePercentage}%` }}
                  />
                </div>

                <p className="text-xs text-text-tertiary">
                  {getConfidenceMessage(confidence)}
                </p>
              </div>
            </div>

            {/* Source Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text-primary">Extraction Method</h4>

              <div className="space-y-3">
                {/* Rule Library Match */}
                {(source === 'RULE_LIBRARY' || source === 'HYBRID') && ruleLibraryMatch && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Rule Library Match</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-blue-700">Pattern ID</p>
                        <p className="font-mono text-blue-900">{ruleLibraryMatch.patternId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700">Version</p>
                        <p className="font-mono text-blue-900">v{ruleLibraryMatch.version}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-blue-700">Match Score</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${ruleLibraryMatch.matchScore * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-blue-900">
                            {Math.round(ruleLibraryMatch.matchScore * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-blue-700">
                      This obligation matched a known pattern from our curated rule library.
                    </p>
                  </div>
                )}

                {/* LLM Extraction */}
                {(source === 'LLM_EXTRACTION' || source === 'HYBRID') && llmExtraction && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">AI Extraction</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-purple-700">Model</p>
                        <p className="font-mono text-purple-900">{llmExtraction.model}</p>
                      </div>
                      <div>
                        <p className="text-xs text-purple-700">Pass</p>
                        <p className="font-mono text-purple-900">
                          {llmExtraction.pass} {llmExtraction.pass > 1 ? '(refined)' : '(initial)'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-purple-700">Tokens Used</p>
                        <p className="font-mono text-purple-900">
                          {llmExtraction.tokensUsed.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-purple-700">
                      {llmExtraction.pass > 1
                        ? `This extraction was refined through ${llmExtraction.pass} AI passes for higher accuracy.`
                        : 'This obligation was extracted using our AI model on the first pass.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Grounding Validation */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text-primary">Grounding Validation</h4>

              <div className="rounded-lg border p-3 space-y-3">
                {/* Text Found Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {groundingValidation.textFound ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm text-text-primary">Text verified in document</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-danger" />
                        <span className="text-sm text-text-primary">Text not found in document</span>
                      </>
                    )}
                  </div>
                  {groundingValidation.textFound && (
                    <Badge variant="success" size="sm">Verified</Badge>
                  )}
                </div>

                {/* Page Number */}
                {groundingValidation.pageNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-text-tertiary" />
                    <span className="text-text-secondary">
                      Found on page {groundingValidation.pageNumber}
                    </span>
                  </div>
                )}

                {/* Hallucination Risk */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Hallucination Risk</span>
                    <HallucinationRiskBadge risk={groundingValidation.hallucinationRisk} />
                  </div>

                  <p className="text-xs text-text-tertiary mt-2">
                    {getHallucinationRiskMessage(groundingValidation.hallucinationRisk)}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="pt-3 border-t text-xs text-text-tertiary">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3" />
                <span>
                  Extracted on {new Date(extractedAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function SourceBadge({ source }: { source: ExtractionExplanation['source'] }) {
  switch (source) {
    case 'RULE_LIBRARY':
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 border border-blue-200">
          <BookOpen className="h-3 w-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">Rule Library</span>
        </div>
      );
    case 'LLM_EXTRACTION':
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-100 border border-purple-200">
          <Brain className="h-3 w-3 text-purple-600" />
          <span className="text-xs font-medium text-purple-700">AI Extracted</span>
        </div>
      );
    case 'HYBRID':
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 border border-purple-200">
          <Zap className="h-3 w-3 text-purple-600" />
          <span className="text-xs font-medium text-purple-700">Hybrid</span>
        </div>
      );
  }
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const { color, bgClass, borderClass } = getConfidenceBadgeColors(confidence);

  return (
    <div className={cn('px-2 py-1 rounded-full border', bgClass, borderClass)}>
      <span className={cn('text-xs font-semibold', color)}>
        {percentage}%
      </span>
    </div>
  );
}

function HallucinationRiskBadge({ risk }: { risk: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  switch (risk) {
    case 'LOW':
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
          <CheckCircle className="h-3 w-3 text-success" />
          <span className="text-xs font-medium text-success">Low Risk</span>
        </div>
      );
    case 'MEDIUM':
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10 border border-warning/20">
          <AlertTriangle className="h-3 w-3 text-warning" />
          <span className="text-xs font-medium text-warning">Medium Risk</span>
        </div>
      );
    case 'HIGH':
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-danger/10 border border-danger/20">
          <XCircle className="h-3 w-3 text-danger" />
          <span className="text-xs font-medium text-danger">High Risk</span>
        </div>
      );
  }
}

function ExtractionExplanationSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-white shadow-sm p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-60" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getSourceDescription(source: ExtractionExplanation['source']): string {
  switch (source) {
    case 'RULE_LIBRARY':
      return 'Matched against curated rule patterns';
    case 'LLM_EXTRACTION':
      return 'Extracted using AI language model';
    case 'HYBRID':
      return 'Combined rule matching and AI extraction';
  }
}

function getConfidenceDisplay(confidence: number): {
  color: string;
  label: string;
  icon: typeof CheckCircle;
} {
  if (confidence >= 0.9) {
    return {
      color: 'text-success',
      label: 'High Confidence',
      icon: CheckCircle,
    };
  }
  if (confidence >= 0.7) {
    return {
      color: 'text-warning',
      label: 'Medium Confidence',
      icon: AlertTriangle,
    };
  }
  return {
    color: 'text-danger',
    label: 'Low Confidence',
    icon: XCircle,
  };
}

function getConfidenceBarColor(confidence: number): string {
  if (confidence >= 0.9) return 'bg-success';
  if (confidence >= 0.7) return 'bg-warning';
  return 'bg-danger';
}

function getConfidenceBadgeColors(confidence: number): {
  color: string;
  bgClass: string;
  borderClass: string;
} {
  if (confidence >= 0.9) {
    return {
      color: 'text-success',
      bgClass: 'bg-success/10',
      borderClass: 'border-success/20',
    };
  }
  if (confidence >= 0.7) {
    return {
      color: 'text-warning',
      bgClass: 'bg-warning/10',
      borderClass: 'border-warning/20',
    };
  }
  return {
    color: 'text-danger',
    bgClass: 'bg-danger/10',
    borderClass: 'border-danger/20',
  };
}

function getConfidenceMessage(confidence: number): string {
  if (confidence >= 0.9) {
    return 'This extraction has high confidence and can be trusted with minimal review.';
  }
  if (confidence >= 0.7) {
    return 'This extraction has medium confidence. Review recommended before acceptance.';
  }
  return 'This extraction has low confidence. Careful review is required before acceptance.';
}

function getHallucinationRiskMessage(risk: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (risk) {
    case 'LOW':
      return 'The extracted text was verified in the source document with high confidence.';
    case 'MEDIUM':
      return 'The extracted text was found but may have been partially interpreted or paraphrased.';
    case 'HIGH':
      return 'The extracted text could not be fully verified in the source document. Manual review is strongly recommended.';
  }
}
