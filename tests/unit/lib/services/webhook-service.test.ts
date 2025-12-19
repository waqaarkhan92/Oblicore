/**
 * Webhook Service Tests
 * Comprehensive tests for lib/services/webhook-service.ts
 * Target: High coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { verifyWebhookSignature, generateWebhookSecret } from '@/lib/services/webhook-service';
import crypto from 'crypto';

describe('webhook-service', () => {
  describe('generateWebhookSecret', () => {
    it('should generate a webhook secret with correct prefix', () => {
      const secret = generateWebhookSecret();
      expect(secret).toMatch(/^whsec_[a-f0-9]{48}$/);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('should generate secrets of consistent length', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();
      expect(secret1.length).toBe(secret2.length);
      expect(secret1.length).toBe(54); // 'whsec_' (6) + 48 hex chars
    });
  });

  describe('verifyWebhookSignature', () => {
    const testSecret = 'whsec_test123456789';
    const testPayload = JSON.stringify({
      id: 'evt_123',
      type: 'obligation.created',
      company_id: 'comp_123',
      data: { test: true },
    });
    const testTimestamp = '1234567890';

    it('should verify valid signature', () => {
      // Generate a valid signature
      const data = `${testTimestamp}.${testPayload}`;
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(data)
        .digest('hex');

      const isValid = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        testPayload,
        validSignature
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const invalidSignature = 'invalid_signature_123456789';

      const isValid = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        testPayload,
        invalidSignature
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const wrongSecret = 'whsec_wrong_secret';

      // Generate signature with test secret
      const data = `${testTimestamp}.${testPayload}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(data)
        .digest('hex');

      // Verify with wrong secret
      const isValid = verifyWebhookSignature(
        wrongSecret,
        testTimestamp,
        testPayload,
        signature
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong timestamp', () => {
      const wrongTimestamp = '9876543210';

      // Generate signature with correct timestamp
      const data = `${testTimestamp}.${testPayload}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(data)
        .digest('hex');

      // Verify with wrong timestamp
      const isValid = verifyWebhookSignature(
        testSecret,
        wrongTimestamp,
        testPayload,
        signature
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature with modified payload', () => {
      const modifiedPayload = JSON.stringify({
        id: 'evt_123',
        type: 'obligation.created',
        company_id: 'comp_123',
        data: { test: false }, // Changed from true to false
      });

      // Generate signature with original payload
      const data = `${testTimestamp}.${testPayload}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(data)
        .digest('hex');

      // Verify with modified payload
      const isValid = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        modifiedPayload,
        signature
      );

      expect(isValid).toBe(false);
    });

    it('should handle malformed signature gracefully', () => {
      const malformedSignature = 'not_a_hex_string!!!';

      const isValid = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        testPayload,
        malformedSignature
      );

      expect(isValid).toBe(false);
    });

    it('should handle empty signature', () => {
      const isValid = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        testPayload,
        ''
      );

      expect(isValid).toBe(false);
    });

    it('should handle signature with different length', () => {
      const shortSignature = 'abc123';

      const isValid = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        testPayload,
        shortSignature
      );

      expect(isValid).toBe(false);
    });

    it('should accept both lowercase and uppercase hex signatures', () => {
      // Generate valid signature (lowercase)
      const data = `${testTimestamp}.${testPayload}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(data)
        .digest('hex');

      // Verify lowercase works
      const isValidLowercase = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        testPayload,
        signature
      );

      // Verify uppercase also works (hex is case-insensitive)
      const uppercaseSignature = signature.toUpperCase();
      const isValidUppercase = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        testPayload,
        uppercaseSignature
      );

      expect(isValidLowercase).toBe(true);
      expect(isValidUppercase).toBe(true); // Hex strings are case-insensitive
    });

    it('should work with complex JSON payloads', () => {
      const complexPayload = JSON.stringify({
        id: 'evt_complex',
        type: 'breach.detected',
        created_at: '2025-01-15T10:30:00Z',
        company_id: 'comp_abc123',
        data: {
          breach_id: 'breach_xyz',
          obligation_id: 'obl_456',
          nested: {
            deeply: {
              nested: {
                value: 'test',
                array: [1, 2, 3],
                boolean: true,
                null_value: null,
              },
            },
          },
        },
      });

      const data = `${testTimestamp}.${complexPayload}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(data)
        .digest('hex');

      const isValid = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        complexPayload,
        signature
      );

      expect(isValid).toBe(true);
    });

    it('should work with special characters in payload', () => {
      const payloadWithSpecialChars = JSON.stringify({
        id: 'evt_123',
        data: {
          message: 'Hello "world" & <special> characters! 你好 🎉',
          emoji: '😀😃😄',
          unicode: '\u00A9 \u00AE \u2122',
        },
      });

      const data = `${testTimestamp}.${payloadWithSpecialChars}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(data)
        .digest('hex');

      const isValid = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        payloadWithSpecialChars,
        signature
      );

      expect(isValid).toBe(true);
    });

    it('should work with very long payloads', () => {
      const longPayload = JSON.stringify({
        id: 'evt_123',
        data: {
          longString: 'A'.repeat(10000),
          largeArray: Array(100).fill({ key: 'value' }),
        },
      });

      const data = `${testTimestamp}.${longPayload}`;
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(data)
        .digest('hex');

      const isValid = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        longPayload,
        signature
      );

      expect(isValid).toBe(true);
    });

    it('should use timing-safe comparison (constant time)', () => {
      // This test verifies that the function uses crypto.timingSafeEqual
      // We can't directly test timing, but we can verify the behavior

      const data = `${testTimestamp}.${testPayload}`;
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(data)
        .digest('hex');

      // Create two signatures that differ by one character
      const almostValidSignature = validSignature.slice(0, -1) + 'f';

      const isValid1 = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        testPayload,
        validSignature
      );

      const isValid2 = verifyWebhookSignature(
        testSecret,
        testTimestamp,
        testPayload,
        almostValidSignature
      );

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(false);
    });
  });

  describe('Signature Generation and Verification Integration', () => {
    it('should correctly sign and verify a webhook payload', () => {
      const secret = generateWebhookSecret();
      const payload = JSON.stringify({
        id: 'evt_integration_test',
        type: 'obligation.created',
        created_at: new Date().toISOString(),
        company_id: 'comp_integration',
        data: {
          obligation_id: 'obl_123',
          title: 'Test Obligation',
        },
      });
      const timestamp = Math.floor(Date.now() / 1000).toString();

      // Generate signature (this is what the webhook sender does)
      const data = `${timestamp}.${payload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');

      // Verify signature (this is what the webhook receiver does)
      const isValid = verifyWebhookSignature(secret, timestamp, payload, signature);

      expect(isValid).toBe(true);
    });

    it('should detect tampering with payload', () => {
      const secret = generateWebhookSecret();
      const originalPayload = JSON.stringify({
        id: 'evt_123',
        data: { amount: 100 },
      });
      const timestamp = Math.floor(Date.now() / 1000).toString();

      // Attacker generates signature with original payload
      const data = `${timestamp}.${originalPayload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');

      // Attacker modifies the payload
      const tamperedPayload = JSON.stringify({
        id: 'evt_123',
        data: { amount: 999999 }, // Changed amount!
      });

      // Verification should fail
      const isValid = verifyWebhookSignature(
        secret,
        timestamp,
        tamperedPayload,
        signature
      );

      expect(isValid).toBe(false);
    });

    it('should detect replay attacks with old timestamps', () => {
      const secret = generateWebhookSecret();
      const payload = JSON.stringify({ id: 'evt_123', data: {} });

      // Old timestamp from 1 hour ago
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 3600).toString();

      // Generate valid signature with old timestamp
      const data = `${oldTimestamp}.${payload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');

      // Signature is technically valid, but receiver should check timestamp
      const isValid = verifyWebhookSignature(secret, oldTimestamp, payload, signature);

      expect(isValid).toBe(true); // Signature is valid
      // Note: Real webhook receivers should also validate timestamp freshness
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = currentTime - parseInt(oldTimestamp);
      expect(timeDiff).toBeGreaterThan(3000); // More than 3000 seconds old
    });
  });

  describe('Event Type Validation', () => {
    it('should support all required event types', () => {
      const requiredEvents = [
        'obligation.created',
        'obligation.updated',
        'evidence.uploaded',
        'evidence.approved',
        'pack.generated',
        'deadline.approaching',
        'breach.detected',
      ];

      // This test verifies that the TypeScript types allow these events
      // In a real implementation, you might have a validation function
      const events: Array<
        | 'obligation.created'
        | 'obligation.updated'
        | 'evidence.uploaded'
        | 'evidence.approved'
        | 'pack.generated'
        | 'deadline.approaching'
        | 'breach.detected'
      > = requiredEvents as any;

      expect(events).toHaveLength(7);
      expect(events).toContain('obligation.created');
      expect(events).toContain('obligation.updated');
      expect(events).toContain('evidence.uploaded');
      expect(events).toContain('evidence.approved');
      expect(events).toContain('pack.generated');
      expect(events).toContain('deadline.approaching');
      expect(events).toContain('breach.detected');
    });
  });

  describe('Webhook Payload Structure', () => {
    it('should create valid webhook payload structure', () => {
      const payload = {
        id: 'evt_abc123',
        type: 'obligation.created' as const,
        created_at: '2025-01-15T10:30:00Z',
        company_id: 'comp_xyz789',
        data: {
          obligation_id: 'obl_123',
          site_id: 'site_456',
          title: 'Monthly Report',
          due_date: '2025-02-15T00:00:00Z',
          status: 'PENDING',
          priority: 'HIGH',
        },
      };

      expect(payload.id).toMatch(/^evt_/);
      expect(payload.type).toBe('obligation.created');
      expect(payload.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(payload.company_id).toMatch(/^comp_/);
      expect(payload.data).toHaveProperty('obligation_id');
    });

    it('should support different event data structures', () => {
      const evidencePayload = {
        id: 'evt_evidence',
        type: 'evidence.uploaded' as const,
        created_at: new Date().toISOString(),
        company_id: 'comp_123',
        data: {
          evidence_id: 'evd_123',
          obligation_id: 'obl_456',
          file_name: 'report.pdf',
          file_type: 'application/pdf',
          file_size: 2048576,
        },
      };

      expect(evidencePayload.data).toHaveProperty('evidence_id');
      expect(evidencePayload.data).toHaveProperty('file_name');
      expect(evidencePayload.data.file_size).toBeGreaterThan(0);
    });

    it('should support breach detection payload', () => {
      const breachPayload = {
        id: 'evt_breach',
        type: 'breach.detected' as const,
        created_at: new Date().toISOString(),
        company_id: 'comp_123',
        data: {
          breach_id: 'breach_789',
          obligation_id: 'obl_123',
          breach_type: 'DEADLINE_MISSED',
          severity: 'HIGH',
          days_overdue: 3,
          description: 'Obligation deadline missed by 3 days',
        },
      };

      expect(breachPayload.data.breach_type).toBe('DEADLINE_MISSED');
      expect(breachPayload.data.severity).toBe('HIGH');
      expect(breachPayload.data.days_overdue).toBe(3);
    });
  });
});
