/**
 * Offline Sync Service - Usage Examples
 * Demonstrates how to use the offline sync service for PWA functionality
 */

import { offlineSyncService, OfflineQueueItem, SyncResult } from './offline-sync-service';

/**
 * Example 1: Process a batch of offline evidence items
 */
export async function example1_ProcessOfflineEvidence() {
  const items: OfflineQueueItem[] = [
    {
      id: 'queue-item-001',
      action: 'CREATE',
      entity_type: 'evidence',
      timestamp: '2025-12-19T10:00:00Z',
      data: {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        site_id: '123e4567-e89b-12d3-a456-426614174001',
        file_name: 'waste-inspection-report.pdf',
        file_path: 'uploads/evidence/2025-12-19/report.pdf',
        file_size: 2048576,
        mime_type: 'application/pdf',
        storage_provider: 'SUPABASE',
        category: 'COMPLIANCE',
        description: 'Monthly waste inspection report',
        created_by: '123e4567-e89b-12d3-a456-426614174002',
      },
      metadata: {
        geolocation: { lat: 51.5074, lng: -0.1278 },
        deviceInfo: 'iPhone 14 Pro, iOS 17.2',
        capturedAt: '2025-12-19T09:55:00Z',
      },
    },
    {
      id: 'queue-item-002',
      action: 'CREATE',
      entity_type: 'evidence',
      timestamp: '2025-12-19T10:05:00Z',
      data: {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        site_id: '123e4567-e89b-12d3-a456-426614174001',
        file_name: 'emission-data.xlsx',
        file_path: 'uploads/evidence/2025-12-19/emissions.xlsx',
        file_size: 512000,
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        storage_provider: 'SUPABASE',
        category: 'EMISSIONS',
        description: 'December emission monitoring data',
        created_by: '123e4567-e89b-12d3-a456-426614174002',
      },
    },
  ];

  const results = await offlineSyncService.processOfflineQueue(items);

  // Process results
  results.forEach((result: SyncResult) => {
    if (result.status === 'SUCCESS') {
      console.log(`✓ Synced ${result.queueItemId} -> ${result.serverId}`);
    } else if (result.status === 'CONFLICT') {
      console.log(`⚠ Conflict detected for ${result.queueItemId}`);
      console.log('Local:', result.conflictData?.local);
      console.log('Server:', result.conflictData?.server);
    } else {
      console.error(`✗ Error syncing ${result.queueItemId}: ${result.error}`);
    }
  });

  return results;
}

/**
 * Example 2: Process offline photos with geolocation
 */
export async function example2_ProcessOfflinePhotos() {
  const photoItems: OfflineQueueItem[] = [
    {
      id: 'photo-001',
      action: 'CREATE',
      entity_type: 'photo',
      timestamp: '2025-12-19T11:30:00Z',
      data: {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        site_id: '123e4567-e89b-12d3-a456-426614174001',
        file_name: 'site-inspection-001.jpg',
        file_path: 'uploads/photos/2025-12-19/inspection-001.jpg',
        file_size: 3145728,
        created_by: '123e4567-e89b-12d3-a456-426614174002',
      },
      metadata: {
        geolocation: { lat: 51.5074, lng: -0.1278 },
        capturedAt: '2025-12-19T11:28:00Z',
        deviceInfo: 'Samsung Galaxy S23',
      },
    },
    {
      id: 'photo-002',
      action: 'CREATE',
      entity_type: 'photo',
      timestamp: '2025-12-19T11:35:00Z',
      data: {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        site_id: '123e4567-e89b-12d3-a456-426614174001',
        file_name: 'waste-storage-area.jpg',
        file_path: 'uploads/photos/2025-12-19/waste-area.jpg',
        file_size: 2621440,
        created_by: '123e4567-e89b-12d3-a456-426614174002',
      },
      metadata: {
        geolocation: { lat: 51.5075, lng: -0.1279 },
        capturedAt: '2025-12-19T11:33:00Z',
        deviceInfo: 'Samsung Galaxy S23',
      },
    },
  ];

  const results = await offlineSyncService.processOfflineQueue(photoItems);

  console.log('Photo sync summary:');
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${results.filter(r => r.status === 'SUCCESS').length}`);
  console.log(`Errors: ${results.filter(r => r.status === 'ERROR').length}`);

  return results;
}

/**
 * Example 3: Process voice-to-text notes
 */
export async function example3_ProcessVoiceNotes() {
  // First create evidence item, then add note
  const evidenceId = '123e4567-e89b-12d3-a456-426614174010';

  const noteItems: OfflineQueueItem[] = [
    {
      id: 'note-001',
      action: 'CREATE',
      entity_type: 'note',
      timestamp: '2025-12-19T12:00:00Z',
      data: {
        evidence_id: evidenceId,
        note_text: 'Observed minor leak in drainage system near building 3. Maintenance team notified. No immediate environmental impact detected.',
        audio_file_path: 'uploads/audio/2025-12-19/note-001.m4a',
        transcription_metadata: {
          confidence: 0.95,
          language: 'en',
          duration_seconds: 15,
        },
      },
    },
  ];

  const results = await offlineSyncService.processOfflineQueue(noteItems);

  results.forEach((result: SyncResult) => {
    if (result.status === 'SUCCESS') {
      console.log('Voice note added successfully');
    } else {
      console.error('Failed to add voice note:', result.error);
    }
  });

  return results;
}

/**
 * Example 4: Handle update conflicts
 */
export async function example4_HandleUpdateConflict() {
  const updateItem: OfflineQueueItem = {
    id: 'update-001',
    action: 'UPDATE',
    entity_type: 'evidence',
    entity_id: '123e4567-e89b-12d3-a456-426614174010',
    timestamp: '2025-12-19T09:00:00Z', // Older timestamp
    data: {
      description: 'Updated description from mobile app',
      category: 'COMPLIANCE',
      created_by: '123e4567-e89b-12d3-a456-426614174002',
    },
  };

  const results = await offlineSyncService.processOfflineQueue([updateItem]);

  if (results[0].status === 'CONFLICT') {
    console.log('Conflict detected!');
    console.log('Local changes:', results[0].conflictData?.local);
    console.log('Server version:', results[0].conflictData?.server);

    // Resolve conflict using MERGE strategy
    const resolved = await offlineSyncService.resolveConflict(
      results[0].conflictData!.local,
      results[0].conflictData!.server,
      'MERGE'
    );

    console.log('Conflict resolved:', resolved);
  }

  return results;
}

/**
 * Example 5: Get sync status for a user
 */
export async function example5_GetSyncStatus() {
  const userId = '123e4567-e89b-12d3-a456-426614174002';

  const status = await offlineSyncService.getSyncStatus(userId);

  console.log('Sync Status:');
  console.log(`Last sync: ${status.lastSync}`);
  console.log(`Pending items: ${status.pendingCount}`);

  if (status.lastSuccessfulSync) {
    console.log(`Last successful sync: ${status.lastSuccessfulSync}`);
  }

  if (status.lastError) {
    console.error(`Last error: ${status.lastError}`);
  }

  return status;
}

/**
 * Example 6: Resolve conflict with different strategies
 */
export async function example6_ConflictResolutionStrategies() {
  const localItem = {
    id: '123e4567-e89b-12d3-a456-426614174010',
    description: 'Updated from mobile - added leak details',
    category: 'INCIDENT',
    updated_at: '2025-12-19T10:00:00Z',
  };

  const serverItem = {
    id: '123e4567-e89b-12d3-a456-426614174010',
    description: 'Updated from desktop - added compliance notes',
    category: 'COMPLIANCE',
    updated_at: '2025-12-19T10:30:00Z',
  };

  console.log('=== LOCAL Strategy (keep mobile changes) ===');
  const localResolved = await offlineSyncService.resolveConflict(
    localItem,
    serverItem,
    'LOCAL'
  );
  console.log('Result:', localResolved.description);
  // Output: "Updated from mobile - added leak details"

  console.log('\n=== SERVER Strategy (keep desktop changes) ===');
  const serverResolved = await offlineSyncService.resolveConflict(
    localItem,
    serverItem,
    'SERVER'
  );
  console.log('Result:', serverResolved.description);
  // Output: "Updated from desktop - added compliance notes"

  console.log('\n=== MERGE Strategy (combine both) ===');
  const mergeResolved = await offlineSyncService.resolveConflict(
    localItem,
    serverItem,
    'MERGE'
  );
  console.log('Result:', mergeResolved.description);
  // Output: "Updated from mobile - added leak details" (local takes precedence)
  console.log('Metadata:', mergeResolved.metadata?.conflict_resolution);
}

/**
 * Example 7: Batch processing with progress tracking
 */
export async function example7_BatchProcessingWithProgress() {
  const allItems: OfflineQueueItem[] = Array.from({ length: 150 }, (_, i) => ({
    id: `batch-item-${i}`,
    action: 'CREATE',
    entity_type: 'evidence',
    timestamp: new Date().toISOString(),
    data: {
      company_id: '123e4567-e89b-12d3-a456-426614174000',
      site_id: '123e4567-e89b-12d3-a456-426614174001',
      file_name: `document-${i}.pdf`,
      file_path: `uploads/evidence/batch/${i}.pdf`,
      file_size: 1024000,
      mime_type: 'application/pdf',
      created_by: '123e4567-e89b-12d3-a456-426614174002',
    },
  }));

  const BATCH_SIZE = 50;
  let totalSynced = 0;
  let totalErrors = 0;

  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);

    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allItems.length / BATCH_SIZE)}...`);

    const results = await offlineSyncService.processOfflineQueue(batch);

    const synced = results.filter(r => r.status === 'SUCCESS').length;
    const errors = results.filter(r => r.status === 'ERROR').length;

    totalSynced += synced;
    totalErrors += errors;

    console.log(`  Synced: ${synced}/${batch.length}`);
    console.log(`  Errors: ${errors}`);
  }

  console.log('\nBatch Processing Summary:');
  console.log(`Total synced: ${totalSynced}/${allItems.length}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Success rate: ${((totalSynced / allItems.length) * 100).toFixed(2)}%`);
}

/**
 * Example 8: Mark items as synced and validated
 */
export async function example8_MarkItemsSynced() {
  const syncedItemIds = [
    '123e4567-e89b-12d3-a456-426614174010',
    '123e4567-e89b-12d3-a456-426614174011',
    '123e4567-e89b-12d3-a456-426614174012',
  ];

  const validatorUserId = '123e4567-e89b-12d3-a456-426614174003';

  await offlineSyncService.markItemsSynced(syncedItemIds, validatorUserId);

  console.log(`Marked ${syncedItemIds.length} items as synced and validated`);
}

/**
 * Example 9: Get pending offline items for a user
 */
export async function example9_GetPendingItems() {
  const userId = '123e4567-e89b-12d3-a456-426614174002';

  const pendingItems = await offlineSyncService.getPendingOfflineItems(userId, 20);

  console.log(`Found ${pendingItems.length} pending offline items`);

  pendingItems.forEach(item => {
    console.log(`- ${item.file_name} (created: ${item.created_at})`);
    if (item.metadata?.offline_timestamp) {
      console.log(`  Offline timestamp: ${item.metadata.offline_timestamp}`);
    }
    if (item.metadata?.geolocation) {
      console.log(`  Location: ${item.metadata.geolocation.lat}, ${item.metadata.geolocation.lng}`);
    }
  });

  return pendingItems;
}

/**
 * Example 10: Complete sync workflow
 */
export async function example10_CompleteSyncWorkflow() {
  const userId = '123e4567-e89b-12d3-a456-426614174002';

  console.log('=== Starting Complete Sync Workflow ===\n');

  // Step 1: Check current sync status
  console.log('Step 1: Checking sync status...');
  const initialStatus = await offlineSyncService.getSyncStatus(userId);
  console.log(`Pending items: ${initialStatus.pendingCount}\n`);

  // Step 2: Process offline queue
  console.log('Step 2: Processing offline queue...');
  const items: OfflineQueueItem[] = [
    {
      id: 'workflow-001',
      action: 'CREATE',
      entity_type: 'evidence',
      timestamp: new Date().toISOString(),
      data: {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        site_id: '123e4567-e89b-12d3-a456-426614174001',
        file_name: 'workflow-test.pdf',
        file_path: 'uploads/evidence/workflow-test.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        created_by: userId,
      },
    },
  ];

  const results = await offlineSyncService.processOfflineQueue(items);

  // Step 3: Handle results
  console.log('Step 3: Processing results...');
  const successItems: string[] = [];
  const conflictItems: SyncResult[] = [];
  const errorItems: SyncResult[] = [];

  results.forEach(result => {
    if (result.status === 'SUCCESS' && result.serverId) {
      successItems.push(result.serverId);
    } else if (result.status === 'CONFLICT') {
      conflictItems.push(result);
    } else {
      errorItems.push(result);
    }
  });

  console.log(`Success: ${successItems.length}`);
  console.log(`Conflicts: ${conflictItems.length}`);
  console.log(`Errors: ${errorItems.length}\n`);

  // Step 4: Resolve conflicts
  if (conflictItems.length > 0) {
    console.log('Step 4: Resolving conflicts...');
    for (const conflict of conflictItems) {
      const resolved = await offlineSyncService.resolveConflict(
        conflict.conflictData!.local,
        conflict.conflictData!.server,
        'MERGE'
      );
      console.log(`Resolved conflict for ${conflict.queueItemId}`);
    }
    console.log();
  }

  // Step 5: Mark successful items as validated
  if (successItems.length > 0) {
    console.log('Step 5: Marking items as validated...');
    await offlineSyncService.markItemsSynced(successItems, userId);
    console.log(`Validated ${successItems.length} items\n`);
  }

  // Step 6: Check final sync status
  console.log('Step 6: Checking final sync status...');
  const finalStatus = await offlineSyncService.getSyncStatus(userId);
  console.log(`Pending items: ${finalStatus.pendingCount}`);
  console.log(`Last sync: ${finalStatus.lastSync}\n`);

  console.log('=== Sync Workflow Complete ===');

  return {
    success: successItems.length,
    conflicts: conflictItems.length,
    errors: errorItems.length,
  };
}
