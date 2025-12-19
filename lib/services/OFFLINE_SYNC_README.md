# Offline Sync Service

## Overview

The Offline Sync Service handles server-side synchronization logic for the PWA (Progressive Web App) mobile evidence capture functionality. It processes offline queue items from mobile devices, detects and resolves conflicts, and manages sync status tracking.

## Architecture

### Client-Side (PWA)
- Uses IndexedDB to store offline queue items
- Captures evidence, notes, and photos while offline
- Queues operations (CREATE, UPDATE, DELETE) with timestamps
- Syncs with server when connection is restored

### Server-Side (This Service)
- Processes batches of offline queue items
- Handles evidence, note, and photo uploads
- Detects conflicts based on timestamps
- Provides three conflict resolution strategies
- Tracks sync status per user

## Key Features

### 1. Batch Queue Processing
Process multiple offline items in a single request:

```typescript
import { offlineSyncService } from '@/lib/services';

const results = await offlineSyncService.processOfflineQueue([
  {
    id: 'queue-item-1',
    action: 'CREATE',
    entity_type: 'evidence',
    timestamp: '2025-12-19T10:00:00Z',
    data: {
      company_id: 'company-id',
      site_id: 'site-id',
      file_name: 'inspection-photo.jpg',
      file_path: 'uploads/evidence/photo.jpg',
      file_size: 2048576,
      mime_type: 'image/jpeg',
      created_by: 'user-id',
    },
    metadata: {
      geolocation: { lat: 51.5074, lng: -0.1278 },
      deviceInfo: 'iPhone 14 Pro',
      capturedAt: '2025-12-19T09:55:00Z',
    },
  },
  // ... more items
]);

// Results
results.forEach(result => {
  if (result.status === 'SUCCESS') {
    console.log(`Synced: ${result.queueItemId} -> ${result.serverId}`);
  } else if (result.status === 'CONFLICT') {
    console.log('Conflict detected:', result.conflictData);
  } else {
    console.error('Error:', result.error);
  }
});
```

### 2. Conflict Detection and Resolution

The service automatically detects conflicts when the server version was modified after the offline action was queued.

#### Conflict Detection
```typescript
// Automatically checked during UPDATE operations
// Conflict occurs when: serverUpdateTime > offlineActionTime
```

#### Resolution Strategies

**LOCAL** - Keep local changes, overwrite server:
```typescript
const resolved = await offlineSyncService.resolveConflict(
  localItem,
  serverItem,
  'LOCAL'
);
```

**SERVER** - Keep server version, discard local changes:
```typescript
const resolved = await offlineSyncService.resolveConflict(
  localItem,
  serverItem,
  'SERVER'
);
```

**MERGE** - Merge both versions (local fields take precedence):
```typescript
const resolved = await offlineSyncService.resolveConflict(
  localItem,
  serverItem,
  'MERGE'
);
```

### 3. Sync Status Tracking

Track user sync status:

```typescript
const status = await offlineSyncService.getSyncStatus('user-id');

console.log({
  lastSync: status.lastSync,              // Last sync attempt
  pendingCount: status.pendingCount,      // Items awaiting validation
  lastSuccessfulSync: status.lastSuccessfulSync,
  lastError: status.lastError,
});
```

## Entity Types

### Evidence Items
Standard document/file uploads:

```typescript
{
  id: 'queue-item-id',
  action: 'CREATE',
  entity_type: 'evidence',
  data: {
    company_id: 'required',
    site_id: 'required',
    file_name: 'required',
    file_path: 'required',
    file_size: 0,
    mime_type: 'application/octet-stream',
    storage_provider: 'SUPABASE',
    category: 'COMPLIANCE',
    description: 'Optional description',
    created_by: 'required',
  },
  metadata: {
    geolocation: { lat: 51.5074, lng: -0.1278 },
    deviceInfo: 'Device info',
    capturedAt: 'Original capture time',
  },
}
```

### Notes (Voice-to-Text)
Stored in evidence metadata:

```typescript
{
  id: 'queue-item-id',
  action: 'CREATE',
  entity_type: 'note',
  data: {
    evidence_id: 'required',
    note_text: 'Transcribed text',
    audio_file_path: 'Optional audio file',
    transcription_metadata: {
      confidence: 0.95,
      language: 'en',
    },
  },
}
```

### Photos with Geolocation
Photos captured in the field:

```typescript
{
  id: 'queue-item-id',
  action: 'CREATE',
  entity_type: 'photo',
  data: {
    company_id: 'required',
    site_id: 'required',
    file_name: 'required',
    file_path: 'required',
    file_size: 0,
    created_by: 'required',
  },
  metadata: {
    geolocation: { lat: 51.5074, lng: -0.1278 },
    capturedAt: '2025-12-19T10:00:00Z',
    deviceInfo: 'iPhone 14 Pro',
  },
}
```

## API Integration

### Example API Route

```typescript
// app/api/v1/sync/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { offlineSyncService } from '@/lib/services';
import { withAuth } from '@/lib/api/middleware';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { items } = await req.json();

    // Validate items belong to user
    const validatedItems = items.filter(
      (item: any) => item.data.created_by === user.id
    );

    // Process offline queue
    const results = await offlineSyncService.processOfflineQueue(validatedItems);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        success: results.filter(r => r.status === 'SUCCESS').length,
        conflicts: results.filter(r => r.status === 'CONFLICT').length,
        errors: results.filter(r => r.status === 'ERROR').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
```

### Conflict Resolution API

```typescript
// app/api/v1/sync/resolve-conflict/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { offlineSyncService } from '@/lib/services';
import { withAuth } from '@/lib/api/middleware';

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { localItem, serverItem, resolution } = await req.json();

    const resolved = await offlineSyncService.resolveConflict(
      localItem,
      serverItem,
      resolution
    );

    return NextResponse.json({
      success: true,
      resolved,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
```

### Sync Status API

```typescript
// app/api/v1/sync/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { offlineSyncService } from '@/lib/services';
import { withAuth } from '@/lib/api/middleware';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const status = await offlineSyncService.getSyncStatus(user.id);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
```

## Metadata Storage

### Evidence Metadata
All offline-captured items include tracking metadata:

```typescript
{
  offline_captured: true,           // Flag for offline origin
  offline_timestamp: 'ISO-8601',    // When queued offline
  device_info: 'Device identifier', // Optional device info
  captured_at: 'ISO-8601',          // Original capture time
  geolocation: {                    // Optional geolocation
    lat: 51.5074,
    lng: -0.1278,
  },
  gps_latitude: 51.5074,            // For photos
  gps_longitude: -0.1278,           // For photos
}
```

### Conflict Resolution Metadata
When conflicts are resolved, metadata is added:

```typescript
{
  conflict_resolution: {
    strategy: 'LOCAL' | 'SERVER' | 'MERGE',
    resolved_at: 'ISO-8601',
    server_version: 'ISO-8601',       // Server updated_at timestamp
    local_version_discarded: boolean, // For SERVER strategy
  },
}
```

## Audit Logging

All sync operations are automatically logged to the audit trail:

### Create Operations
```typescript
await auditService.logCreate('evidence', evidenceId, userId, {
  offline_sync: true,
  original_timestamp: item.timestamp,
});
```

### Update Operations
```typescript
await auditService.logUpdate('evidence', evidenceId, userId, changes);
// changes = { field: { old: value, new: value } }
```

### Delete Operations
```typescript
await auditService.logDelete('evidence', evidenceId, userId, {
  offline_sync: true,
  original_timestamp: item.timestamp,
});
```

## Error Handling

The service provides detailed error information:

```typescript
const results = await offlineSyncService.processOfflineQueue(items);

results.forEach(result => {
  switch (result.status) {
    case 'SUCCESS':
      // Item synced successfully
      console.log(`Server ID: ${result.serverId}`);
      break;

    case 'CONFLICT':
      // Server version was modified
      console.log('Local:', result.conflictData.local);
      console.log('Server:', result.conflictData.server);
      // Prompt user for resolution strategy
      break;

    case 'ERROR':
      // Processing failed
      console.error(result.error);
      // Retry or report to user
      break;
  }
});
```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| Missing required fields | Data validation failed | Ensure all required fields are provided |
| Evidence item not found | Entity doesn't exist | Check entity_id is valid |
| Missing entity_id for update | Update without ID | Provide entity_id for UPDATE/DELETE |
| Failed to create evidence | Database error | Check permissions and data validity |
| Unknown entity type | Invalid entity_type | Use 'evidence', 'note', or 'photo' |

## Best Practices

### 1. Batch Processing
Process items in batches of 20-50 for optimal performance:

```typescript
const BATCH_SIZE = 50;
for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
  const batch = allItems.slice(i, i + BATCH_SIZE);
  await offlineSyncService.processOfflineQueue(batch);
}
```

### 2. Conflict Handling
Always handle conflicts gracefully:

```typescript
const conflictResults = results.filter(r => r.status === 'CONFLICT');

if (conflictResults.length > 0) {
  // Prompt user for resolution strategy
  const resolution = await promptUser(conflictResults);

  for (const conflict of conflictResults) {
    await offlineSyncService.resolveConflict(
      conflict.conflictData.local,
      conflict.conflictData.server,
      resolution
    );
  }
}
```

### 3. Progress Tracking
Track sync progress for user feedback:

```typescript
const results = await offlineSyncService.processOfflineQueue(items);

const progress = {
  total: results.length,
  synced: results.filter(r => r.status === 'SUCCESS').length,
  conflicts: results.filter(r => r.status === 'CONFLICT').length,
  errors: results.filter(r => r.status === 'ERROR').length,
};

console.log(`Synced: ${progress.synced}/${progress.total}`);
```

### 4. Retry Logic
Implement retry for transient errors:

```typescript
async function syncWithRetry(items: OfflineQueueItem[], maxRetries = 3) {
  let attempt = 0;
  let failedItems = items;

  while (attempt < maxRetries && failedItems.length > 0) {
    const results = await offlineSyncService.processOfflineQueue(failedItems);

    failedItems = results
      .filter(r => r.status === 'ERROR')
      .map(r => items.find(i => i.id === r.queueItemId)!)
      .filter(Boolean);

    attempt++;

    if (failedItems.length > 0 && attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return failedItems.length === 0;
}
```

## Testing

### Unit Tests Example

```typescript
import { offlineSyncService } from '@/lib/services';

describe('OfflineSyncService', () => {
  it('should process evidence creation', async () => {
    const items = [{
      id: 'test-1',
      action: 'CREATE',
      entity_type: 'evidence',
      timestamp: new Date().toISOString(),
      data: {
        company_id: 'test-company',
        site_id: 'test-site',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        created_by: 'test-user',
      },
    }];

    const results = await offlineSyncService.processOfflineQueue(items);

    expect(results[0].status).toBe('SUCCESS');
    expect(results[0].serverId).toBeDefined();
  });

  it('should detect conflicts', async () => {
    // Create item
    const createResult = await offlineSyncService.processOfflineQueue([{
      id: 'test-1',
      action: 'CREATE',
      entity_type: 'evidence',
      timestamp: new Date().toISOString(),
      data: { /* ... */ },
    }]);

    // Simulate server update
    await updateOnServer(createResult[0].serverId);

    // Try to update with older timestamp
    const updateResult = await offlineSyncService.processOfflineQueue([{
      id: 'test-2',
      action: 'UPDATE',
      entity_type: 'evidence',
      entity_id: createResult[0].serverId,
      timestamp: new Date(Date.now() - 60000).toISOString(),
      data: { /* ... */ },
    }]);

    expect(updateResult[0].status).toBe('CONFLICT');
  });
});
```

## Performance Considerations

### Database Indexing
Ensure these indexes exist for optimal performance:

```sql
-- Evidence items by user and validation status
CREATE INDEX idx_evidence_user_validation
ON evidence_items(created_by, validation_status)
WHERE metadata ? 'offline_captured';

-- Evidence items by sync status
CREATE INDEX idx_evidence_offline_sync
ON evidence_items USING GIN (metadata)
WHERE validation_status = 'PENDING';

-- Audit logs for sync tracking
CREATE INDEX idx_audit_offline_sync
ON audit_logs(user_id, created_at)
WHERE metadata ? 'offline_sync';
```

### Batch Size Recommendations
- Small devices (mobile): 20-30 items per batch
- Desktop/tablet: 50-100 items per batch
- Background sync: 100-200 items per batch

## Security Considerations

1. **User Validation**: Always verify items belong to the requesting user
2. **File Path Sanitization**: Validate file paths to prevent directory traversal
3. **Data Validation**: Validate all required fields before processing
4. **Rate Limiting**: Implement rate limits on sync endpoints
5. **Audit Trail**: All operations are logged for compliance

## Related Documentation

- PWA Implementation Guide (to be created)
- Evidence Service: `/lib/services/evidence-service.ts`
- Audit Service: `/lib/services/audit-service.ts`
- API Middleware: `/lib/api/middleware.ts`
