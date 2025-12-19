/**
 * Bulk Review Queue Operations
 * POST /api/v1/review-queue/bulk - Perform bulk confirm/reject actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId, parseRequestBody } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

interface BulkReviewRequest {
  action: 'CONFIRM' | 'REJECT';
  itemIds: string[];
  reason?: string;
  applyToSimilar?: {
    reviewType: string;
    confidenceThreshold: number;
  };
}

interface BulkReviewResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ itemId: string; error: string }>;
  bulkActionId: string;
}

interface ItemError {
  itemId: string;
  error: string;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Parse and validate request body
    let body: BulkReviewRequest;
    try {
      body = await parseRequestBody<BulkReviewRequest>(request);
    } catch (error: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        error.message,
        422,
        null,
        { request_id: requestId }
      );
    }

    const { action, itemIds, reason, applyToSimilar } = body;

    // Validate required fields
    if (!action || !['CONFIRM', 'REJECT'].includes(action)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'action must be either CONFIRM or REJECT',
        422,
        { action: 'action must be either CONFIRM or REJECT' },
        { request_id: requestId }
      );
    }

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'itemIds must be a non-empty array',
        422,
        { itemIds: 'itemIds must be a non-empty array' },
        { request_id: requestId }
      );
    }

    if (action === 'REJECT' && (!reason || reason.trim().length === 0)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'reason is required for REJECT action',
        422,
        { reason: 'reason is required for REJECT action' },
        { request_id: requestId }
      );
    }

    // Validate applyToSimilar if provided
    if (applyToSimilar) {
      if (!applyToSimilar.reviewType || typeof applyToSimilar.reviewType !== 'string') {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'applyToSimilar.reviewType is required and must be a string',
          422,
          { applyToSimilar: 'reviewType is required' },
          { request_id: requestId }
        );
      }

      if (
        typeof applyToSimilar.confidenceThreshold !== 'number' ||
        applyToSimilar.confidenceThreshold < 0 ||
        applyToSimilar.confidenceThreshold > 1
      ) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'applyToSimilar.confidenceThreshold must be a number between 0 and 1',
          422,
          { applyToSimilar: 'confidenceThreshold must be between 0 and 1' },
          { request_id: requestId }
        );
      }
    }

    // Generate a unique bulk action ID for audit trail
    const bulkActionId = crypto.randomUUID();

    // Fetch all items to process
    let allItemIds = [...itemIds];

    // If applyToSimilar is provided, find additional items
    if (applyToSimilar) {
      try {
        // Get the first item to determine the company_id
        const { data: firstItem } = await supabaseAdmin
          .from('review_queue_items')
          .select('company_id, site_id')
          .eq('id', itemIds[0])
          .single();

        if (firstItem) {
          // Find similar items with matching review type and confidence threshold
          const { data: similarItems, error: similarError } = await supabaseAdmin
            .from('review_queue_items')
            .select(`
              id,
              obligations:obligation_id (
                confidence_score
              )
            `)
            .eq('company_id', firstItem.company_id)
            .eq('review_type', applyToSimilar.reviewType)
            .eq('review_status', 'PENDING');

          if (!similarError && similarItems) {
            // Filter by confidence threshold and exclude already selected items
            const additionalItemIds = similarItems
              .filter((item: any) => {
                const confidence = item.obligations?.confidence_score ?? 1;
                return (
                  confidence >= applyToSimilar.confidenceThreshold &&
                  !allItemIds.includes(item.id)
                );
              })
              .map((item: any) => item.id);

            allItemIds = [...allItemIds, ...additionalItemIds];
          }
        }
      } catch (error) {
        console.error('Error finding similar items:', error);
        // Continue with original items if finding similar items fails
      }
    }

    // Process items and track results
    const errors: ItemError[] = [];
    let processedCount = 0;

    // Process each item individually
    for (const itemId of allItemIds) {
      try {
        // Get the review queue item
        const { data: item, error: itemError } = await supabaseAdmin
          .from('review_queue_items')
          .select('id, obligation_id, review_status, company_id')
          .eq('id', itemId)
          .single();

        if (itemError || !item) {
          errors.push({
            itemId,
            error: 'Item not found',
          });
          continue;
        }

        // Verify user has access to this company
        if (item.company_id !== user.company_id && !user.is_consultant) {
          errors.push({
            itemId,
            error: 'Access denied to this item',
          });
          continue;
        }

        // Check if already reviewed
        if (item.review_status !== 'PENDING') {
          errors.push({
            itemId,
            error: `Item has already been reviewed (status: ${item.review_status})`,
          });
          continue;
        }

        // Prepare update data based on action
        const updateData: any = {
          review_action: action,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (action === 'CONFIRM') {
          updateData.review_status = 'CONFIRMED';
        } else {
          // REJECT
          updateData.review_status = 'REJECTED';
          updateData.review_notes = reason;
        }

        // Update the review queue item
        const { error: updateError } = await supabaseAdmin
          .from('review_queue_items')
          .update(updateData)
          .eq('id', itemId);

        if (updateError) {
          errors.push({
            itemId,
            error: `Failed to update: ${updateError.message}`,
          });
          continue;
        }

        // Update associated obligation if present
        if (item.obligation_id) {
          const obligationUpdate: any = {};

          if (action === 'CONFIRM') {
            obligationUpdate.review_status = 'CONFIRMED';
            obligationUpdate.status = 'PENDING'; // Activate the obligation
          } else {
            // REJECT
            obligationUpdate.review_status = 'REJECTED';
            obligationUpdate.status = 'REJECTED';
          }

          await supabaseAdmin
            .from('obligations')
            .update(obligationUpdate)
            .eq('id', item.obligation_id);
        }

        processedCount++;
      } catch (error: any) {
        errors.push({
          itemId,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    // Log the bulk operation in audit_logs
    try {
      await supabaseAdmin.from('audit_logs').insert({
        company_id: user.company_id,
        user_id: user.id,
        action_type: `BULK_REVIEW_${action}`,
        entity_type: 'review_queue_items',
        entity_id: bulkActionId, // Use bulk action ID as entity_id for tracking
        new_values: {
          bulk_action_id: bulkActionId,
          action,
          total_items: allItemIds.length,
          processed: processedCount,
          failed: errors.length,
          item_ids: allItemIds,
          apply_to_similar: applyToSimilar || null,
          reason: reason || null,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
      });
    } catch (auditError) {
      console.error('Failed to log bulk action to audit:', auditError);
      // Don't fail the request if audit logging fails
    }

    const failedCount = errors.length;
    const responseData: BulkReviewResponse = {
      success: processedCount > 0,
      processed: processedCount,
      failed: failedCount,
      errors,
      bulkActionId,
    };

    // If ALL items failed, return 500
    if (processedCount === 0 && failedCount > 0) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'All items failed to process',
        500,
        responseData,
        { request_id: requestId }
      );
    }

    // Return success response (with partial failures if any)
    const statusCode = failedCount > 0 ? 207 : 200; // 207 Multi-Status for partial success
    const response = successResponse(responseData, statusCode, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Bulk review operation error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
