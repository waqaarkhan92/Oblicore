/**
 * Pack Verification Service Tests
 */

import { PackVerificationService } from '@/lib/services/pack-verification-service';
import { createHash } from 'crypto';

describe('PackVerificationService', () => {
  let service: PackVerificationService;

  beforeEach(() => {
    service = new PackVerificationService();
  });

  describe('generateContentHash', () => {
    it('should generate SHA-256 hash from buffer', () => {
      const content = 'Test pack content';
      const buffer = Buffer.from(content);

      const hash = service.generateContentHash(buffer);

      // Verify hash is a valid hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/);

      // Verify hash is consistent
      const hash2 = service.generateContentHash(buffer);
      expect(hash).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const buffer1 = Buffer.from('Content A');
      const buffer2 = Buffer.from('Content B');

      const hash1 = service.generateContentHash(buffer1);
      const hash2 = service.generateContentHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });

    it('should match expected SHA-256 hash', () => {
      const content = 'Hello, World!';
      const buffer = Buffer.from(content);

      const hash = service.generateContentHash(buffer);

      // Expected SHA-256 hash for "Hello, World!"
      const expectedHash = createHash('sha256').update(content).digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('');

      const hash = service.generateContentHash(buffer);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'); // SHA-256 of empty string
    });

    it('should handle large buffers', () => {
      const largeContent = 'A'.repeat(1024 * 1024); // 1MB of 'A's
      const buffer = Buffer.from(largeContent);

      const hash = service.generateContentHash(buffer);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code as data URL', async () => {
      const packId = '123e4567-e89b-12d3-a456-426614174000';

      const qrCodeDataUrl = await service.generateQRCode(packId);

      // Verify it's a data URL
      expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      // Verify it contains base64 data
      const base64Data = qrCodeDataUrl.split(',')[1];
      expect(base64Data).toBeTruthy();
      expect(base64Data.length).toBeGreaterThan(0);
    });

    it('should generate valid PNG data URL', async () => {
      const packId = '123e4567-e89b-12d3-a456-426614174000';

      const qrCodeDataUrl = await service.generateQRCode(packId);

      // Decode base64 and check PNG signature
      const base64Data = qrCodeDataUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4E);
      expect(buffer[3]).toBe(0x47);
    });

    it('should generate different QR codes for different pack IDs', async () => {
      const packId1 = '123e4567-e89b-12d3-a456-426614174000';
      const packId2 = '223e4567-e89b-12d3-a456-426614174000';

      const qr1 = await service.generateQRCode(packId1);
      const qr2 = await service.generateQRCode(packId2);

      expect(qr1).not.toBe(qr2);
    });

    it('should generate same QR code for same pack ID', async () => {
      const packId = '123e4567-e89b-12d3-a456-426614174000';

      const qr1 = await service.generateQRCode(packId);
      const qr2 = await service.generateQRCode(packId);

      expect(qr1).toBe(qr2);
    });

    it('should handle invalid pack ID format', async () => {
      const invalidPackId = 'invalid-pack-id';

      // Should still generate QR code (service doesn't validate format)
      const qrCodeDataUrl = await service.generateQRCode(invalidPackId);

      expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('Hash consistency and security', () => {
    it('should detect content tampering', () => {
      const originalContent = 'Original pack content with important data';
      const tamperedContent = 'Original pack content with tampered data';

      const originalBuffer = Buffer.from(originalContent);
      const tamperedBuffer = Buffer.from(tamperedContent);

      const originalHash = service.generateContentHash(originalBuffer);
      const tamperedHash = service.generateContentHash(tamperedBuffer);

      expect(originalHash).not.toBe(tamperedHash);
    });

    it('should detect even small changes', () => {
      const original = 'Content';
      const modified = 'content'; // Only case change

      const hash1 = service.generateContentHash(Buffer.from(original));
      const hash2 = service.generateContentHash(Buffer.from(modified));

      expect(hash1).not.toBe(hash2);
    });

    it('should be deterministic across multiple runs', () => {
      const content = 'Deterministic test content';
      const buffer = Buffer.from(content);

      const hashes = Array.from({ length: 10 }, () =>
        service.generateContentHash(buffer)
      );

      // All hashes should be identical
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical pack verification workflow', async () => {
      const packId = '123e4567-e89b-12d3-a456-426614174000';
      const packContent = 'Mock PDF content for pack verification';
      const packBuffer = Buffer.from(packContent);

      // Step 1: Generate content hash
      const contentHash = service.generateContentHash(packBuffer);
      expect(contentHash).toBeTruthy();

      // Step 2: Generate QR code
      const qrCode = await service.generateQRCode(packId);
      expect(qrCode).toMatch(/^data:image\/png;base64,/);

      // Step 3: Verify hash consistency
      const verificationHash = service.generateContentHash(packBuffer);
      expect(verificationHash).toBe(contentHash);
    });

    it('should detect tampering in verification workflow', async () => {
      const packId = '123e4567-e89b-12d3-a456-426614174000';
      const originalContent = 'Original pack content';
      const tamperedContent = 'Tampered pack content';

      // Generate hash from original
      const originalHash = service.generateContentHash(Buffer.from(originalContent));

      // Try to verify with tampered content
      const tamperedHash = service.generateContentHash(Buffer.from(tamperedContent));

      // Hashes should not match
      expect(tamperedHash).not.toBe(originalHash);
    });
  });

  describe('Error handling', () => {
    it('should handle QR code generation errors gracefully', async () => {
      // Test with extremely long pack ID that might cause issues
      const extremelyLongId = 'a'.repeat(10000);

      try {
        await service.generateQRCode(extremelyLongId);
        // Should either succeed or throw a proper error
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to generate QR code');
      }
    });
  });
});
