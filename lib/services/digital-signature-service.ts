/**
 * Digital Signature Service for EcoComply Packs
 *
 * Provides cryptographic signing and verification for audit packs to ensure
 * authenticity and detect tampering. Supports both internal auto-signing
 * and manual auditor attestation workflows.
 *
 * Features:
 * - SHA-256 content hashing for tamper detection
 * - Multiple signature types (INTERNAL, AUDITOR_ATTESTATION)
 * - Signature verification and validation
 * - Audit trail of all signatures
 *
 * Reference: docs/specs/pack-signing.md
 */

import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';

// ============================================================================
// INTERFACES
// ============================================================================

export type SignatureType = 'INTERNAL' | 'AUDITOR_ATTESTATION';

export interface PackSignature {
  id: string;
  packId: string;
  signatureHash: string;
  packHash: string;
  signatureType: SignatureType;
  signedBy: string;
  signedAt: string;
  metadata?: Record<string, any>;
}

export interface SignatureDetails {
  packId: string;
  packType?: string;
  generatedAt?: string;
  signatures: PackSignature[];
  latestSignature?: PackSignature;
  isValid: boolean;
  verificationMessage?: string;
}

// ============================================================================
// DIGITAL SIGNATURE SERVICE
// ============================================================================

export class DigitalSignatureService {
  /**
   * Generate SHA-256 hash of pack contents
   * @param packContent - Pack content as Buffer or string
   * @returns SHA-256 hash as hex string
   */
  generatePackHash(packContent: Buffer | string): string {
    const hash = createHash('sha256');

    if (Buffer.isBuffer(packContent)) {
      hash.update(packContent);
    } else {
      hash.update(packContent, 'utf8');
    }

    return hash.digest('hex');
  }

  /**
   * Create a digital signature for a pack
   * @param packId - Pack identifier
   * @param signatureType - Type of signature (INTERNAL or AUDITOR_ATTESTATION)
   * @param userId - User creating the signature
   * @param packContent - Optional pack content to hash. If not provided, uses existing content_hash
   * @returns Created signature record
   */
  async createSignature(
    packId: string,
    signatureType: SignatureType,
    userId: string,
    packContent?: Buffer | string
  ): Promise<PackSignature> {
    try {
      // Fetch pack to verify it exists and get current hash
      const { data: pack, error: packError } = await supabaseAdmin
        .from('audit_packs')
        .select('id, content_hash, status, signatures')
        .eq('id', packId)
        .maybeSingle();

      if (packError || !pack) {
        throw new Error(`Pack not found: ${packId}`);
      }

      // Only allow signing completed packs
      if (pack.status !== 'COMPLETED') {
        throw new Error(`Cannot sign pack with status: ${pack.status}. Pack must be COMPLETED.`);
      }

      // Determine pack hash
      let packHash: string;
      if (packContent) {
        // Generate new hash from provided content
        packHash = this.generatePackHash(packContent);
      } else if (pack.content_hash) {
        // Use existing stored hash
        packHash = pack.content_hash;
      } else {
        throw new Error('No pack content or hash available for signing');
      }

      // Generate signature hash (combination of pack hash, timestamp, user, and type)
      const timestamp = new Date().toISOString();
      const signatureData = `${packHash}:${timestamp}:${userId}:${signatureType}`;
      const signatureHash = createHash('sha256')
        .update(signatureData, 'utf8')
        .digest('hex');

      // Create signature record
      const signature: PackSignature = {
        id: crypto.randomUUID(),
        packId,
        signatureHash,
        packHash,
        signatureType,
        signedBy: userId,
        signedAt: timestamp,
        metadata: {},
      };

      // Get existing signatures
      const existingSignatures = (pack.signatures as any) || [];

      // Store signature in signatures JSONB array
      const { error: updateError } = await supabaseAdmin
        .from('audit_packs')
        .update({
          signatures: [...existingSignatures, signature],
        })
        .eq('id', packId);

      if (updateError) {
        console.error('Error storing signature:', updateError);
        throw new Error(`Failed to store signature: ${updateError.message}`);
      }

      console.log(`Signature created for pack ${packId} by user ${userId} (${signatureType})`);
      return signature;
    } catch (error) {
      console.error('Error creating signature:', error);
      throw error instanceof Error
        ? error
        : new Error(`Failed to create signature: ${error}`);
    }
  }

  /**
   * Verify pack signature by re-hashing and comparing
   * @param packId - Pack identifier
   * @param packContent - Optional pack content to verify. If not provided, verifies stored hash
   * @returns Verification result with details
   */
  async verifySignature(
    packId: string,
    packContent?: Buffer | string
  ): Promise<{ valid: boolean; details: SignatureDetails }> {
    try {
      // Fetch pack with signatures
      const { data: pack, error: packError } = await supabaseAdmin
        .from('audit_packs')
        .select(`
          id,
          pack_type,
          generated_at,
          status,
          content_hash,
          signatures
        `)
        .eq('id', packId)
        .maybeSingle();

      if (packError || !pack) {
        return {
          valid: false,
          details: {
            packId,
            signatures: [],
            isValid: false,
            verificationMessage: 'Pack not found',
          },
        };
      }

      // Extract signatures from pack
      const signatures: PackSignature[] = (pack.signatures as any) || [];

      if (signatures.length === 0) {
        return {
          valid: false,
          details: {
            packId: pack.id,
            packType: pack.pack_type || undefined,
            generatedAt: pack.generated_at || undefined,
            signatures: [],
            isValid: false,
            verificationMessage: 'No signatures found for this pack',
          },
        };
      }

      // Get latest signature
      const latestSignature = signatures[signatures.length - 1];

      // If pack content provided, verify hash matches
      if (packContent) {
        const computedHash = this.generatePackHash(packContent);

        // Check if computed hash matches the latest signature's pack hash
        if (computedHash !== latestSignature.packHash) {
          return {
            valid: false,
            details: {
              packId: pack.id,
              packType: pack.pack_type || undefined,
              generatedAt: pack.generated_at || undefined,
              signatures,
              latestSignature,
              isValid: false,
              verificationMessage: 'Pack content hash mismatch - pack may have been tampered with',
            },
          };
        }

        // Also verify against stored content_hash if available
        if (pack.content_hash && pack.content_hash !== computedHash) {
          return {
            valid: false,
            details: {
              packId: pack.id,
              packType: pack.pack_type || undefined,
              generatedAt: pack.generated_at || undefined,
              signatures,
              latestSignature,
              isValid: false,
              verificationMessage: 'Pack content does not match stored hash',
            },
          };
        }
      }

      // Verify signature hash is valid
      const signatureData = `${latestSignature.packHash}:${latestSignature.signedAt}:${latestSignature.signedBy}:${latestSignature.signatureType}`;
      const expectedSignatureHash = createHash('sha256')
        .update(signatureData, 'utf8')
        .digest('hex');

      if (expectedSignatureHash !== latestSignature.signatureHash) {
        return {
          valid: false,
          details: {
            packId: pack.id,
            packType: pack.pack_type || undefined,
            generatedAt: pack.generated_at || undefined,
            signatures,
            latestSignature,
            isValid: false,
            verificationMessage: 'Signature hash verification failed',
          },
        };
      }

      // All checks passed
      return {
        valid: true,
        details: {
          packId: pack.id,
          packType: pack.pack_type || undefined,
          generatedAt: pack.generated_at || undefined,
          signatures,
          latestSignature,
          isValid: true,
          verificationMessage: `Pack verified successfully with ${signatures.length} signature(s)`,
        },
      };
    } catch (error) {
      console.error('Error verifying signature:', error);
      return {
        valid: false,
        details: {
          packId,
          signatures: [],
          isValid: false,
          verificationMessage: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  /**
   * Get all signatures for a pack
   * @param packId - Pack identifier
   * @returns Array of pack signatures
   */
  async getPackSignatures(packId: string): Promise<PackSignature[]> {
    try {
      const { data: pack, error: packError } = await supabaseAdmin
        .from('audit_packs')
        .select('id, signatures')
        .eq('id', packId)
        .maybeSingle();

      if (packError || !pack) {
        console.error('Pack not found:', packError);
        return [];
      }

      // Extract signatures from pack
      const signatures: PackSignature[] = (pack.signatures as any) || [];

      return signatures;
    } catch (error) {
      console.error('Error fetching pack signatures:', error);
      return [];
    }
  }

  /**
   * Get signature statistics for a pack
   * @param packId - Pack identifier
   * @returns Statistics about signatures
   */
  async getSignatureStats(packId: string): Promise<{
    totalSignatures: number;
    internalSignatures: number;
    auditorSignatures: number;
    firstSignedAt?: string;
    lastSignedAt?: string;
  }> {
    const signatures = await this.getPackSignatures(packId);

    if (signatures.length === 0) {
      return {
        totalSignatures: 0,
        internalSignatures: 0,
        auditorSignatures: 0,
      };
    }

    const internalSignatures = signatures.filter(s => s.signatureType === 'INTERNAL').length;
    const auditorSignatures = signatures.filter(s => s.signatureType === 'AUDITOR_ATTESTATION').length;

    return {
      totalSignatures: signatures.length,
      internalSignatures,
      auditorSignatures,
      firstSignedAt: signatures[0]?.signedAt,
      lastSignedAt: signatures[signatures.length - 1]?.signedAt,
    };
  }

  /**
   * Check if a pack has a valid auditor attestation
   * @param packId - Pack identifier
   * @returns True if pack has at least one valid auditor signature
   */
  async hasAuditorAttestation(packId: string): Promise<boolean> {
    const signatures = await this.getPackSignatures(packId);
    return signatures.some(s => s.signatureType === 'AUDITOR_ATTESTATION');
  }

  /**
   * Get signature chain (all signatures in chronological order)
   * Useful for audit trails and compliance reporting
   * @param packId - Pack identifier
   * @returns Array of signatures with user details
   */
  async getSignatureChain(packId: string): Promise<Array<PackSignature & {
    userName?: string;
    userEmail?: string;
  }>> {
    try {
      const signatures = await this.getPackSignatures(packId);

      if (signatures.length === 0) {
        return [];
      }

      // Get user details for all signers
      const userIds = Array.from(new Set(signatures.map(s => s.signedBy)));
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      const userMap = new Map(
        users?.map((u: any) => [u.id, u]) || []
      );

      // Enrich signatures with user details
      return signatures.map(sig => {
        const user = userMap.get(sig.signedBy) as any;
        return {
          ...sig,
          userName: user?.full_name,
          userEmail: user?.email,
        };
      });
    } catch (error) {
      console.error('Error getting signature chain:', error);
      return [];
    }
  }
}

// Export singleton instance
export const digitalSignatureService = new DigitalSignatureService();
