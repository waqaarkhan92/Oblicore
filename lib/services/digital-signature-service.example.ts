/**
 * Digital Signature Service - Usage Examples
 *
 * This file demonstrates how to use the Digital Signature Service
 * for signing and verifying EcoComply packs.
 */

import { digitalSignatureService } from './digital-signature-service';

// ============================================================================
// EXAMPLE 1: Auto-sign a pack internally when it's generated
// ============================================================================

async function autoSignPack(packId: string, packBuffer: Buffer, userId: string) {
  try {
    // Create an internal signature when pack is generated
    const signature = await digitalSignatureService.createSignature(
      packId,
      'INTERNAL',
      userId,
      packBuffer
    );

    console.log('Pack auto-signed:', {
      signatureId: signature.id,
      signatureHash: signature.signatureHash,
      signedAt: signature.signedAt,
    });

    return signature;
  } catch (error) {
    console.error('Failed to auto-sign pack:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: Auditor attestation workflow
// ============================================================================

async function auditorAttestPack(packId: string, auditorUserId: string) {
  try {
    // Auditor signs off on the pack (doesn't need pack content, uses stored hash)
    const signature = await digitalSignatureService.createSignature(
      packId,
      'AUDITOR_ATTESTATION',
      auditorUserId
    );

    console.log('Auditor attestation created:', {
      signatureId: signature.id,
      auditor: signature.signedBy,
      timestamp: signature.signedAt,
    });

    return signature;
  } catch (error) {
    console.error('Failed to create auditor attestation:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 3: Verify pack signature
// ============================================================================

async function verifyPackIntegrity(packId: string, packBuffer?: Buffer) {
  try {
    // Verify pack signature (optionally with actual pack content)
    const result = await digitalSignatureService.verifySignature(
      packId,
      packBuffer
    );

    if (result.valid) {
      console.log('✓ Pack verification successful:', {
        totalSignatures: result.details.signatures.length,
        latestSignature: result.details.latestSignature?.signatureType,
        message: result.details.verificationMessage,
      });
    } else {
      console.error('✗ Pack verification failed:', {
        reason: result.details.verificationMessage,
      });
    }

    return result;
  } catch (error) {
    console.error('Verification error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 4: Get signature chain for audit trail
// ============================================================================

async function getPackAuditTrail(packId: string) {
  try {
    // Get complete signature chain with user details
    const chain = await digitalSignatureService.getSignatureChain(packId);

    console.log('Signature Chain:');
    chain.forEach((sig, index) => {
      console.log(`  ${index + 1}. ${sig.signatureType}`);
      console.log(`     Signed by: ${sig.userName} (${sig.userEmail})`);
      console.log(`     Timestamp: ${sig.signedAt}`);
      console.log(`     Signature: ${sig.signatureHash.substring(0, 16)}...`);
    });

    return chain;
  } catch (error) {
    console.error('Failed to get signature chain:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: Check if pack has auditor attestation
// ============================================================================

async function checkAuditorSignOff(packId: string) {
  try {
    const hasAttestation = await digitalSignatureService.hasAuditorAttestation(packId);

    if (hasAttestation) {
      console.log('✓ Pack has auditor attestation');
    } else {
      console.log('✗ Pack does not have auditor attestation');
    }

    return hasAttestation;
  } catch (error) {
    console.error('Failed to check auditor attestation:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 6: Get signature statistics
// ============================================================================

async function getPackSignatureStats(packId: string) {
  try {
    const stats = await digitalSignatureService.getSignatureStats(packId);

    console.log('Signature Statistics:', {
      total: stats.totalSignatures,
      internal: stats.internalSignatures,
      auditor: stats.auditorSignatures,
      firstSigned: stats.firstSignedAt,
      lastSigned: stats.lastSignedAt,
    });

    return stats;
  } catch (error) {
    console.error('Failed to get signature stats:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 7: Complete pack generation workflow with signing
// ============================================================================

async function completePackGenerationWorkflow(
  packId: string,
  packBuffer: Buffer,
  generatorUserId: string
) {
  try {
    console.log('Starting pack generation workflow...');

    // Step 1: Generate pack hash
    const packHash = digitalSignatureService.generatePackHash(packBuffer);
    console.log('Pack hash generated:', packHash.substring(0, 16) + '...');

    // Step 2: Auto-sign the pack
    const internalSignature = await digitalSignatureService.createSignature(
      packId,
      'INTERNAL',
      generatorUserId,
      packBuffer
    );
    console.log('Pack auto-signed by generator');

    // Step 3: Verify the signature
    const verification = await digitalSignatureService.verifySignature(
      packId,
      packBuffer
    );

    if (!verification.valid) {
      throw new Error('Pack signature verification failed');
    }

    console.log('✓ Pack generation workflow complete');
    console.log('  - Pack hash:', packHash);
    console.log('  - Signature:', internalSignature.signatureHash);
    console.log('  - Signed at:', internalSignature.signedAt);

    return {
      packHash,
      signature: internalSignature,
      verified: true,
    };
  } catch (error) {
    console.error('Pack generation workflow failed:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 8: Generate hash from string content
// ============================================================================

function hashStringContent(content: string) {
  // You can also hash string content (useful for JSON or text data)
  const hash = digitalSignatureService.generatePackHash(content);
  console.log('Content hash:', hash);
  return hash;
}

// Export example functions for testing
export {
  autoSignPack,
  auditorAttestPack,
  verifyPackIntegrity,
  getPackAuditTrail,
  checkAuditorSignOff,
  getPackSignatureStats,
  completePackGenerationWorkflow,
  hashStringContent,
};
