/**
 * Document Obligations Endpoint
 * GET /api/v1/documents/{documentId}/obligations - Get obligations extracted from document
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { parsePaginationParams, parseFilterParams, parseSortParams, createCursor } from '@/lib/api/pagination';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    console.log(`[Obligations API] Request started, requestId: ${requestId}`);
    
    // Require authentication
    console.log(`[Obligations API] Checking authentication...`);
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      console.log(`[Obligations API] Auth failed, returning:`, authResult.status);
      return authResult;
    }
    const { user } = authResult;
    console.log(`[Obligations API] Auth successful, user: ${user.id}`);

    console.log(`[Obligations API] Parsing params...`);
    const { documentId } = await params;
    console.log(`[Obligations API] Document ID: ${documentId}`);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid document ID format',
        400,
        { document_id: 'Must be a valid UUID' },
        { request_id: requestId }
      );
    }

    // Verify document exists - RLS will enforce access control
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !document) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Document not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Parse pagination and filter params
    let limit: number;
    let cursor: string | null;
    let filters: Record<string, any>;
    let sort: Array<{ field: string; direction: 'asc' | 'desc' }>;
    
    try {
      const paginationParams = parsePaginationParams(request);
      limit = paginationParams.limit;
      cursor = paginationParams.cursor;
      filters = parseFilterParams(request);
      sort = parseSortParams(request);
    } catch (error: any) {
      console.error(`[Obligations API] Error parsing params:`, error);
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        error.message || 'Invalid request parameters',
        422,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Build query - supabaseAdmin bypasses RLS
    // Add logging to debug
    console.log(`[Obligations API] Fetching obligations for document: ${documentId}, user: ${user.id}`);
    
    // First, check if obligations exist at all - try without deleted_at filter first
    console.log(`[Obligations API] Querying obligations for document_id: ${documentId}`);
    const { data: countDataAll, error: countErrorAll } = await supabaseAdmin
      .from('obligations')
      .select('id, document_id, deleted_at')
      .eq('document_id', documentId);
    
    console.log(`[Obligations API] Count query WITHOUT deleted_at filter:`);
    console.log(`  - Count: ${countDataAll?.length || 0}`);
    console.log(`  - Error: ${countErrorAll ? JSON.stringify({ message: countErrorAll.message, code: countErrorAll.code }) : 'none'}`);
    if (countDataAll && countDataAll.length > 0) {
      console.log(`  - Sample: ${JSON.stringify(countDataAll.slice(0, 3))}`);
    } else {
      // Try to find ANY obligations to see if there's a document_id mismatch
      const { data: anyObligations } = await supabaseAdmin
        .from('obligations')
        .select('id, document_id')
        .limit(5);
      console.log(`  - Checking if ANY obligations exist: ${anyObligations?.length || 0}`);
      if (anyObligations && anyObligations.length > 0) {
        console.log(`  - Sample document_ids in obligations table: ${anyObligations.map(o => o.document_id).join(', ')}`);
      }
    }
    
    // Now try with deleted_at filter - retry if document is COMPLETED but no obligations found
    let countData: any[] | null = null;
    let countError: any = null;
    let totalCount = 0;
    
    // Check document status first to decide if we need retries
    const { data: docStatus } = await supabaseAdmin
      .from('documents')
      .select('extraction_status')
      .eq('id', documentId)
      .single();
    
    const maxRetries = (docStatus?.extraction_status === 'COMPLETED' || docStatus?.extraction_status === 'EXTRACTED') ? 3 : 1;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await supabaseAdmin
        .from('obligations')
        .select('id')
        .eq('document_id', documentId)
        .is('deleted_at', null);
      
      countData = result.data;
      countError = result.error;
      totalCount = countData?.length || 0;
      
      if (countError) {
        console.log(`[Obligations API] Attempt ${attempt}/${maxRetries} failed: ${countError.message}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
          continue;
        }
      } else if (totalCount > 0 || attempt === maxRetries) {
        break;
      } else if (docStatus?.extraction_status === 'COMPLETED' && totalCount === 0 && attempt < maxRetries) {
        console.log(`[Obligations API] Attempt ${attempt}/${maxRetries}: Document COMPLETED but 0 obligations found, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      } else {
        break;
      }
    }
    
    console.log(`[Obligations API] Count query WITH deleted_at filter:`);
    console.log(`  - Count: ${totalCount}`);
    console.log(`  - Data length: ${countData?.length || 0}`);
    console.log(`  - Error: ${countError ? JSON.stringify({ message: countError.message, code: countError.code, details: countError.details }) : 'none'}`);
    if (countData && countData.length > 0) {
      console.log(`  - Sample IDs: ${countData.slice(0, 3).map(o => o.id).join(', ')}`);
    }
    
    let query = supabaseAdmin
      .from('obligations')
      .select('id, obligation_title, obligation_description, category, status, review_status, confidence_score, is_subjective, deadline_date, frequency, created_at, updated_at, original_text')
      .eq('document_id', documentId)
      .is('deleted_at', null);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.review_status) {
      query = query.eq('review_status', filters.review_status);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.is_subjective !== undefined) {
      query = query.eq('is_subjective', filters.is_subjective === 'true');
    }

    // Apply sorting
    if (sort.length > 0) {
      for (const sortItem of sort) {
        query = query.order(sortItem.field, { ascending: sortItem.direction === 'asc' });
      }
    } else {
      // Default sort by created_at descending
      query = query.order('created_at', { ascending: false });
    }

    // Handle cursor-based pagination
    if (cursor) {
      const parsedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      query = query.lt('created_at', parsedCursor.created_at);
    }

    // Add limit and fetch one extra to check if there are more
    query = query.limit(limit + 1);

    console.log(`[Obligations API] Executing query with limit: ${limit + 1}`);
    const { data: obligations, error } = await query;
    
    // Debug logging
    console.log(`[Obligations API] Query result for document ${documentId}:`, {
      count: obligations?.length || 0,
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
      sample: obligations?.[0] || null,
      limit: limit,
      hasMore: obligations && obligations.length > limit,
    });
    
    // If no obligations found, do a direct check
    if (!obligations || obligations.length === 0) {
      console.log(`[Obligations API] ⚠️ No obligations returned, doing direct check...`);
      const { data: directCheck, error: directError } = await supabaseAdmin
        .from('obligations')
        .select('id, obligation_title, document_id, deleted_at')
        .eq('document_id', documentId);
      
      console.log(`[Obligations API] Direct check result:`, {
        count: directCheck?.length || 0,
        error: directError ? { message: directError.message, code: directError.code } : null,
        withDeleted: directCheck?.filter(o => o.deleted_at).length || 0,
        withoutDeleted: directCheck?.filter(o => !o.deleted_at).length || 0,
      });
    }

    if (error) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch obligations',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    // Check if there are more results
    const hasMore = obligations && obligations.length > limit;
    const results = hasMore ? obligations.slice(0, limit) : obligations || [];

    console.log(`[Obligations API] Preparing response:`, {
      totalFound: obligations?.length || 0,
      resultsCount: results.length,
      hasMore,
      limit,
    });

    // Create cursor for next page (if there are more results)
    let nextCursor: string | undefined;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = createCursor(lastItem.id, lastItem.created_at);
    }

    const response = paginatedResponse(
      results,
      nextCursor,
      limit,
      hasMore,
      { request_id: requestId }
    );
    
    console.log(`[Obligations API] Response prepared:`, {
      dataCount: results.length,
      hasMore,
      limit,
      nextCursor: nextCursor ? 'present' : 'null',
    });
    
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('[Obligations API] ❌ Unhandled error:', error);
    console.error('[Obligations API] Error stack:', error?.stack);
    console.error('[Obligations API] Error message:', error?.message);
    console.error('[Obligations API] Error name:', error?.name);
    console.error('[Obligations API] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { 
        error: error.message || 'Unknown error',
        type: error?.name || typeof error,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { request_id: requestId }
    );
  }
}

