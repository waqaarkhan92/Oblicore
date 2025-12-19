/**
 * Pack Verification Endpoint
 * GET /api/v1/packs/{packId}/verify - Verify pack authenticity
 * This is a PUBLIC endpoint - no authentication required for verification
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { getRequestId } from '@/lib/api/middleware';

interface PackVerificationResult {
  verified: boolean;
  pack_id: string;
  generated_at: string | null;
  generated_by: string | null;
  pack_type: string;
  site_name: string | null;
  company_name: string | null;
  content_hash: string | null;
  signature_status: 'SIGNED' | 'UNSIGNED' | 'INVALID';
  verification_timestamp: string;
  details?: {
    hash_match: boolean;
    signed_at?: string;
    signed_by_name?: string;
    signature_type?: 'INTERNAL' | 'AUDITOR_ATTESTATION';
  };
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ packId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const params = await props.params;
    const { packId } = params;

    // Validate packId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(packId)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid pack ID format',
        400,
        null,
        { request_id: requestId }
      );
    }

    // Fetch pack details with related information
    const { data: pack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .select(`
        id,
        pack_type,
        status,
        generated_at,
        generated_by,
        storage_path,
        content_hash,
        metadata,
        sites:site_id (
          id,
          site_name,
          companies:company_id (
            id,
            name
          )
        )
      `)
      .eq('id', packId)
      .maybeSingle();

    if (packError || !pack) {
      return errorResponse(
        ErrorCodes.NOT_FOUND,
        'Pack not found',
        404,
        null,
        { request_id: requestId }
      );
    }

    // Check if pack is in a verifiable state
    if (pack.status !== 'COMPLETED' && pack.status !== 'DISTRIBUTED') {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Pack is not available for verification',
        400,
        { status: pack.status },
        { request_id: requestId }
      );
    }

    // Get generator user info
    let generatedByName: string | null = null;
    if (pack.generated_by) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('full_name, email')
        .eq('id', pack.generated_by)
        .single();
      generatedByName = user?.full_name || user?.email || null;
    }

    // Check for digital signature
    let signatureStatus: 'SIGNED' | 'UNSIGNED' | 'INVALID' = 'UNSIGNED';
    let signatureDetails: {
      hash_match: boolean;
      signed_at?: string;
      signed_by_name?: string;
      signature_type?: 'INTERNAL' | 'AUDITOR_ATTESTATION';
    } = { hash_match: true };

    // Look for signature in pack metadata or dedicated signature field
    const packSignature = (pack.metadata as any)?.signature;

    if (packSignature) {
      // Verify signature hash matches content hash
      if (packSignature.pack_hash && pack.content_hash) {
        const hashMatch = packSignature.pack_hash === pack.content_hash;
        signatureDetails.hash_match = hashMatch;

        if (hashMatch) {
          signatureStatus = 'SIGNED';
          signatureDetails.signed_at = packSignature.signed_at;
          signatureDetails.signature_type = packSignature.signature_type;

          // Get signer name
          if (packSignature.signed_by) {
            const { data: signer } = await supabaseAdmin
              .from('users')
              .select('full_name, email')
              .eq('id', packSignature.signed_by)
              .single();
            signatureDetails.signed_by_name = signer?.full_name || signer?.email;
          }
        } else {
          signatureStatus = 'INVALID';
        }
      }
    }

    // Build verification result
    const site = pack.sites as any;
    const company = site?.companies;

    const result: PackVerificationResult = {
      verified: pack.status === 'COMPLETED' || pack.status === 'DISTRIBUTED',
      pack_id: pack.id,
      generated_at: pack.generated_at,
      generated_by: generatedByName,
      pack_type: pack.pack_type,
      site_name: site?.site_name || null,
      company_name: company?.name || null,
      content_hash: pack.content_hash,
      signature_status: signatureStatus,
      verification_timestamp: new Date().toISOString(),
      details: signatureDetails,
    };

    // Log the verification attempt
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action_type: 'PACK_VERIFICATION',
        entity_type: 'audit_packs',
        entity_id: packId,
        new_values: {
          verified: result.verified,
          signature_status: signatureStatus,
          requester_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to log verification attempt:', auditError);
      // Don't fail the verification if audit logging fails
    }

    return successResponse(result, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('Pack verification error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred during verification',
      500,
      null,
      { request_id: requestId }
    );
  }
}
