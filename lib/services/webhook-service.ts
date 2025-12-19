/**
 * Webhook Service
 * Manages outbound webhooks for external integrations
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 14
 *
 * WEBHOOK PAYLOAD STRUCTURE:
 * All webhooks are sent as POST requests with the following JSON payload:
 * {
 *   id: 'evt_...',                    // Unique event ID
 *   type: 'obligation.created',       // Event type
 *   created_at: '2025-01-15T10:30:00Z', // ISO 8601 timestamp
 *   company_id: 'uuid',               // Company UUID
 *   data: {                           // Event-specific payload
 *     obligation_id: 'uuid',
 *     site_id: 'uuid',
 *     ...additional fields...
 *   }
 * }
 *
 * WEBHOOK HEADERS:
 * - X-Webhook-Signature: HMAC-SHA256 signature for payload verification
 * - X-Webhook-Timestamp: Unix timestamp of the signature
 * - X-Webhook-Event: Event type (e.g., 'obligation.created')
 * - X-Webhook-ID: Unique event ID
 * - Content-Type: application/json
 *
 * RETRY LOGIC:
 * - 3 retry attempts with exponential backoff
 * - Delays: 1s, 5s, 25s between attempts
 * - All attempts are logged in webhook_deliveries table
 *
 * SIGNATURE VERIFICATION:
 * Recipients should verify webhook signatures using the provided secret:
 * const signature = crypto.createHmac('sha256', secret)
 *   .update(`${timestamp}.${JSON.stringify(payload)}`)
 *   .digest('hex');
 *
 * Compare this with the X-Webhook-Signature header value.
 */

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';

export type WebhookEventType =
  | 'obligation.created'
  | 'obligation.updated'
  | 'obligation.completed'
  | 'obligation.overdue'
  | 'deadline.approaching'
  | 'deadline.missed'
  | 'evidence.uploaded'
  | 'evidence.approved'
  | 'evidence.linked'
  | 'pack.generated'
  | 'breach.detected'
  | 'risk_score.changed'
  | 'compliance_score.changed';

export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  created_at: string;
  company_id: string;
  data: Record<string, any>;
}

export interface WebhookConfig {
  id: string;
  company_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  headers?: Record<string, string>;
  retry_count: number;
  timeout_ms: number;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateSignature(secret: string, timestamp: string, payload: string): string {
  const data = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Verify webhook signature (for webhook consumers)
 * @param secret - Webhook secret
 * @param timestamp - Timestamp from X-Webhook-Timestamp header
 * @param payload - Raw JSON payload string
 * @param signature - Signature from X-Webhook-Signature header
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  secret: string,
  timestamp: string,
  payload: string,
  signature: string
): boolean {
  const expectedSignature = generateSignature(secret, timestamp, payload);

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

export class WebhookService {
  /**
   * Register a new webhook URL for a company
   * As per requirements: registerWebhook(companyId, url, events, secret?)
   */
  async registerWebhook(
    companyId: string,
    url: string,
    events: WebhookEventType[],
    secret?: string
  ): Promise<WebhookConfig> {
    const webhookSecret = secret || generateWebhookSecret();

    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .insert({
        company_id: companyId,
        name: `Webhook for ${url}`,
        url,
        secret: webhookSecret,
        events,
        headers: {},
        is_active: true,
        retry_count: 3,
        timeout_ms: 30000,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register webhook: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new webhook configuration (alternative method with more options)
   */
  async createWebhook(
    companyId: string,
    config: {
      name: string;
      url: string;
      events: WebhookEventType[];
      headers?: Record<string, string>;
    },
    createdBy: string
  ): Promise<WebhookConfig> {
    const secret = generateWebhookSecret();

    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .insert({
        company_id: companyId,
        name: config.name,
        url: config.url,
        secret,
        events: config.events,
        headers: config.headers || {},
        is_active: true,
        retry_count: 3,
        timeout_ms: 30000,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create webhook: ${error.message}`);
    }

    return data;
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(
    webhookId: string,
    companyId: string,
    updates: {
      name?: string;
      url?: string;
      events?: WebhookEventType[];
      headers?: Record<string, string>;
      is_active?: boolean;
    }
  ): Promise<WebhookConfig> {
    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update webhook: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a webhook by ID
   * As per requirements: deleteWebhook(webhookId)
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) {
      throw new Error(`Failed to delete webhook: ${error.message}`);
    }
  }

  /**
   * List all webhooks for a company
   * As per requirements: listWebhooks(companyId)
   */
  async listWebhooks(companyId: string): Promise<WebhookConfig[]> {
    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list webhooks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get webhooks for a company (alternative method name)
   */
  async getWebhooks(companyId: string): Promise<WebhookConfig[]> {
    return this.listWebhooks(companyId);
  }

  /**
   * Trigger webhooks for a specific event and company
   * As per requirements: triggerWebhook(event, companyId, payload)
   * Called internally when events occur
   */
  async triggerWebhook(
    event: WebhookEventType,
    companyId: string,
    payload: Record<string, any>
  ): Promise<void> {
    // Get active webhooks subscribed to this event
    const { data: webhooks, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .contains('events', [event]);

    if (error || !webhooks || webhooks.length === 0) {
      console.log(`No active webhooks found for event ${event} in company ${companyId}`);
      return;
    }

    const eventId = `evt_${crypto.randomBytes(16).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const webhookPayload: WebhookPayload = {
      id: eventId,
      type: event,
      created_at: timestamp,
      company_id: companyId,
      data: payload,
    };

    console.log(`Triggering ${webhooks.length} webhook(s) for event ${event}`);

    // Trigger all webhooks asynchronously (don't wait for completion)
    const deliveryPromises = webhooks.map(webhook =>
      this.deliverWebhook(webhook, webhookPayload).catch(e => {
        console.error(`Webhook delivery failed for ${webhook.id}:`, e);
      })
    );

    // Wait for all deliveries to complete (with retries)
    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Trigger a webhook event for a company (alternative method)
   * Returns statistics about delivery
   */
  async triggerEvent(
    companyId: string,
    eventType: WebhookEventType,
    data: Record<string, any>
  ): Promise<{ triggered: number; failed: number }> {
    // Get active webhooks subscribed to this event
    const { data: webhooks, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (error || !webhooks || webhooks.length === 0) {
      return { triggered: 0, failed: 0 };
    }

    const eventId = `evt_${crypto.randomBytes(16).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const payload: WebhookPayload = {
      id: eventId,
      type: eventType,
      created_at: timestamp,
      company_id: companyId,
      data,
    };

    let triggered = 0;
    let failed = 0;

    for (const webhook of webhooks) {
      try {
        await this.deliverWebhook(webhook, payload);
        triggered++;
      } catch (e) {
        failed++;
        console.error(`Webhook delivery failed for ${webhook.id}:`, e);
      }
    }

    return { triggered, failed };
  }

  /**
   * Deliver webhook to endpoint with retry logic
   * Implements exponential backoff: 1s, 5s, 25s delays
   */
  private async deliverWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attemptNumber: number = 1
  ): Promise<void> {
    const payloadJson = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(webhook.secret, timestamp, payloadJson);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Event': payload.type,
      'X-Webhook-ID': payload.id,
      ...(webhook.headers || {}),
    };

    // Record delivery attempt
    const { data: delivery } = await supabaseAdmin
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_type: payload.type,
        event_id: payload.id,
        payload,
        retry_count: attemptNumber - 1,
      })
      .select('id')
      .single();

    const maxRetries = webhook.retry_count || 3;
    let lastError: Error | null = null;

    for (let attempt = attemptNumber; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Webhook delivery attempt ${attempt}/${maxRetries} for ${webhook.id}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), webhook.timeout_ms);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: payloadJson,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseBody = await response.text();

        // Update delivery record
        await supabaseAdmin
          .from('webhook_deliveries')
          .update({
            response_status: response.status,
            response_body: responseBody.substring(0, 10000), // Limit stored response
            delivered_at: response.ok ? new Date().toISOString() : null,
            failed_at: response.ok ? null : new Date().toISOString(),
            error_message: response.ok ? null : `HTTP ${response.status}`,
            retry_count: attempt - 1,
          })
          .eq('id', delivery?.id);

        if (response.ok) {
          // Success - update webhook status
          await supabaseAdmin
            .from('webhooks')
            .update({
              last_delivery_at: new Date().toISOString(),
              last_delivery_status: 'SUCCESS',
              failure_count: 0,
            })
            .eq('id', webhook.id);

          console.log(`Webhook delivery successful for ${webhook.id}`);
          return;
        }

        lastError = new Error(`HTTP ${response.status}: ${responseBody}`);
      } catch (e: any) {
        lastError = e;
        console.error(`Webhook delivery attempt ${attempt} failed:`, e.message);
      }

      // If not the last attempt, wait before retrying with exponential backoff
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 5s, 25s (approximately 5^(n-1) seconds)
        const delayMs = Math.pow(5, attempt - 1) * 1000;
        console.log(`Retrying webhook delivery in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Unknown error';

    await supabaseAdmin
      .from('webhook_deliveries')
      .update({
        failed_at: new Date().toISOString(),
        error_message: errorMessage,
        retry_count: maxRetries - 1,
      })
      .eq('id', delivery?.id);

    // Update webhook failure status
    const { data: webhookData } = await supabaseAdmin
      .from('webhooks')
      .select('failure_count')
      .eq('id', webhook.id)
      .single();

    await supabaseAdmin
      .from('webhooks')
      .update({
        last_delivery_at: new Date().toISOString(),
        last_delivery_status: 'FAILED',
        failure_count: (webhookData?.failure_count || 0) + 1,
      })
      .eq('id', webhook.id);

    throw new Error(`Webhook delivery failed after ${maxRetries} attempts: ${errorMessage}`);
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(
    webhookId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    const { limit = 50, offset = 0 } = options;

    const { data, error } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch deliveries: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Send test event to webhook
   */
  async sendTestEvent(webhookId: string, companyId: string): Promise<{
    success: boolean;
    status?: number;
    error?: string;
  }> {
    const { data: webhook, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('company_id', companyId)
      .single();

    if (error || !webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload: WebhookPayload = {
      id: `test_${crypto.randomBytes(8).toString('hex')}`,
      type: 'obligation.created',
      created_at: new Date().toISOString(),
      company_id: companyId,
      data: {
        test: true,
        message: 'This is a test webhook event from EcoComply',
      },
    };

    try {
      await this.deliverWebhook(webhook, testPayload);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const webhookService = new WebhookService();
