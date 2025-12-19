# Digital Signature Service

## Overview

The Digital Signature Service provides cryptographic signing and verification capabilities for EcoComply audit packs. It ensures pack authenticity, detects tampering, and maintains a complete audit trail of all signatures.

## Features

- **SHA-256 Content Hashing**: Generate secure hashes of pack contents for tamper detection
- **Multiple Signature Types**: Support for internal auto-signing and manual auditor attestation
- **Signature Verification**: Verify pack authenticity by re-hashing and comparing signatures
- **Audit Trail**: Complete chain-of-custody tracking with user details and timestamps
- **Database Integration**: Seamless storage in audit_packs table using Supabase

## Signature Types

### INTERNAL
Auto-signed by the pack generator when the pack is created. This provides:
- Proof of origin
- Initial content hash for tamper detection
- Baseline for future verification

### AUDITOR_ATTESTATION
Manual sign-off by an authorized auditor. This provides:
- Independent verification
- Regulatory compliance
- Formal attestation for legal purposes

## API Reference

### `generatePackHash(packContent: Buffer | string): string`

Generate a SHA-256 hash of pack contents.

**Parameters:**
- `packContent`: Pack content as Buffer or string

**Returns:** SHA-256 hash as hexadecimal string

**Example:**
```typescript
const hash = digitalSignatureService.generatePackHash(packBuffer);
console.log(hash); // "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a"
```

---

### `createSignature(packId, signatureType, userId, packContent?): Promise<PackSignature>`

Create a digital signature for a pack.

**Parameters:**
- `packId`: Pack identifier (UUID)
- `signatureType`: 'INTERNAL' or 'AUDITOR_ATTESTATION'
- `userId`: User creating the signature (UUID)
- `packContent`: Optional pack content to hash. If not provided, uses existing content_hash

**Returns:** Promise resolving to PackSignature object

**Throws:** Error if pack not found, pack not completed, or storage fails

**Example:**
```typescript
// Auto-sign when pack is generated
const signature = await digitalSignatureService.createSignature(
  packId,
  'INTERNAL',
  generatorUserId,
  packBuffer
);

// Auditor attestation (uses stored hash)
const attestation = await digitalSignatureService.createSignature(
  packId,
  'AUDITOR_ATTESTATION',
  auditorUserId
);
```

---

### `verifySignature(packId, packContent?): Promise<{ valid: boolean; details: SignatureDetails }>`

Verify pack signature by re-hashing and comparing.

**Parameters:**
- `packId`: Pack identifier (UUID)
- `packContent`: Optional pack content to verify. If not provided, verifies stored hash exists

**Returns:** Promise resolving to verification result with details

**Example:**
```typescript
// Verify with actual pack content
const result = await digitalSignatureService.verifySignature(packId, packBuffer);

if (result.valid) {
  console.log('✓ Pack verified:', result.details.verificationMessage);
} else {
  console.error('✗ Verification failed:', result.details.verificationMessage);
}
```

---

### `getPackSignatures(packId): Promise<PackSignature[]>`

Get all signatures for a pack.

**Parameters:**
- `packId`: Pack identifier (UUID)

**Returns:** Promise resolving to array of PackSignature objects

**Example:**
```typescript
const signatures = await digitalSignatureService.getPackSignatures(packId);
console.log(`Pack has ${signatures.length} signature(s)`);
```

---

### `getSignatureStats(packId): Promise<SignatureStats>`

Get signature statistics for a pack.

**Parameters:**
- `packId`: Pack identifier (UUID)

**Returns:** Promise resolving to statistics object

**Example:**
```typescript
const stats = await digitalSignatureService.getSignatureStats(packId);
console.log({
  total: stats.totalSignatures,
  internal: stats.internalSignatures,
  auditor: stats.auditorSignatures,
  firstSigned: stats.firstSignedAt,
  lastSigned: stats.lastSignedAt,
});
```

---

### `hasAuditorAttestation(packId): Promise<boolean>`

Check if a pack has a valid auditor attestation.

**Parameters:**
- `packId`: Pack identifier (UUID)

**Returns:** Promise resolving to boolean

**Example:**
```typescript
const hasAttestation = await digitalSignatureService.hasAuditorAttestation(packId);
if (!hasAttestation) {
  console.log('⚠️  Pack requires auditor sign-off');
}
```

---

### `getSignatureChain(packId): Promise<Array<PackSignature & UserDetails>>`

Get complete signature chain with user details for audit trail.

**Parameters:**
- `packId`: Pack identifier (UUID)

**Returns:** Promise resolving to array of signatures enriched with user details

**Example:**
```typescript
const chain = await digitalSignatureService.getSignatureChain(packId);
chain.forEach((sig, i) => {
  console.log(`${i + 1}. ${sig.signatureType} - ${sig.userName} (${sig.userEmail})`);
  console.log(`   Signed: ${sig.signedAt}`);
});
```

## Data Structures

### PackSignature
```typescript
interface PackSignature {
  id: string;                      // Unique signature ID
  packId: string;                  // Pack being signed
  signatureHash: string;           // Cryptographic signature hash
  packHash: string;                // Hash of pack content at time of signing
  signatureType: SignatureType;    // INTERNAL or AUDITOR_ATTESTATION
  signedBy: string;                // User ID of signer
  signedAt: string;                // ISO 8601 timestamp
  metadata?: Record<string, any>;  // Optional additional data
}
```

### SignatureDetails
```typescript
interface SignatureDetails {
  packId: string;                  // Pack identifier
  packType?: string;               // Type of pack
  generatedAt?: string;            // Pack generation timestamp
  signatures: PackSignature[];     // All signatures
  latestSignature?: PackSignature; // Most recent signature
  isValid: boolean;                // Overall validation status
  verificationMessage?: string;    // Human-readable verification result
}
```

## Database Schema

Signatures are stored in the `audit_packs` table:

```sql
ALTER TABLE audit_packs ADD COLUMN signatures JSONB NOT NULL DEFAULT '[]';
```

The `signatures` column contains a JSON array of PackSignature objects. Example:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "packId": "123e4567-e89b-12d3-a456-426614174000",
    "signatureHash": "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
    "packHash": "b8eec7f9cg2fe87762d25867b172e773g691gg5ef54c5agb93e91b5c91g9545b",
    "signatureType": "INTERNAL",
    "signedBy": "789e0123-f01c-23e4-b567-537725285001",
    "signedAt": "2025-02-20T10:30:00.000Z",
    "metadata": {}
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "packId": "123e4567-e89b-12d3-a456-426614174000",
    "signatureHash": "c9ggd8g0dh3hf98873f36978c283f884h802hh6fg65d6bhc04f02c6d02h0656c",
    "packHash": "b8eec7f9cg2fe87762d25867b172e773g691gg5ef54c5agb93e91b5c91g9545b",
    "signatureType": "AUDITOR_ATTESTATION",
    "signedBy": "890e1234-g12d-34f5-c678-648836396002",
    "signedAt": "2025-02-20T14:15:00.000Z",
    "metadata": {}
  }
]
```

## Usage Workflows

### 1. Pack Generation with Auto-Signing

```typescript
import { digitalSignatureService } from '@/lib/services/digital-signature-service';

async function generateAndSignPack(packId: string, packBuffer: Buffer, userId: string) {
  // Generate the pack hash
  const packHash = digitalSignatureService.generatePackHash(packBuffer);

  // Create internal signature
  const signature = await digitalSignatureService.createSignature(
    packId,
    'INTERNAL',
    userId,
    packBuffer
  );

  // Verify immediately
  const verification = await digitalSignatureService.verifySignature(packId, packBuffer);

  if (!verification.valid) {
    throw new Error('Pack signature verification failed');
  }

  return { packHash, signature };
}
```

### 2. Auditor Attestation Workflow

```typescript
async function auditorReviewAndAttest(packId: string, auditorId: string) {
  // Check current signatures
  const signatures = await digitalSignatureService.getPackSignatures(packId);

  // Verify pack integrity before attesting
  const verification = await digitalSignatureService.verifySignature(packId);

  if (!verification.valid) {
    throw new Error('Cannot attest to invalid pack');
  }

  // Create auditor attestation
  const attestation = await digitalSignatureService.createSignature(
    packId,
    'AUDITOR_ATTESTATION',
    auditorId
  );

  return attestation;
}
```

### 3. Pack Verification Before Distribution

```typescript
async function verifyPackBeforeDistribution(packId: string, packBuffer: Buffer) {
  // Verify signature
  const verification = await digitalSignatureService.verifySignature(packId, packBuffer);

  if (!verification.valid) {
    throw new Error(`Pack verification failed: ${verification.details.verificationMessage}`);
  }

  // Check for auditor attestation
  const hasAttestation = await digitalSignatureService.hasAuditorAttestation(packId);

  if (!hasAttestation) {
    console.warn('⚠️  Pack distributed without auditor attestation');
  }

  // Get full audit trail
  const chain = await digitalSignatureService.getSignatureChain(packId);

  return {
    verified: true,
    attestation: hasAttestation,
    auditTrail: chain,
  };
}
```

### 4. Audit Trail Reporting

```typescript
async function generateSignatureReport(packId: string) {
  const chain = await digitalSignatureService.getSignatureChain(packId);
  const stats = await digitalSignatureService.getSignatureStats(packId);

  console.log('=== Pack Signature Report ===');
  console.log(`Total Signatures: ${stats.totalSignatures}`);
  console.log(`Internal Signatures: ${stats.internalSignatures}`);
  console.log(`Auditor Attestations: ${stats.auditorSignatures}`);
  console.log(`First Signed: ${stats.firstSignedAt}`);
  console.log(`Last Signed: ${stats.lastSignedAt}`);
  console.log('\n=== Signature Chain ===');

  chain.forEach((sig, index) => {
    console.log(`${index + 1}. ${sig.signatureType}`);
    console.log(`   Signed by: ${sig.userName} (${sig.userEmail})`);
    console.log(`   Timestamp: ${sig.signedAt}`);
    console.log(`   Hash: ${sig.signatureHash.substring(0, 16)}...`);
  });

  return { chain, stats };
}
```

## Security Considerations

### Hash Algorithm
- Uses SHA-256 for cryptographic hashing
- Collision-resistant and suitable for regulatory compliance
- Widely accepted industry standard

### Signature Generation
- Signatures combine pack hash, timestamp, user ID, and signature type
- Each signature is unique and cannot be reused
- Timestamps prevent replay attacks

### Verification Process
1. Pack existence and completion status checked
2. Content hash recomputed and compared
3. Signature hash recalculated and validated
4. All historical signatures preserved for audit trail

### Best Practices
- Always verify packs before distribution
- Require auditor attestation for regulatory submissions
- Maintain signature chains for compliance audits
- Log all signature operations for security monitoring

## Error Handling

The service throws descriptive errors for common scenarios:

```typescript
try {
  await digitalSignatureService.createSignature(packId, 'INTERNAL', userId);
} catch (error) {
  if (error.message.includes('Pack not found')) {
    // Handle missing pack
  } else if (error.message.includes('Cannot sign pack with status')) {
    // Handle pack not completed
  } else {
    // Handle other errors
  }
}
```

## Integration Points

### Pack Generation Job
Integrate auto-signing into pack generation:
```typescript
// In pack-generation-job.ts
import { digitalSignatureService } from '@/lib/services/digital-signature-service';

// After pack PDF is generated
await digitalSignatureService.createSignature(
  packId,
  'INTERNAL',
  jobContext.userId,
  packBuffer
);
```

### Pack Download API
Verify signature before allowing download:
```typescript
// In pack download endpoint
const verification = await digitalSignatureService.verifySignature(packId);
if (!verification.valid) {
  return new Response('Pack verification failed', { status: 400 });
}
```

### Pack Distribution
Include signature verification in distribution:
```typescript
// Before sending pack to regulator
const hasAttestation = await digitalSignatureService.hasAuditorAttestation(packId);
if (!hasAttestation) {
  throw new Error('Regulator packs require auditor attestation');
}
```

## Migration

To add signature support to existing packs:

1. Run migration: `20250220000003_add_pack_signatures_field.sql`
2. Backfill signatures for existing packs (optional):

```typescript
async function backfillSignatures() {
  const { data: packs } = await supabaseAdmin
    .from('audit_packs')
    .select('id, generated_by, generated_at')
    .eq('status', 'COMPLETED')
    .is('signatures', null);

  for (const pack of packs) {
    // Create backdated signature
    await digitalSignatureService.createSignature(
      pack.id,
      'INTERNAL',
      pack.generated_by
    );
  }
}
```

## Testing

See `digital-signature-service.example.ts` for comprehensive usage examples.

## Performance

- Hash generation: O(n) where n is pack size
- Signature creation: O(1) database operation
- Signature verification: O(m) where m is number of signatures (typically 1-3)
- Signature chain retrieval: O(m) with user lookup

## Compliance

This service supports:
- ISO 27001 audit trail requirements
- SOC 2 Type II data integrity controls
- GDPR data authenticity requirements
- Industry-specific regulatory compliance (EPA, FDA, etc.)

## Future Enhancements

Potential improvements for future versions:
- External signature providers (DocuSign, Adobe Sign)
- Multi-party signing workflows
- Signature revocation and re-signing
- Blockchain-based signature anchoring
- Email notifications for signature events
- Signature expiration policies
