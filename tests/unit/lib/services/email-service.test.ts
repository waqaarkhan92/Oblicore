/**
 * Email Service Tests
 * Comprehensive tests for lib/services/email-service.ts
 * Target: 100% coverage
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

describe('email-service', () => {
  let mockResendSend: jest.Mock;
  let emailService: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    jest.resetModules();

    // Save original env
    originalEnv = { ...process.env };

    // Set up test environment variables
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.RESEND_FROM_EMAIL = 'test@ecocomply.com';

    // Create mock function for Resend
    mockResendSend = jest.fn();

    // Mock Resend module
    jest.doMock('resend', () => ({
      Resend: jest.fn().mockImplementation(() => ({
        emails: {
          send: mockResendSend,
        },
      })),
    }));

    // Mock env module
    jest.doMock('@/lib/env', () => ({
      env: {
        RESEND_API_KEY: 'test-api-key',
        RESEND_FROM_EMAIL: 'test@ecocomply.com',
      },
    }));

    const module = await import('@/lib/services/email-service');
    emailService = module;
  });

  afterEach(() => {
    jest.resetModules();
    // Restore original env
    process.env = originalEnv;
  });

  describe('sendEmail', () => {
    it('should send email with correct recipient', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['recipient@example.com'],
        })
      );
    });

    it('should send email with multiple recipients', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['recipient1@example.com', 'recipient2@example.com'],
        })
      );
    });

    it('should send email with correct subject', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Important Notification',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Important Notification',
        })
      );
    });

    it('should send email with correct HTML body', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const htmlContent = '<h1>Hello</h1><p>This is a test email</p>';

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: htmlContent,
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: htmlContent,
        })
      );
    });

    it('should send email with provided text body', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>HTML version</p>',
        text: 'Plain text version',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Plain text version',
        })
      );
    });

    it('should generate plain text from HTML if text not provided', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello World</h1><p>This is a test</p>',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello WorldThis is a test',
        })
      );
    });

    it('should use default from address if not provided', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@ecocomply.com',
        })
      );
    });

    it('should use custom from address if provided', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        from: 'custom@example.com',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@example.com',
        })
      );
    });

    it('should include replyTo if provided', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        replyTo: 'support@ecocomply.com',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'support@ecocomply.com',
        })
      );
    });

    it('should return success response with messageId', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-abc-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result).toEqual({
        success: true,
        messageId: 'email-abc-123',
      });
    });

    it('should handle Resend API errors gracefully', async () => {
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle Resend API error without message', async () => {
      mockResendSend.mockResolvedValue({
        data: null,
        error: {},
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resend API error');
    });

    it('should handle thrown exceptions gracefully', async () => {
      mockResendSend.mockRejectedValue(new Error('Network error'));

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle thrown exceptions without message', async () => {
      mockResendSend.mockRejectedValue(new Error());

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resend API error');
    });

    it('should return error if RESEND_API_KEY is not configured', async () => {
      // Reset modules and reimport without API key
      jest.resetModules();
      delete process.env.RESEND_API_KEY;

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: {
            send: mockResendSend,
          },
        })),
      }));

      jest.doMock('@/lib/env', () => ({
        env: {
          RESEND_API_KEY: '',
          RESEND_FROM_EMAIL: '',
        },
      }));

      const moduleWithoutKey = await import('@/lib/services/email-service');

      const result = await moduleWithoutKey.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured - RESEND_API_KEY required');
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it('should handle HTML with special characters', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const htmlWithSpecialChars = '<p>Hello &amp; goodbye &lt;test&gt; &quot;quotes&quot; &#39;apostrophe&#39; &nbsp;</p>';

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: htmlWithSpecialChars,
      });

      expect(result.success).toBe(true);
      // Verify plain text conversion strips HTML entities
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Hello & goodbye <test> \"quotes\" 'apostrophe'",
        })
      );
    });

    it('should handle complex HTML with nested tags', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const complexHtml = `
        <div>
          <h1>Header</h1>
          <p>Paragraph with <strong>bold</strong> and <em>italic</em> text</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: complexHtml,
      });

      expect(result.success).toBe(true);
      // Verify text is extracted
      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.text).toContain('Header');
      expect(callArgs.text).toContain('bold');
      expect(callArgs.text).toContain('italic');
    });

    it('should handle empty HTML gracefully', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '',
          text: '',
        })
      );
    });

    it('should handle very long email content', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const longContent = '<p>' + 'A'.repeat(10000) + '</p>';

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: longContent,
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalled();
    });

    it('should handle email with only whitespace in HTML', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '   <p>   </p>   ',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '',
        })
      );
    });

    it('should use fallback from email if env not set', async () => {
      jest.resetModules();
      delete process.env.RESEND_FROM_EMAIL;
      process.env.RESEND_API_KEY = 'test-api-key';

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: {
            send: mockResendSend,
          },
        })),
      }));

      jest.doMock('@/lib/env', () => ({
        env: {
          RESEND_API_KEY: 'test-api-key',
          RESEND_FROM_EMAIL: '',
        },
      }));

      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const moduleWithoutFromEmail = await import('@/lib/services/email-service');

      const result = await moduleWithoutFromEmail.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@ecocomply.com',
        })
      );
    });

    it('should handle exception during module import', async () => {
      jest.resetModules();

      // Mock Resend to throw during instantiation
      jest.doMock('resend', () => {
        throw new Error('Module load error');
      });

      jest.doMock('@/lib/env', () => ({
        env: {
          RESEND_API_KEY: 'test-api-key',
          RESEND_FROM_EMAIL: 'test@ecocomply.com',
        },
      }));

      const moduleWithError = await import('@/lib/services/email-service');

      const result = await moduleWithError.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Module load error');
    });
  });

  describe('HTML to Text Conversion', () => {
    it('should strip basic HTML tags', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Hello <b>World</b></p>',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello World',
        })
      );
    });

    it('should convert &nbsp; to space', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Hello&nbsp;World</p>',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello World',
        })
      );
    });

    it('should convert &amp; to &', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Rock &amp; Roll</p>',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Rock & Roll',
        })
      );
    });

    it('should convert &lt; to <', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>5 &lt; 10</p>',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '5 < 10',
        })
      );
    });

    it('should convert &gt; to >', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>10 &gt; 5</p>',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '10 > 5',
        })
      );
    });

    it('should convert &quot; to "', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>He said &quot;Hello&quot;</p>',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'He said "Hello"',
        })
      );
    });

    it('should convert &#39; to apostrophe', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>It&#39;s working</p>',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "It's working",
        })
      );
    });

    it('should trim whitespace from converted text', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '   <p>   Hello World   </p>   ',
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello World',
        })
      );
    });
  });
});
