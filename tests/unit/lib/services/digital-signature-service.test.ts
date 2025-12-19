/**
 * Digital Signature Service Tests
 * Comprehensive tests for lib/services/digital-signature-service.ts
 * Target: 100% coverage
 *
 * Tests cover:
 * - Hash generation for Buffer and string content
 * - Signature creation (INTERNAL and AUDITOR_ATTESTATION)
 * - Signature verification with and without pack content
 * - Signature retrieval and statistics
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { createHash } from 'crypto';

describe('digital-signature-service', () => {
  let mockFromFn: jest.Mock;
  let digitalSignatureService: any;

  // Sample test data
  const mockPackId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '789e0123-f01c-23e4-b567-537725285001';
  const mockPackBuffer = Buffer.from('Mock PDF pack content');
  const mockPackContent = 'Mock pack content string';

  // Helper to create pack query mock
  const createPackQueryMock = (pack: any, error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockReturnValue(
          Promise.resolve({ data: pack, error })
        ),
      }),
    }),
  });

  // Helper to create update mock
  const createUpdateMock = (error: any = null) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue(
        Promise.resolve({ error })
      ),
    }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Mock supabaseAdmin
    mockFromFn = jest.fn();
    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: mockFromFn,
      },
    }));

    // Import service after mocking
    const module = await import('@/lib/services/digital-signature-service');
    digitalSignatureService = module.digitalSignatureService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generatePackHash', () => {
    it('should generate SHA-256 hash from Buffer', () => {
      const hash = digitalSignatureService.generatePackHash(mockPackBuffer);

      // Verify it's a valid hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/);

      // Verify it matches expected hash
      const expectedHash = createHash('sha256').update(mockPackBuffer).digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('should generate SHA-256 hash from string', () => {
      const hash = digitalSignatureService.generatePackHash(mockPackContent);

      // Verify it's a valid hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/);

      // Verify it matches expected hash
      const expectedHash = createHash('sha256').update(mockPackContent, 'utf8').digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = digitalSignatureService.generatePackHash('content1');
      const hash2 = digitalSignatureService.generatePackHash('content2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash for same content', () => {
      const hash1 = digitalSignatureService.generatePackHash(mockPackContent);
      const hash2 = digitalSignatureService.generatePackHash(mockPackContent);

      expect(hash1).toBe(hash2);
    });
  });

  describe('createSignature', () => {
    it('should create INTERNAL signature with pack content', async () => {
      const mockPack = {
        id: mockPackId,
        status: 'COMPLETED',
        content_hash: null,
        signatures: [],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      const signature = await digitalSignatureService.createSignature(
        mockPackId,
        'INTERNAL',
        mockUserId,
        mockPackBuffer
      );

      expect(signature).toMatchObject({
        packId: mockPackId,
        signatureType: 'INTERNAL',
        signedBy: mockUserId,
      });
      expect(signature.id).toBeDefined();
      expect(signature.signatureHash).toMatch(/^[a-f0-9]{64}$/);
      expect(signature.packHash).toMatch(/^[a-f0-9]{64}$/);
      expect(signature.signedAt).toBeDefined();
    });

    it('should create AUDITOR_ATTESTATION signature using stored hash', async () => {
      const storedHash = digitalSignatureService.generatePackHash(mockPackBuffer);
      const mockPack = {
        id: mockPackId,
        status: 'COMPLETED',
        content_hash: storedHash,
        signatures: [],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      const signature = await digitalSignatureService.createSignature(
        mockPackId,
        'AUDITOR_ATTESTATION',
        mockUserId
      );

      expect(signature).toMatchObject({
        packId: mockPackId,
        signatureType: 'AUDITOR_ATTESTATION',
        signedBy: mockUserId,
        packHash: storedHash,
      });
    });

    it('should throw error if pack not found', async () => {
      mockFromFn.mockReturnValueOnce(createPackQueryMock(null));

      await expect(
        digitalSignatureService.createSignature(
          mockPackId,
          'INTERNAL',
          mockUserId,
          mockPackBuffer
        )
      ).rejects.toThrow('Pack not found');
    });

    it('should throw error if pack not completed', async () => {
      const mockPack = {
        id: mockPackId,
        status: 'PENDING',
        content_hash: null,
        signatures: [],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      await expect(
        digitalSignatureService.createSignature(
          mockPackId,
          'INTERNAL',
          mockUserId,
          mockPackBuffer
        )
      ).rejects.toThrow('Cannot sign pack with status: PENDING');
    });

    it('should throw error if no pack content or hash available', async () => {
      const mockPack = {
        id: mockPackId,
        status: 'COMPLETED',
        content_hash: null,
        signatures: [],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      await expect(
        digitalSignatureService.createSignature(
          mockPackId,
          'INTERNAL',
          mockUserId
        )
      ).rejects.toThrow('No pack content or hash available');
    });

    it('should append to existing signatures', async () => {
      const existingSignature = {
        id: 'existing-id',
        packId: mockPackId,
        signatureHash: 'existing-hash',
        packHash: 'pack-hash',
        signatureType: 'INTERNAL',
        signedBy: 'other-user',
        signedAt: '2025-02-19T10:00:00.000Z',
      };

      const mockPack = {
        id: mockPackId,
        status: 'COMPLETED',
        content_hash: 'pack-hash',
        signatures: [existingSignature],
      };

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(Promise.resolve({ error: null })),
      });

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));
      mockFromFn.mockReturnValueOnce({
        update: updateMock,
      });

      await digitalSignatureService.createSignature(
        mockPackId,
        'AUDITOR_ATTESTATION',
        mockUserId
      );

      // Verify update was called with both signatures
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          signatures: expect.arrayContaining([
            existingSignature,
            expect.objectContaining({
              signatureType: 'AUDITOR_ATTESTATION',
            }),
          ]),
        })
      );
    });

    it('should throw error if database update fails', async () => {
      const mockPack = {
        id: mockPackId,
        status: 'COMPLETED',
        content_hash: 'hash',
        signatures: [],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ message: 'Database error' })
      );

      await expect(
        digitalSignatureService.createSignature(
          mockPackId,
          'INTERNAL',
          mockUserId
        )
      ).rejects.toThrow('Failed to store signature');
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature with pack content', async () => {
      const packHash = digitalSignatureService.generatePackHash(mockPackBuffer);
      const signedAt = '2025-02-20T10:00:00.000Z';
      const signatureData = `${packHash}:${signedAt}:${mockUserId}:INTERNAL`;
      const signatureHash = createHash('sha256').update(signatureData, 'utf8').digest('hex');

      const mockSignature = {
        id: 'sig-id',
        packId: mockPackId,
        signatureHash,
        packHash,
        signatureType: 'INTERNAL',
        signedBy: mockUserId,
        signedAt,
      };

      const mockPack = {
        id: mockPackId,
        pack_type: 'AUDIT_PACK',
        generated_at: '2025-02-20T09:00:00.000Z',
        status: 'COMPLETED',
        content_hash: packHash,
        signatures: [mockSignature],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const result = await digitalSignatureService.verifySignature(
        mockPackId,
        mockPackBuffer
      );

      expect(result.valid).toBe(true);
      expect(result.details.isValid).toBe(true);
      expect(result.details.signatures).toHaveLength(1);
      expect(result.details.latestSignature).toEqual(mockSignature);
      expect(result.details.verificationMessage).toContain('verified successfully');
    });

    it('should verify signature without pack content', async () => {
      const packHash = 'stored-pack-hash';
      const signedAt = '2025-02-20T10:00:00.000Z';
      const signatureData = `${packHash}:${signedAt}:${mockUserId}:INTERNAL`;
      const signatureHash = createHash('sha256').update(signatureData, 'utf8').digest('hex');

      const mockSignature = {
        id: 'sig-id',
        packId: mockPackId,
        signatureHash,
        packHash,
        signatureType: 'INTERNAL',
        signedBy: mockUserId,
        signedAt,
      };

      const mockPack = {
        id: mockPackId,
        pack_type: 'AUDIT_PACK',
        generated_at: '2025-02-20T09:00:00.000Z',
        status: 'COMPLETED',
        content_hash: packHash,
        signatures: [mockSignature],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const result = await digitalSignatureService.verifySignature(mockPackId);

      expect(result.valid).toBe(true);
      expect(result.details.isValid).toBe(true);
    });

    it('should fail verification if pack not found', async () => {
      mockFromFn.mockReturnValueOnce(createPackQueryMock(null));

      const result = await digitalSignatureService.verifySignature(mockPackId);

      expect(result.valid).toBe(false);
      expect(result.details.isValid).toBe(false);
      expect(result.details.verificationMessage).toBe('Pack not found');
    });

    it('should fail verification if no signatures found', async () => {
      const mockPack = {
        id: mockPackId,
        pack_type: 'AUDIT_PACK',
        generated_at: '2025-02-20T09:00:00.000Z',
        status: 'COMPLETED',
        content_hash: 'hash',
        signatures: [],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const result = await digitalSignatureService.verifySignature(mockPackId);

      expect(result.valid).toBe(false);
      expect(result.details.verificationMessage).toBe('No signatures found for this pack');
    });

    it('should fail verification if pack content hash mismatch', async () => {
      const packHash = 'original-hash';
      const mockSignature = {
        id: 'sig-id',
        packId: mockPackId,
        signatureHash: 'sig-hash',
        packHash,
        signatureType: 'INTERNAL',
        signedBy: mockUserId,
        signedAt: '2025-02-20T10:00:00.000Z',
      };

      const mockPack = {
        id: mockPackId,
        pack_type: 'AUDIT_PACK',
        generated_at: '2025-02-20T09:00:00.000Z',
        status: 'COMPLETED',
        content_hash: packHash,
        signatures: [mockSignature],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      // Different content than what was signed
      const tamperedContent = Buffer.from('Tampered content');

      const result = await digitalSignatureService.verifySignature(
        mockPackId,
        tamperedContent
      );

      expect(result.valid).toBe(false);
      expect(result.details.verificationMessage).toContain('hash mismatch');
    });

    it('should fail verification if signature hash invalid', async () => {
      const packHash = digitalSignatureService.generatePackHash(mockPackBuffer);
      const mockSignature = {
        id: 'sig-id',
        packId: mockPackId,
        signatureHash: 'invalid-signature-hash',
        packHash,
        signatureType: 'INTERNAL',
        signedBy: mockUserId,
        signedAt: '2025-02-20T10:00:00.000Z',
      };

      const mockPack = {
        id: mockPackId,
        pack_type: 'AUDIT_PACK',
        generated_at: '2025-02-20T09:00:00.000Z',
        status: 'COMPLETED',
        content_hash: packHash,
        signatures: [mockSignature],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const result = await digitalSignatureService.verifySignature(mockPackId);

      expect(result.valid).toBe(false);
      expect(result.details.verificationMessage).toBe('Signature hash verification failed');
    });
  });

  describe('getPackSignatures', () => {
    it('should return all signatures for a pack', async () => {
      const mockSignatures = [
        {
          id: 'sig-1',
          packId: mockPackId,
          signatureHash: 'hash-1',
          packHash: 'pack-hash',
          signatureType: 'INTERNAL',
          signedBy: 'user-1',
          signedAt: '2025-02-20T10:00:00.000Z',
        },
        {
          id: 'sig-2',
          packId: mockPackId,
          signatureHash: 'hash-2',
          packHash: 'pack-hash',
          signatureType: 'AUDITOR_ATTESTATION',
          signedBy: 'user-2',
          signedAt: '2025-02-20T14:00:00.000Z',
        },
      ];

      const mockPack = {
        id: mockPackId,
        signatures: mockSignatures,
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const signatures = await digitalSignatureService.getPackSignatures(mockPackId);

      expect(signatures).toHaveLength(2);
      expect(signatures).toEqual(mockSignatures);
    });

    it('should return empty array if pack not found', async () => {
      mockFromFn.mockReturnValueOnce(createPackQueryMock(null));

      const signatures = await digitalSignatureService.getPackSignatures(mockPackId);

      expect(signatures).toEqual([]);
    });

    it('should return empty array if no signatures', async () => {
      const mockPack = {
        id: mockPackId,
        signatures: [],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const signatures = await digitalSignatureService.getPackSignatures(mockPackId);

      expect(signatures).toEqual([]);
    });
  });

  describe('getSignatureStats', () => {
    it('should return statistics for pack with multiple signatures', async () => {
      const mockSignatures = [
        {
          id: 'sig-1',
          signatureType: 'INTERNAL',
          signedAt: '2025-02-20T10:00:00.000Z',
        },
        {
          id: 'sig-2',
          signatureType: 'INTERNAL',
          signedAt: '2025-02-20T11:00:00.000Z',
        },
        {
          id: 'sig-3',
          signatureType: 'AUDITOR_ATTESTATION',
          signedAt: '2025-02-20T14:00:00.000Z',
        },
      ];

      const mockPack = {
        id: mockPackId,
        signatures: mockSignatures,
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const stats = await digitalSignatureService.getSignatureStats(mockPackId);

      expect(stats).toEqual({
        totalSignatures: 3,
        internalSignatures: 2,
        auditorSignatures: 1,
        firstSignedAt: '2025-02-20T10:00:00.000Z',
        lastSignedAt: '2025-02-20T14:00:00.000Z',
      });
    });

    it('should return zero stats if no signatures', async () => {
      const mockPack = {
        id: mockPackId,
        signatures: [],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const stats = await digitalSignatureService.getSignatureStats(mockPackId);

      expect(stats).toEqual({
        totalSignatures: 0,
        internalSignatures: 0,
        auditorSignatures: 0,
      });
    });
  });

  describe('hasAuditorAttestation', () => {
    it('should return true if pack has auditor signature', async () => {
      const mockSignatures = [
        {
          id: 'sig-1',
          signatureType: 'INTERNAL',
        },
        {
          id: 'sig-2',
          signatureType: 'AUDITOR_ATTESTATION',
        },
      ];

      const mockPack = {
        id: mockPackId,
        signatures: mockSignatures,
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const hasAttestation = await digitalSignatureService.hasAuditorAttestation(mockPackId);

      expect(hasAttestation).toBe(true);
    });

    it('should return false if pack has no auditor signature', async () => {
      const mockSignatures = [
        {
          id: 'sig-1',
          signatureType: 'INTERNAL',
        },
      ];

      const mockPack = {
        id: mockPackId,
        signatures: mockSignatures,
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const hasAttestation = await digitalSignatureService.hasAuditorAttestation(mockPackId);

      expect(hasAttestation).toBe(false);
    });
  });

  describe('getSignatureChain', () => {
    it('should return signature chain with user details', async () => {
      const mockSignatures = [
        {
          id: 'sig-1',
          packId: mockPackId,
          signatureHash: 'hash-1',
          packHash: 'pack-hash',
          signatureType: 'INTERNAL',
          signedBy: 'user-1',
          signedAt: '2025-02-20T10:00:00.000Z',
        },
        {
          id: 'sig-2',
          packId: mockPackId,
          signatureHash: 'hash-2',
          packHash: 'pack-hash',
          signatureType: 'AUDITOR_ATTESTATION',
          signedBy: 'user-2',
          signedAt: '2025-02-20T14:00:00.000Z',
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
        },
        {
          id: 'user-2',
          full_name: 'Jane Smith',
          email: 'jane@example.com',
        },
      ];

      const mockPack = {
        id: mockPackId,
        signatures: mockSignatures,
      };

      const userQueryMock = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue(
            Promise.resolve({ data: mockUsers })
          ),
        }),
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));
      mockFromFn.mockReturnValueOnce(userQueryMock);

      const chain = await digitalSignatureService.getSignatureChain(mockPackId);

      expect(chain).toHaveLength(2);
      expect(chain[0]).toMatchObject({
        id: 'sig-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
      });
      expect(chain[1]).toMatchObject({
        id: 'sig-2',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
      });
    });

    it('should return empty array if no signatures', async () => {
      const mockPack = {
        id: mockPackId,
        signatures: [],
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));

      const chain = await digitalSignatureService.getSignatureChain(mockPackId);

      expect(chain).toEqual([]);
    });

    it('should handle missing user data gracefully', async () => {
      const mockSignatures = [
        {
          id: 'sig-1',
          signedBy: 'user-1',
          signatureType: 'INTERNAL',
          signedAt: '2025-02-20T10:00:00.000Z',
        },
      ];

      const mockPack = {
        id: mockPackId,
        signatures: mockSignatures,
      };

      const userQueryMock = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue(
            Promise.resolve({ data: [] })
          ),
        }),
      };

      mockFromFn.mockReturnValueOnce(createPackQueryMock(mockPack));
      mockFromFn.mockReturnValueOnce(userQueryMock);

      const chain = await digitalSignatureService.getSignatureChain(mockPackId);

      expect(chain).toHaveLength(1);
      expect(chain[0].userName).toBeUndefined();
      expect(chain[0].userEmail).toBeUndefined();
    });
  });
});
