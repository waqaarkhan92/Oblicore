/**
 * Approval Workflow Service
 * Implements multi-level approval for high-risk review queue items
 *
 * Approval Levels:
 * - Level 1: STAFF can approve normal items
 * - Level 2: ADMIN required for high-risk items
 *
 * Triggers for Level 2:
 * - hallucination_risk === true
 * - confidence_score < 0.50
 * - review_type === 'CONFLICT'
 */

import { supabaseAdmin } from '@/lib/supabase/server';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ApprovalRequirement {
  itemId: string;
  requiredLevel: 1 | 2;
  reason: string;
  triggers: string[];
}

export interface ApprovalStatus {
  itemId: string;
  currentLevel: 0 | 1 | 2; // 0 = not started
  level1ApprovedBy?: string;
  level1ApprovedAt?: string;
  level2ApprovedBy?: string;
  level2ApprovedAt?: string;
  status: 'PENDING' | 'LEVEL1_APPROVED' | 'FULLY_APPROVED' | 'REJECTED';
}

export interface ApprovalAction {
  itemId: string;
  action: 'APPROVE' | 'REJECT';
  level: 1 | 2;
  userId: string;
  comment?: string;
}

export interface ReviewQueueItem {
  id: string;
  document_id: string;
  obligation_id: string | null;
  company_id: string;
  site_id: string;
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
  approval_metadata?: {
    required_level: 1 | 2;
    current_level: 0 | 1 | 2;
    level1_approved_by?: string;
    level1_approved_at?: string;
    level2_approved_by?: string;
    level2_approved_at?: string;
    approval_status: 'PENDING' | 'LEVEL1_APPROVED' | 'FULLY_APPROVED' | 'REJECTED';
    rejection_reason?: string;
    triggers?: string[];
  };
  obligations?: {
    confidence_score?: number;
  };
}

// ============================================================================
// APPROVAL REQUIREMENT DETERMINATION
// ============================================================================

/**
 * Determine what approval level is needed for a review queue item
 */
export function determineApprovalRequirement(item: ReviewQueueItem): ApprovalRequirement {
  const triggers: string[] = [];
  let requiredLevel: 1 | 2 = 1; // Default to Level 1

  // Check Level 2 triggers
  if (item.hallucination_risk === true) {
    triggers.push('hallucination_risk');
    requiredLevel = 2;
  }

  if (item.obligations?.confidence_score !== undefined && item.obligations.confidence_score < 0.50) {
    triggers.push('low_confidence_score');
    requiredLevel = 2;
  }

  if (item.review_type === 'CONFLICT') {
    triggers.push('conflict_review_type');
    requiredLevel = 2;
  }

  // Build reason string
  let reason = '';
  if (requiredLevel === 2) {
    const triggerDescriptions: Record<string, string> = {
      hallucination_risk: 'Hallucination risk detected',
      low_confidence_score: 'Confidence score below 50%',
      conflict_review_type: 'Review type is CONFLICT',
    };

    const descriptions = triggers.map(t => triggerDescriptions[t]).filter(Boolean);
    reason = `Admin approval required: ${descriptions.join(', ')}`;
  } else {
    reason = 'Standard approval (STAFF level)';
  }

  return {
    itemId: item.id,
    requiredLevel,
    reason,
    triggers,
  };
}

// ============================================================================
// USER PERMISSION CHECKING
// ============================================================================

/**
 * Check if a user has permission to approve at the required level
 * Level 1: STAFF, ADMIN, OWNER
 * Level 2: ADMIN, OWNER only
 */
export async function canUserApprove(
  userId: string,
  requiredLevel: number
): Promise<boolean> {
  try {
    // Fetch user's roles
    const { data: userRoles, error } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return false;
    }

    if (!userRoles || userRoles.length === 0) {
      return false;
    }

    const roles = userRoles.map(r => r.role);

    // Level 1: Any authenticated user with STAFF, ADMIN, or OWNER role
    if (requiredLevel === 1) {
      return roles.some(role => ['STAFF', 'ADMIN', 'OWNER'].includes(role));
    }

    // Level 2: Only ADMIN or OWNER
    if (requiredLevel === 2) {
      return roles.some(role => ['ADMIN', 'OWNER'].includes(role));
    }

    return false;
  } catch (error) {
    console.error('Error checking user approval permission:', error);
    return false;
  }
}

// ============================================================================
// APPROVAL STATUS MANAGEMENT
// ============================================================================

/**
 * Get current approval status for a review queue item
 */
export async function getApprovalStatus(
  itemId: string
): Promise<ApprovalStatus | null> {
  try {
    const { data: item, error } = await supabaseAdmin
      .from('review_queue_items')
      .select('id, approval_metadata')
      .eq('id', itemId)
      .single();

    if (error || !item) {
      console.error('Error fetching approval status:', error);
      return null;
    }

    const metadata = item.approval_metadata || {};

    return {
      itemId: item.id,
      currentLevel: metadata.current_level || 0,
      level1ApprovedBy: metadata.level1_approved_by,
      level1ApprovedAt: metadata.level1_approved_at,
      level2ApprovedBy: metadata.level2_approved_by,
      level2ApprovedAt: metadata.level2_approved_at,
      status: metadata.approval_status || 'PENDING',
    };
  } catch (error) {
    console.error('Error getting approval status:', error);
    return null;
  }
}

/**
 * Submit an approval or rejection
 */
export async function submitApproval(
  action: ApprovalAction
): Promise<ApprovalStatus> {
  const { itemId, action: approvalAction, level, userId, comment } = action;

  try {
    // Fetch current item
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('review_queue_items')
      .select('*, obligations(confidence_score)')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      throw new Error(`Failed to fetch review queue item: ${fetchError?.message}`);
    }

    // Check user permissions
    const hasPermission = await canUserApprove(userId, level);
    if (!hasPermission) {
      throw new Error(`User does not have permission to approve at Level ${level}`);
    }

    // Determine approval requirements
    const requirement = determineApprovalRequirement(item as ReviewQueueItem);

    // Initialize or get existing approval metadata
    const currentMetadata = item.approval_metadata || {
      required_level: requirement.requiredLevel,
      current_level: 0,
      approval_status: 'PENDING',
      triggers: requirement.triggers,
    };

    const now = new Date().toISOString();

    // Handle REJECT action
    if (approvalAction === 'REJECT') {
      const updatedMetadata = {
        ...currentMetadata,
        approval_status: 'REJECTED',
        rejection_reason: comment || 'Rejected by approver',
      };

      await supabaseAdmin
        .from('review_queue_items')
        .update({
          approval_metadata: updatedMetadata,
          review_status: 'REJECTED',
          review_action: 'rejected',
          reviewed_by: userId,
          reviewed_at: now,
          review_notes: comment,
          updated_at: now,
        })
        .eq('id', itemId);

      return {
        itemId,
        currentLevel: currentMetadata.current_level,
        level1ApprovedBy: currentMetadata.level1_approved_by,
        level1ApprovedAt: currentMetadata.level1_approved_at,
        level2ApprovedBy: currentMetadata.level2_approved_by,
        level2ApprovedAt: currentMetadata.level2_approved_at,
        status: 'REJECTED',
      };
    }

    // Handle APPROVE action
    let updatedMetadata = { ...currentMetadata };
    let newStatus: 'PENDING' | 'LEVEL1_APPROVED' | 'FULLY_APPROVED' = 'PENDING';

    if (level === 1) {
      updatedMetadata.current_level = 1;
      updatedMetadata.level1_approved_by = userId;
      updatedMetadata.level1_approved_at = now;

      // If Level 1 is sufficient, mark as fully approved
      if (requirement.requiredLevel === 1) {
        newStatus = 'FULLY_APPROVED';
        updatedMetadata.approval_status = 'FULLY_APPROVED';
      } else {
        // Needs Level 2
        newStatus = 'LEVEL1_APPROVED';
        updatedMetadata.approval_status = 'LEVEL1_APPROVED';
      }
    } else if (level === 2) {
      // Level 2 approval
      updatedMetadata.current_level = 2;
      updatedMetadata.level2_approved_by = userId;
      updatedMetadata.level2_approved_at = now;
      updatedMetadata.approval_status = 'FULLY_APPROVED';
      newStatus = 'FULLY_APPROVED';

      // Also record Level 1 if not already done
      if (!updatedMetadata.level1_approved_by) {
        updatedMetadata.level1_approved_by = userId;
        updatedMetadata.level1_approved_at = now;
      }
    }

    // Update the review queue item
    const updateData: any = {
      approval_metadata: updatedMetadata,
      updated_at: now,
    };

    // If fully approved, update review_status
    if (newStatus === 'FULLY_APPROVED') {
      updateData.review_status = 'CONFIRMED';
      updateData.review_action = 'confirmed';
      updateData.reviewed_by = userId;
      updateData.reviewed_at = now;
      if (comment) {
        updateData.review_notes = comment;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('review_queue_items')
      .update(updateData)
      .eq('id', itemId);

    if (updateError) {
      throw new Error(`Failed to update approval status: ${updateError.message}`);
    }

    return {
      itemId,
      currentLevel: updatedMetadata.current_level,
      level1ApprovedBy: updatedMetadata.level1_approved_by,
      level1ApprovedAt: updatedMetadata.level1_approved_at,
      level2ApprovedBy: updatedMetadata.level2_approved_by,
      level2ApprovedAt: updatedMetadata.level2_approved_at,
      status: newStatus,
    };
  } catch (error: any) {
    console.error('Error submitting approval:', error);
    throw error;
  }
}

// ============================================================================
// PENDING APPROVALS QUERIES
// ============================================================================

/**
 * Get all items pending Level 2 (admin) approval
 */
export async function getPendingLevel2Approvals(
  companyId?: string
): Promise<ReviewQueueItem[]> {
  try {
    let query = supabaseAdmin
      .from('review_queue_items')
      .select('*, obligations(confidence_score), documents(file_name, document_type)')
      .eq('review_status', 'PENDING')
      .not('approval_metadata', 'is', null);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching pending Level 2 approvals:', error);
      return [];
    }

    if (!items) {
      return [];
    }

    // Filter for items that require Level 2 approval but haven't received it yet
    const pendingLevel2 = items.filter((item: any) => {
      const metadata = item.approval_metadata || {};
      const requirement = determineApprovalRequirement(item as ReviewQueueItem);

      return (
        requirement.requiredLevel === 2 &&
        metadata.approval_status !== 'FULLY_APPROVED' &&
        metadata.approval_status !== 'REJECTED'
      );
    });

    return pendingLevel2 as ReviewQueueItem[];
  } catch (error) {
    console.error('Error getting pending Level 2 approvals:', error);
    return [];
  }
}

/**
 * Manually escalate an item to Level 2 approval requirement
 */
export async function escalateToLevel2(
  itemId: string,
  reason: string
): Promise<void> {
  try {
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('review_queue_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      throw new Error(`Failed to fetch review queue item: ${fetchError?.message}`);
    }

    const currentMetadata = item.approval_metadata || {
      required_level: 1,
      current_level: 0,
      approval_status: 'PENDING',
      triggers: [],
    };

    const updatedMetadata = {
      ...currentMetadata,
      required_level: 2,
      triggers: [...(currentMetadata.triggers || []), 'manual_escalation'],
      escalation_reason: reason,
    };

    const { error: updateError } = await supabaseAdmin
      .from('review_queue_items')
      .update({
        approval_metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (updateError) {
      throw new Error(`Failed to escalate item: ${updateError.message}`);
    }

    console.log(`Review queue item ${itemId} escalated to Level 2: ${reason}`);
  } catch (error: any) {
    console.error('Error escalating to Level 2:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize approval metadata for an item if not already set
 */
export async function initializeApprovalMetadata(
  item: ReviewQueueItem
): Promise<void> {
  try {
    // Skip if already has approval metadata
    if (item.approval_metadata) {
      return;
    }

    const requirement = determineApprovalRequirement(item);

    const approvalMetadata = {
      required_level: requirement.requiredLevel,
      current_level: 0,
      approval_status: 'PENDING',
      triggers: requirement.triggers,
    };

    await supabaseAdmin
      .from('review_queue_items')
      .update({
        approval_metadata: approvalMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    console.log(`Initialized approval metadata for item ${item.id}: Level ${requirement.requiredLevel} required`);
  } catch (error) {
    console.error('Error initializing approval metadata:', error);
  }
}

/**
 * Get approval level badge configuration
 */
export function getApprovalLevelBadge(level: 1 | 2): {
  label: string;
  color: string;
  description: string;
} {
  if (level === 2) {
    return {
      label: 'Admin Approval Required',
      color: 'danger',
      description: 'This item requires admin-level approval due to high risk factors',
    };
  }

  return {
    label: 'Standard Approval',
    color: 'primary',
    description: 'This item can be approved by staff members',
  };
}
