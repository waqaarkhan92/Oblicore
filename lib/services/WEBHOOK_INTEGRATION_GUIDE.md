# Webhook Service Integration Guide

## Overview

The EcoComply webhook service enables external systems to receive real-time notifications about events happening in the platform. This guide explains how to integrate webhook triggering into your services and how external systems can consume these webhooks.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Supported Events](#supported-events)
3. [Triggering Webhooks](#triggering-webhooks)
4. [Managing Webhooks](#managing-webhooks)
5. [Webhook Security](#webhook-security)
6. [Best Practices](#best-practices)
7. [Example Integrations](#example-integrations)

---

## Quick Start

### 1. Import the Webhook Service

```typescript
import { webhookService, WebhookEventType } from '@/lib/services';
```

### 2. Trigger a Webhook Event

```typescript
// After creating an obligation
await webhookService.triggerWebhook(
  'obligation.created',
  companyId,
  {
    obligation_id: obligation.id,
    site_id: obligation.site_id,
    title: obligation.title,
    due_date: obligation.due_date,
    status: obligation.status,
  }
);
```

### 3. Register a Webhook (for external systems)

```typescript
const webhook = await webhookService.registerWebhook(
  companyId,
  'https://example.com/webhooks/ecocomply',
  ['obligation.created', 'evidence.uploaded', 'breach.detected']
);

// Store the secret securely
console.log('Webhook Secret:', webhook.secret);
```

---

## Supported Events

The webhook service supports the following event types:

| Event Type | Description | When Triggered |
|------------|-------------|----------------|
| `obligation.created` | New obligation created | When a new compliance obligation is added |
| `obligation.updated` | Obligation updated | When obligation details are modified |
| `evidence.uploaded` | Evidence file uploaded | When supporting documentation is uploaded |
| `evidence.approved` | Evidence approved | When evidence passes review/validation |
| `pack.generated` | Compliance pack generated | When audit/regulator pack is created |
| `deadline.approaching` | Deadline warning | When obligation due date is approaching |
| `breach.detected` | Compliance breach | When a violation is detected |

---

## Triggering Webhooks

### Basic Usage

```typescript
await webhookService.triggerWebhook(
  event: WebhookEventType,
  companyId: string,
  payload: Record<string, any>
);
```

### Integration in Services

When adding webhook triggers to existing services, follow this pattern:

```typescript
// Example: obligation-service.ts
export async function createObligation(companyId: string, data: any) {
  // 1. Perform the main operation
  const obligation = await supabaseAdmin
    .from('obligations')
    .insert(data)
    .select()
    .single();

  // 2. Trigger webhook (non-blocking, errors logged but don't fail)
  webhookService.triggerWebhook(
    'obligation.created',
    companyId,
    {
      obligation_id: obligation.id,
      site_id: obligation.site_id,
      permit_id: obligation.permit_id,
      title: obligation.title,
      due_date: obligation.due_date,
      status: obligation.status,
      priority: obligation.priority,
    }
  ).catch(error => {
    console.error('Failed to trigger webhook:', error);
    // Don't throw - webhook failures shouldn't block operations
  });

  // 3. Return the result
  return obligation;
}
```

### Event-Specific Examples

#### Obligation Created
```typescript
await webhookService.triggerWebhook('obligation.created', companyId, {
  obligation_id: 'obl_123',
  site_id: 'site_456',
  permit_id: 'permit_789',
  title: 'Monthly emissions monitoring report',
  due_date: '2025-02-15T00:00:00Z',
  status: 'PENDING',
  priority: 'HIGH',
});
```

#### Evidence Uploaded
```typescript
await webhookService.triggerWebhook('evidence.uploaded', companyId, {
  evidence_id: 'evd_123',
  obligation_id: 'obl_456',
  file_name: 'emissions-report.pdf',
  file_type: 'application/pdf',
  file_size: 2048576,
  uploaded_by: 'user_789',
  uploaded_at: new Date().toISOString(),
});
```

#### Breach Detected
```typescript
await webhookService.triggerWebhook('breach.detected', companyId, {
  breach_id: 'breach_123',
  obligation_id: 'obl_456',
  permit_id: 'permit_789',
  breach_type: 'DEADLINE_MISSED',
  severity: 'HIGH',
  detected_at: new Date().toISOString(),
  description: 'Obligation deadline missed by 3 days',
  days_overdue: 3,
});
```

#### Pack Generated
```typescript
await webhookService.triggerWebhook('pack.generated', companyId, {
  pack_id: 'pack_123',
  pack_type: 'AUDIT',
  title: 'Q4 2024 Compliance Audit Pack',
  generated_at: new Date().toISOString(),
  generated_by: 'user_456',
  download_url: 'https://ecocomply.com/api/packs/pack_123/download',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});
```

---

## Managing Webhooks

### Register a Webhook

```typescript
const webhook = await webhookService.registerWebhook(
  companyId,
  'https://example.com/webhooks/ecocomply',
  ['obligation.created', 'evidence.uploaded'],
  'optional-custom-secret' // Auto-generated if not provided
);
```

### List Webhooks

```typescript
const webhooks = await webhookService.listWebhooks(companyId);

webhooks.forEach(webhook => {
  console.log(`${webhook.name}: ${webhook.url}`);
  console.log(`Events: ${webhook.events.join(', ')}`);
  console.log(`Active: ${webhook.is_active}`);
});
```

### Delete a Webhook

```typescript
await webhookService.deleteWebhook(webhookId);
```

### Update Webhook Configuration

```typescript
await webhookService.updateWebhook(webhookId, companyId, {
  events: ['obligation.created', 'breach.detected'],
  is_active: true,
  headers: {
    'Authorization': 'Bearer custom-token',
  },
});
```

### Test a Webhook

```typescript
const result = await webhookService.sendTestEvent(webhookId, companyId);

if (result.success) {
  console.log('Test webhook sent successfully!');
} else {
  console.error('Test failed:', result.error);
}
```

### View Delivery History

```typescript
const deliveries = await webhookService.getDeliveries(webhookId, {
  limit: 20,
  offset: 0,
});

deliveries.forEach(delivery => {
  console.log(`${delivery.event_type}: ${delivery.response_status}`);
  console.log(`Attempts: ${delivery.retry_count + 1}`);
  if (delivery.error_message) {
    console.log(`Error: ${delivery.error_message}`);
  }
});
```

---

## Webhook Security

### Signature Verification

All webhooks include an HMAC-SHA256 signature for verification:

#### Headers Sent
```
X-Webhook-Signature: <hmac-sha256-signature>
X-Webhook-Timestamp: <unix-timestamp>
X-Webhook-Event: <event-type>
X-Webhook-ID: <unique-event-id>
Content-Type: application/json
```

#### Verifying Signatures (Receiver Side)

```typescript
import { verifyWebhookSignature } from '@ecocomply/webhook-client';

// Express.js example
app.post('/webhooks/ecocomply', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = JSON.stringify(req.body);

  const secret = process.env.ECOCOMPLY_WEBHOOK_SECRET;

  const isValid = verifyWebhookSignature(
    secret,
    timestamp,
    rawBody,
    signature
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook...
  const event = req.body;
  console.log('Received:', event.type, event.data);

  res.status(200).json({ received: true });
});
```

#### Manual Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(secret, timestamp, payload, signature) {
  const data = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### Security Best Practices

1. **Always verify signatures** - Never process webhooks without signature verification
2. **Check timestamp freshness** - Reject webhooks older than 5 minutes to prevent replay attacks
3. **Use HTTPS only** - Only register webhook URLs using HTTPS
4. **Store secrets securely** - Use environment variables or secret managers
5. **Implement idempotency** - Handle duplicate deliveries gracefully
6. **Rate limit webhook endpoints** - Protect against abuse
7. **Log all webhook attempts** - Monitor for suspicious activity

---

## Best Practices

### 1. Non-Blocking Webhook Triggers

Always trigger webhooks asynchronously and don't let failures block main operations:

```typescript
// ✅ Good - Non-blocking
webhookService.triggerWebhook('obligation.created', companyId, data)
  .catch(error => console.error('Webhook failed:', error));

// ❌ Bad - Blocking
await webhookService.triggerWebhook('obligation.created', companyId, data);
```

### 2. Minimal Payload Data

Only include necessary data in webhook payloads:

```typescript
// ✅ Good - Essential data only
{
  obligation_id: 'obl_123',
  title: 'Monthly Report',
  due_date: '2025-02-15',
  status: 'PENDING',
}

// ❌ Bad - Too much data
{
  obligation_id: 'obl_123',
  title: 'Monthly Report',
  description: '...very long description...',
  full_permit_details: { /* huge object */ },
  all_evidence: [ /* large array */ ],
}
```

### 3. Consistent Payload Structure

Always use the standard webhook payload format:

```typescript
{
  id: 'evt_...',
  type: 'obligation.created',
  created_at: '2025-01-15T10:30:00Z',
  company_id: 'comp_...',
  data: {
    // Event-specific data
  }
}
```

### 4. Error Handling

```typescript
try {
  await webhookService.triggerWebhook(event, companyId, data);
} catch (error) {
  // Log but don't fail the operation
  console.error('Webhook trigger failed:', {
    event,
    companyId,
    error: error.message,
  });

  // Optional: Send to error monitoring service
  // errorMonitoring.captureException(error);
}
```

### 5. Webhook Receiver Implementation

```typescript
// Implement retry with exponential backoff
app.post('/webhooks/ecocomply', async (req, res) => {
  try {
    // 1. Verify signature
    if (!verifySignature(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Check timestamp (prevent replay attacks)
    const timestamp = parseInt(req.headers['x-webhook-timestamp']);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) { // 5 minutes
      return res.status(400).json({ error: 'Timestamp too old' });
    }

    // 3. Process webhook (with error handling)
    await processWebhook(req.body);

    // 4. Respond quickly (EcoComply will retry on failure)
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    // Return 5xx to trigger retry
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

---

## Example Integrations

### 1. Slack Notifications

```typescript
// Send Slack notification when breach detected
app.post('/webhooks/ecocomply', async (req, res) => {
  if (req.body.type === 'breach.detected') {
    const { breach_type, severity, description } = req.body.data;

    await slackClient.chat.postMessage({
      channel: '#compliance-alerts',
      text: `🚨 Compliance Breach Detected`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Severity:* ${severity}\n*Type:* ${breach_type}\n*Details:* ${description}`,
          },
        },
      ],
    });
  }

  res.status(200).json({ received: true });
});
```

### 2. Database Sync

```typescript
// Sync obligations to local database
app.post('/webhooks/ecocomply', async (req, res) => {
  if (req.body.type === 'obligation.created') {
    const { obligation_id, title, due_date, status } = req.body.data;

    await db.obligations.create({
      ecocomply_id: obligation_id,
      title,
      due_date: new Date(due_date),
      status,
      synced_at: new Date(),
    });
  }

  if (req.body.type === 'obligation.updated') {
    const { obligation_id, ...updates } = req.body.data;

    await db.obligations.update({
      where: { ecocomply_id: obligation_id },
      data: updates,
    });
  }

  res.status(200).json({ received: true });
});
```

### 3. Email Alerts

```typescript
// Send email when deadline approaching
app.post('/webhooks/ecocomply', async (req, res) => {
  if (req.body.type === 'deadline.approaching') {
    const { obligation_id, title, due_date, days_remaining } = req.body.data;

    await emailService.send({
      to: 'compliance-team@company.com',
      subject: `Deadline Alert: ${title}`,
      body: `
        Obligation: ${title}
        Due: ${due_date}
        Days Remaining: ${days_remaining}

        Action required within ${days_remaining} days.
      `,
    });
  }

  res.status(200).json({ received: true });
});
```

### 4. Ticket Creation

```typescript
// Create Jira ticket for breaches
app.post('/webhooks/ecocomply', async (req, res) => {
  if (req.body.type === 'breach.detected') {
    const { breach_id, breach_type, severity, description } = req.body.data;

    await jiraClient.issues.createIssue({
      fields: {
        project: { key: 'COMPLIANCE' },
        summary: `Breach Detected: ${breach_type}`,
        description: description,
        issuetype: { name: 'Bug' },
        priority: { name: severity },
        labels: ['ecocomply', 'breach', breach_type],
      },
    });
  }

  res.status(200).json({ received: true });
});
```

---

## Retry Logic

The webhook service implements automatic retry with exponential backoff:

- **Attempts:** 3 total attempts
- **Delays:** 1 second, 5 seconds, 25 seconds
- **Success Criteria:** HTTP 2xx response
- **Failure:** Any HTTP error or timeout after 30 seconds

### Delivery Logs

All delivery attempts are logged in the `webhook_deliveries` table:

```typescript
{
  id: 'delivery_123',
  webhook_id: 'webhook_456',
  event_type: 'obligation.created',
  event_id: 'evt_789',
  payload: { /* full webhook payload */ },
  response_status: 200,
  response_body: '{"received":true}',
  delivered_at: '2025-01-15T10:30:15Z',
  retry_count: 0,
  created_at: '2025-01-15T10:30:15Z',
}
```

---

## Troubleshooting

### Webhooks Not Being Delivered

1. Check webhook is active: `webhook.is_active === true`
2. Verify event subscription: Event must be in `webhook.events` array
3. Check delivery logs: Look for error messages
4. Test endpoint: Use `sendTestEvent()` method
5. Verify HTTPS: Only HTTPS URLs are supported
6. Check firewall: Ensure endpoint is publicly accessible

### Signature Verification Failing

1. Use raw request body (not parsed JSON)
2. Verify secret matches registered webhook
3. Check timestamp format (Unix timestamp)
4. Ensure signature is hex-encoded lowercase or uppercase

### High Failure Rate

1. Check endpoint response time (must respond < 30s)
2. Verify endpoint returns 2xx status code
3. Review error logs in webhook_deliveries table
4. Test with `sendTestEvent()` for debugging

---

## API Reference

See `lib/services/webhook-service.example.ts` for complete code examples.

### Methods

- `registerWebhook(companyId, url, events, secret?)` - Register new webhook
- `listWebhooks(companyId)` - List all webhooks for company
- `deleteWebhook(webhookId)` - Delete webhook
- `triggerWebhook(event, companyId, payload)` - Trigger webhook event
- `updateWebhook(webhookId, companyId, updates)` - Update webhook config
- `sendTestEvent(webhookId, companyId)` - Send test webhook
- `getDeliveries(webhookId, options)` - Get delivery history

### Helper Functions

- `generateWebhookSecret()` - Generate secure webhook secret
- `verifyWebhookSignature(secret, timestamp, payload, signature)` - Verify webhook signature

---

## Support

For questions or issues:
- GitHub Issues: [EcoComply Webhook Issues](https://github.com/ecocomply/issues)
- Documentation: [Full API Docs](https://docs.ecocomply.com/webhooks)
- Support: support@ecocomply.com
