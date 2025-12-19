'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Edit, X, FileText, Clock, AlertTriangle, Square, CheckSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  EscalationBadge,
  EscalationIndicator,
  ConfidenceBadgeInline,
  getEscalationLevel,
  type EscalationLevel,
} from '@/components/ingestion';

// Bulk action response interface
interface BulkActionResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ itemId: string; error: string }>;
  bulkActionId: string;
}

interface ReviewQueueItem {
  id: string;
  document_id: string;
  obligation_id: string | null;
  review_type: string;
  is_blocking: boolean;
  priority: number;
  hallucination_risk: boolean;
  original_data: any;
  review_status: string;
  review_action: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  edited_data: any;
  created_at: string;
  updated_at: string;
  // Escalation fields
  escalation_level: number;
  escalated_at: string | null;
  last_escalation_notification_at: string | null;
  documents?: {
    id: string;
    file_name: string;
    document_type: string;
    site_id: string;
  };
  obligations?: {
    id: string;
    obligation_title: string;
    obligation_description: string;
    confidence_score: number;
    is_subjective: boolean;
  };
}

const REVIEW_TYPES = {
  LOW_CONFIDENCE: { label: 'Low Confidence', color: 'bg-warning/10 text-warning', icon: '⚠️' },
  SUBJECTIVE: { label: 'Subjective', color: 'bg-warning/10 text-warning', icon: '💭' },
  NO_MATCH: { label: 'No Match', color: 'bg-danger/10 text-danger', icon: '❌' },
  DATE_FAILURE: { label: 'Date Failure', color: 'bg-warning/10 text-warning', icon: '📅' },
  DUPLICATE: { label: 'Duplicate', color: 'bg-background-tertiary text-text-secondary', icon: '📋' },
  OCR_QUALITY: { label: 'OCR Quality', color: 'bg-background-tertiary text-text-secondary', icon: '📄' },
  CONFLICT: { label: 'Conflict', color: 'bg-danger/10 text-danger', icon: '⚔️' },
  HALLUCINATION: { label: 'Hallucination', color: 'bg-danger/10 text-danger', icon: '🔴' },
};

export default function ReviewQueuePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedType, setSelectedType] = useState<string>('');

  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  // Toggle individual item selection
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Select/deselect all pending items
  const toggleSelectAll = useCallback((items: ReviewQueueItem[]) => {
    const pendingIds = items.filter(i => i.review_status === 'PENDING').map(i => i.id);
    setSelectedItems(prev => {
      const allSelected = pendingIds.every(id => prev.has(id));
      if (allSelected) {
        return new Set();
      } else {
        return new Set(pendingIds);
      }
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Fetch review queue items
  const { data: queueData, isLoading: queueLoading } = useQuery<{
    data: ReviewQueueItem[];
    pagination: any;
  }>({
    queryKey: ['review-queue', selectedStatus, selectedType],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('filter[review_status]', selectedStatus);
      if (selectedType) params.append('filter[review_type]', selectedType);
      
      const response = await apiClient.get(`/review-queue?${params.toString()}`);
      return response.data;
    },
  });

  const items: any[] = queueData?.data || [];

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiClient.put(`/review-queue/${itemId}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ itemId, reason }: { itemId: string; reason: string }) => {
      const response = await apiClient.put(`/review-queue/${itemId}/reject`, {
        rejection_reason: reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });

  // Bulk confirm mutation
  const bulkConfirmMutation = useMutation<BulkActionResponse, Error, string[]>({
    mutationFn: async (itemIds: string[]): Promise<BulkActionResponse> => {
      const response = await apiClient.post('/review-queue/bulk', {
        action: 'CONFIRM',
        itemIds,
      });
      return response.data as BulkActionResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      clearSelection();
      if (data.failed > 0) {
        alert(`Confirmed ${data.processed} items. ${data.failed} items failed.`);
      }
    },
  });

  // Bulk reject mutation
  const bulkRejectMutation = useMutation<BulkActionResponse, Error, { itemIds: string[]; reason: string }>({
    mutationFn: async ({ itemIds, reason }): Promise<BulkActionResponse> => {
      const response = await apiClient.post('/review-queue/bulk', {
        action: 'REJECT',
        itemIds,
        reason,
      });
      return response.data as BulkActionResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      clearSelection();
      setShowBulkRejectModal(false);
      setBulkRejectReason('');
      if (data.failed > 0) {
        alert(`Rejected ${data.processed} items. ${data.failed} items failed.`);
      }
    },
  });

  // Bulk action handlers
  const handleBulkConfirm = () => {
    if (selectedItems.size === 0) return;
    if (confirm(`Are you sure you want to confirm ${selectedItems.size} selected items?`)) {
      bulkConfirmMutation.mutate(Array.from(selectedItems));
    }
  };

  const handleBulkReject = () => {
    if (selectedItems.size === 0) return;
    setShowBulkRejectModal(true);
  };

  const submitBulkReject = () => {
    if (!bulkRejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    bulkRejectMutation.mutate({
      itemIds: Array.from(selectedItems),
      reason: bulkRejectReason,
    });
  };

  const handleConfirm = (itemId: string) => {
    if (confirm('Are you sure you want to confirm this extraction?')) {
      confirmMutation.mutate(itemId);
    }
  };

  const handleReject = (itemId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason && reason.trim().length > 0) {
      rejectMutation.mutate({ itemId, reason });
    }
  };

  const getReviewTypeBadge = (reviewType: string) => {
    const type = REVIEW_TYPES[reviewType as keyof typeof REVIEW_TYPES];
    if (!type) return null;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${type.color}`}>
        {type.icon} {type.label}
      </span>
    );
  };

  const getConfidenceColor = (score: number | null | undefined) => {
    if (!score) return 'text-text-tertiary';
    if (score >= 0.85) return 'text-success';
    if (score >= 0.70) return 'text-warning';
    return 'text-danger';
  };

  const getConfidenceLabel = (score: number | null | undefined) => {
    if (!score) return 'N/A';
    return `${Math.round(score * 100)}%`;
  };

  const pendingItems = items.filter(item => item.review_status === 'PENDING');
  const blockingItems = pendingItems.filter(item => item.is_blocking);
  const escalatedItems = pendingItems.filter(item => (item.escalation_level || 0) > 0);
  const criticalItems = pendingItems.filter(item => (item.escalation_level || 0) >= 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Review Queue</h1>
          <p className="text-text-secondary mt-2">
            Review and validate AI-extracted obligations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {criticalItems.length > 0 && (
            <div className="px-4 py-2 bg-danger/10 border border-danger rounded-lg animate-pulse">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-danger" />
                <span className="text-sm font-medium text-danger">
                  {criticalItems.length} critical (7+ days)
                </span>
              </div>
            </div>
          )}
          {escalatedItems.length > 0 && escalatedItems.length !== criticalItems.length && (
            <div className="px-4 py-2 bg-warning/10 border border-warning rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium text-warning">
                  {escalatedItems.length} escalated
                </span>
              </div>
            </div>
          )}
          {blockingItems.length > 0 && (
            <div className="px-4 py-2 bg-danger/10 border border-danger rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-danger" />
                <span className="text-sm font-medium text-danger">
                  {blockingItems.length} blocking item{blockingItems.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
          <div className="px-4 py-2 bg-background-tertiary rounded-lg">
            <span className="text-sm font-medium text-text-primary">
              {pendingItems.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedItems.size > 0 && (
        <div className="bg-primary/5 border border-primary rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="font-medium text-text-primary">
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              Clear Selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleBulkReject}
              disabled={bulkRejectMutation.isPending}
            >
              {bulkRejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <X className="h-4 w-4 mr-2" />
              Reject Selected
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleBulkConfirm}
              disabled={bulkConfirmMutation.isPending}
            >
              {bulkConfirmMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Selected
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Reject Modal */}
      {showBulkRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Reject {selectedItems.size} Items
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Please provide a reason for rejecting these extractions. This will be recorded for audit purposes.
            </p>
            <textarea
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full min-h-[100px] rounded-lg border border-input-border px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setShowBulkRejectModal(false);
                  setBulkRejectReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={submitBulkReject}
                disabled={bulkRejectMutation.isPending || !bulkRejectReason.trim()}
              >
                {bulkRejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reject Items
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-base p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Review Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-input-border px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="EDITED">Edited</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Review Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border border-input-border px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Types</option>
              {Object.keys(REVIEW_TYPES).map((type) => (
                <option key={type} value={type}>
                  {REVIEW_TYPES[type as keyof typeof REVIEW_TYPES].label}
                </option>
              ))}
            </select>
          </div>
          {(selectedStatus || selectedType) && (
            <div className="flex items-end">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setSelectedStatus('PENDING');
                  setSelectedType('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Review Queue List */}
      {queueLoading ? (
        <div className="text-center py-12 text-text-secondary">Loading review queue...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-base p-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
          <p className="text-text-secondary mb-4">No items in review queue</p>
          <p className="text-sm text-text-tertiary">
            All extractions have been reviewed or there are no pending items.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-base overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-input-border bg-background-tertiary">
                <th className="py-3 px-4 w-12">
                  <button
                    onClick={() => toggleSelectAll(items)}
                    className="flex items-center justify-center w-5 h-5 rounded border border-input-border hover:border-primary transition-colors"
                    title={items.filter(i => i.review_status === 'PENDING').every(i => selectedItems.has(i.id)) ? 'Deselect All' : 'Select All'}
                  >
                    {items.filter(i => i.review_status === 'PENDING').length > 0 &&
                     items.filter(i => i.review_status === 'PENDING').every(i => selectedItems.has(i.id)) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : items.filter(i => i.review_status === 'PENDING').some(i => selectedItems.has(i.id)) ? (
                      <div className="w-2 h-2 bg-primary rounded-sm" />
                    ) : (
                      <Square className="h-4 w-4 text-text-tertiary" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Document</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Obligation</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Review Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Confidence</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Escalation</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-input-border/50 hover:bg-background-tertiary transition-colors ${
                    item.is_blocking ? 'bg-danger/5' : ''
                  } ${selectedItems.has(item.id) ? 'bg-primary/5' : ''}`}
                >
                  <td className="py-3 px-4">
                    {item.review_status === 'PENDING' ? (
                      <button
                        onClick={() => toggleItemSelection(item.id)}
                        className="flex items-center justify-center w-5 h-5 rounded border border-input-border hover:border-primary transition-colors"
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-text-tertiary" />
                        )}
                      </button>
                    ) : (
                      <div className="w-5 h-5" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-text-tertiary" />
                      <span className="text-sm text-text-primary">
                        {item.documents?.file_name || 'Unknown Document'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="max-w-md">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {item.obligations?.obligation_title || 'No obligation'}
                      </p>
                      {item.obligations?.obligation_description && (
                        <p className="text-xs text-text-secondary truncate mt-1">
                          {item.obligations.obligation_description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getReviewTypeBadge(item.review_type)}
                      {item.hallucination_risk && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-danger/10 text-danger">
                          🔴 Hallucination Risk
                        </span>
                      )}
                      {item.is_blocking && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-danger/10 text-danger">
                          ⛔ Blocking
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <ConfidenceBadgeInline score={item.obligations?.confidence_score || 0} />
                  </td>
                  <td className="py-3 px-4">
                    <EscalationIndicator
                      level={(item.escalation_level || 0) as EscalationLevel}
                      hoursPending={Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60))}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-background-tertiary text-text-secondary">
                      {item.review_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {item.review_status === 'PENDING' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/review-queue/${item.id}`)}
                            title="Review"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfirm(item.id)}
                            disabled={confirmMutation.isPending}
                            title="Confirm"
                          >
                            <CheckCircle className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(item.id)}
                            disabled={rejectMutation.isPending}
                            title="Reject"
                          >
                            <X className="h-4 w-4 text-danger" />
                          </Button>
                        </>
                      )}
                      {item.review_status !== 'PENDING' && (
                        <span className="text-xs text-text-tertiary">
                          Reviewed {item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : ''}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

