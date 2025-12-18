/**
 * Module 1: Permit Version Text Comparison Endpoint
 * GET /api/v1/module-1/permit-versions/compare - Compare extracted text between two permit versions
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { computeTextDiff, computeObjectDiff, formatUnifiedDiff } from '@/lib/services/diff-service';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const moduleCheck = await requireModule(user.company_id, 'MODULE_1');
    if (moduleCheck) return moduleCheck;

    const { searchParams } = new URL(request.url);
    const versionAId = searchParams.get('v1');
    const versionBId = searchParams.get('v2');

    if (!versionAId || !versionBId) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Both v1 and v2 query parameters are required',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Get version A with document text
    const { data: versionA, error: errorA } = await supabaseAdmin
      .from('permit_versions')
      .select(`
        *,
        document:documents(id, extracted_text, document_name, document_type)
      `)
      .eq('id', versionAId)
      .single();

    if (errorA || !versionA) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Version A not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Get version B with document text
    const { data: versionB, error: errorB } = await supabaseAdmin
      .from('permit_versions')
      .select(`
        *,
        document:documents(id, extracted_text, document_name, document_type)
      `)
      .eq('id', versionBId)
      .single();

    if (errorB || !versionB) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Version B not found',
        404,
        {},
        { request_id: requestId }
      );
    }

    // Verify both versions belong to the same document
    if (versionA.document_id !== versionB.document_id) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Both versions must belong to the same document',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Get extracted text from documents
    const textA = versionA.document?.extracted_text || '';
    const textB = versionB.document?.extracted_text || '';

    // Compute text diff
    const textDiff = computeTextDiff(textA, textB);
    const unifiedDiff = formatUnifiedDiff(
      textDiff,
      `Version ${versionA.version_number}`,
      `Version ${versionB.version_number}`
    );

    // Compute metadata diff
    const metadataA = {
      version_type: versionA.version_type,
      effective_date: versionA.effective_date,
      expiry_date: versionA.expiry_date,
      change_summary: versionA.change_summary,
    };

    const metadataB = {
      version_type: versionB.version_type,
      effective_date: versionB.effective_date,
      expiry_date: versionB.expiry_date,
      change_summary: versionB.change_summary,
    };

    const metadataDiff = computeObjectDiff(metadataA, metadataB);

    // Get obligation changes
    const { data: obligationsA } = await supabaseAdmin
      .from('obligation_versions')
      .select(`
        *,
        obligation:obligations(id, obligation_title, obligation_description, original_text)
      `)
      .eq('permit_version_id', versionAId);

    const { data: obligationsB } = await supabaseAdmin
      .from('obligation_versions')
      .select(`
        *,
        obligation:obligations(id, obligation_title, obligation_description, original_text)
      `)
      .eq('permit_version_id', versionBId);

    // Classify obligation changes
    const obligationChanges = {
      added: obligationsB?.filter(
        (obB: any) => obB.is_new || !obligationsA?.some((obA: any) => obA.obligation_id === obB.obligation_id)
      ) || [],
      removed: obligationsA?.filter(
        (obA: any) => !obligationsB?.some((obB: any) => obB.obligation_id === obA.obligation_id)
      ) || [],
      modified: obligationsB?.filter(
        (obB: any) => obB.is_modified && obligationsA?.some((obA: any) => obA.obligation_id === obB.obligation_id)
      ) || [],
      unchanged: obligationsB?.filter(
        (obB: any) =>
          !obB.is_new &&
          !obB.is_modified &&
          obligationsA?.some((obA: any) => obA.obligation_id === obB.obligation_id)
      ) || [],
    };

    const comparison = {
      version_a: {
        id: versionA.id,
        version_number: versionA.version_number,
        version_type: versionA.version_type,
        version_date: versionA.version_date,
        effective_date: versionA.effective_date,
        document_name: versionA.document?.document_name,
      },
      version_b: {
        id: versionB.id,
        version_number: versionB.version_number,
        version_type: versionB.version_type,
        version_date: versionB.version_date,
        effective_date: versionB.effective_date,
        document_name: versionB.document?.document_name,
      },
      text_diff: {
        hunks: textDiff.hunks,
        stats: textDiff.stats,
        unified_diff: unifiedDiff,
      },
      metadata_diff: metadataDiff,
      obligation_changes: obligationChanges,
      summary: {
        text_lines_added: textDiff.stats.added,
        text_lines_removed: textDiff.stats.removed,
        text_lines_unchanged: textDiff.stats.unchanged,
        obligations_added: obligationChanges.added.length,
        obligations_removed: obligationChanges.removed.length,
        obligations_modified: obligationChanges.modified.length,
        obligations_unchanged: obligationChanges.unchanged.length,
      },
    };

    const response = successResponse(comparison, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in GET /api/v1/module-1/permit-versions/compare:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}
