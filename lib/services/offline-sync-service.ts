/**
 * Offline Sync Service
 * Handles synchronization logic for PWA mobile evidence capture
 * Reference: PWA offline-first architecture for mobile field work
 *
 * This server-side service processes offline queue items from mobile devices,
 * handles conflict detection and resolution, and manages sync status tracking.
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { auditService } from './audit-service';

/**
 * Offline queue item structure from client-side IndexedDB
 */
export interface OfflineQueueItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: 'evidence' | 'note' | 'photo';
  entity_id?: string;        // For updates/deletes
  data: any;                 // Entity data
  timestamp: string;         // When action was queued
  metadata?: {
    geolocation?: { lat: number; lng: number };
    deviceInfo?: string;
    capturedAt?: string;     // Original capture time for photos
  };
}

/**
 * Result of processing a single queue item
 */
export interface SyncResult {
  queueItemId: string;
  status: 'SUCCESS' | 'CONFLICT' | 'ERROR';
  serverId?: string;         // New server ID for created items
  error?: string;
  conflictData?: {
    local: any;
    server: any;
  };
}

/**
 * Sync status for a user
 */
export interface SyncStatus {
  lastSync: string;
  pendingCount: number;
  lastSuccessfulSync?: string;
  lastError?: string;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolution = 'LOCAL' | 'SERVER' | 'MERGE';

export class OfflineSyncService {
  /**
   * Process a batch of offline queue items
   * Processes items in order and returns results for each
   */
  async processOfflineQueue(items: OfflineQueueItem[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Process items sequentially to maintain order
    for (const item of items) {
      try {
        const result = await this.processQueueItem(item);
        results.push(result);
      } catch (error: any) {
        console.error(`Failed to process queue item ${item.id}:`, error);
        results.push({
          queueItemId: item.id,
          status: 'ERROR',
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return results;
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: OfflineQueueItem): Promise<SyncResult> {
    switch (item.entity_type) {
      case 'evidence':
        return this.processEvidenceItem(item);
      case 'note':
        return this.processNoteItem(item);
      case 'photo':
        return this.processPhotoItem(item);
      default:
        return {
          queueItemId: item.id,
          status: 'ERROR',
          error: `Unknown entity type: ${item.entity_type}`,
        };
    }
  }

  /**
   * Process evidence item (file upload)
   */
  private async processEvidenceItem(item: OfflineQueueItem): Promise<SyncResult> {
    if (item.action === 'CREATE') {
      return this.createEvidence(item);
    } else if (item.action === 'UPDATE') {
      return this.updateEvidence(item);
    } else if (item.action === 'DELETE') {
      return this.deleteEvidence(item);
    }

    return {
      queueItemId: item.id,
      status: 'ERROR',
      error: `Unsupported action: ${item.action}`,
    };
  }

  /**
   * Create new evidence item
   */
  private async createEvidence(item: OfflineQueueItem): Promise<SyncResult> {
    try {
      const {
        company_id,
        site_id,
        file_name,
        file_path,
        file_size,
        mime_type,
        storage_provider,
        category,
        description,
        created_by,
      } = item.data;

      // Validate required fields
      if (!company_id || !site_id || !file_name || !file_path || !created_by) {
        return {
          queueItemId: item.id,
          status: 'ERROR',
          error: 'Missing required fields for evidence creation',
        };
      }

      // Build metadata with geolocation if provided
      const metadata: Record<string, any> = {
        offline_captured: true,
        offline_timestamp: item.timestamp,
        ...(item.metadata?.deviceInfo && { device_info: item.metadata.deviceInfo }),
        ...(item.metadata?.capturedAt && { captured_at: item.metadata.capturedAt }),
      };

      // Add geolocation to metadata if provided
      if (item.metadata?.geolocation) {
        metadata.geolocation = item.metadata.geolocation;
      }

      // Insert evidence item
      const { data: evidence, error } = await supabaseAdmin
        .from('evidence_items')
        .insert({
          company_id,
          site_id,
          file_name,
          file_path,
          file_size: file_size || 0,
          mime_type: mime_type || 'application/octet-stream',
          storage_provider: storage_provider || 'SUPABASE',
          category: category || null,
          description: description || null,
          validation_status: 'PENDING',
          is_archived: false,
          metadata,
          created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create evidence: ${error.message}`);
      }

      // Log audit trail
      await auditService.logCreate('evidence', evidence.id, created_by, {
        offline_sync: true,
        original_timestamp: item.timestamp,
      });

      return {
        queueItemId: item.id,
        status: 'SUCCESS',
        serverId: evidence.id,
      };
    } catch (error: any) {
      console.error('Error creating evidence:', error);
      return {
        queueItemId: item.id,
        status: 'ERROR',
        error: error.message || 'Failed to create evidence',
      };
    }
  }

  /**
   * Update existing evidence item with conflict detection
   */
  private async updateEvidence(item: OfflineQueueItem): Promise<SyncResult> {
    try {
      if (!item.entity_id) {
        return {
          queueItemId: item.id,
          status: 'ERROR',
          error: 'Missing entity_id for update',
        };
      }

      // Fetch current server version
      const { data: serverData, error: fetchError } = await supabaseAdmin
        .from('evidence_items')
        .select('*')
        .eq('id', item.entity_id)
        .single();

      if (fetchError || !serverData) {
        return {
          queueItemId: item.id,
          status: 'ERROR',
          error: 'Evidence item not found on server',
        };
      }

      // Check for conflicts (server was modified after offline action was queued)
      const serverUpdateTime = new Date(serverData.updated_at).getTime();
      const offlineActionTime = new Date(item.timestamp).getTime();

      if (serverUpdateTime > offlineActionTime) {
        // Conflict detected
        return {
          queueItemId: item.id,
          status: 'CONFLICT',
          conflictData: {
            local: item.data,
            server: serverData,
          },
        };
      }

      // No conflict, proceed with update
      const updateData: Record<string, any> = {
        ...item.data,
        updated_at: new Date().toISOString(),
      };

      // Preserve metadata and add offline sync info
      updateData.metadata = {
        ...(serverData.metadata || {}),
        ...updateData.metadata,
        last_offline_sync: item.timestamp,
      };

      const { error: updateError } = await supabaseAdmin
        .from('evidence_items')
        .update(updateData)
        .eq('id', item.entity_id);

      if (updateError) {
        throw new Error(`Failed to update evidence: ${updateError.message}`);
      }

      // Log audit trail with field-level changes
      const changes: Record<string, { old: any; new: any }> = {};
      for (const key in item.data) {
        if (serverData[key] !== item.data[key]) {
          changes[key] = { old: serverData[key], new: item.data[key] };
        }
      }
      await auditService.logUpdate('evidence', item.entity_id, item.data.created_by || 'unknown', changes);

      return {
        queueItemId: item.id,
        status: 'SUCCESS',
        serverId: item.entity_id,
      };
    } catch (error: any) {
      console.error('Error updating evidence:', error);
      return {
        queueItemId: item.id,
        status: 'ERROR',
        error: error.message || 'Failed to update evidence',
      };
    }
  }

  /**
   * Delete evidence item
   */
  private async deleteEvidence(item: OfflineQueueItem): Promise<SyncResult> {
    try {
      if (!item.entity_id) {
        return {
          queueItemId: item.id,
          status: 'ERROR',
          error: 'Missing entity_id for delete',
        };
      }

      // Soft delete
      const { error } = await supabaseAdmin
        .from('evidence_items')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.entity_id);

      if (error) {
        throw new Error(`Failed to delete evidence: ${error.message}`);
      }

      // Log audit trail
      await auditService.logDelete('evidence', item.entity_id, item.data.deleted_by || 'unknown', {
        offline_sync: true,
        original_timestamp: item.timestamp,
      });

      return {
        queueItemId: item.id,
        status: 'SUCCESS',
        serverId: item.entity_id,
      };
    } catch (error: any) {
      console.error('Error deleting evidence:', error);
      return {
        queueItemId: item.id,
        status: 'ERROR',
        error: error.message || 'Failed to delete evidence',
      };
    }
  }

  /**
   * Process note item (voice-to-text notes stored in evidence metadata)
   */
  private async processNoteItem(item: OfflineQueueItem): Promise<SyncResult> {
    try {
      const { evidence_id, note_text, audio_file_path, transcription_metadata } = item.data;

      if (!evidence_id) {
        return {
          queueItemId: item.id,
          status: 'ERROR',
          error: 'Missing evidence_id for note',
        };
      }

      // Fetch current evidence
      const { data: evidence, error: fetchError } = await supabaseAdmin
        .from('evidence_items')
        .select('metadata')
        .eq('id', evidence_id)
        .single();

      if (fetchError || !evidence) {
        return {
          queueItemId: item.id,
          status: 'ERROR',
          error: 'Evidence item not found for note',
        };
      }

      // Add note to evidence metadata
      const existingMetadata = evidence.metadata || {};
      const notes = existingMetadata.notes || [];

      notes.push({
        id: item.id,
        text: note_text,
        audio_file_path: audio_file_path || null,
        transcription_metadata: transcription_metadata || null,
        created_at: item.timestamp,
        offline_captured: true,
      });

      const { error: updateError } = await supabaseAdmin
        .from('evidence_items')
        .update({
          metadata: {
            ...existingMetadata,
            notes,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', evidence_id);

      if (updateError) {
        throw new Error(`Failed to add note: ${updateError.message}`);
      }

      return {
        queueItemId: item.id,
        status: 'SUCCESS',
        serverId: evidence_id,
      };
    } catch (error: any) {
      console.error('Error processing note:', error);
      return {
        queueItemId: item.id,
        status: 'ERROR',
        error: error.message || 'Failed to process note',
      };
    }
  }

  /**
   * Process photo item with geolocation
   */
  private async processPhotoItem(item: OfflineQueueItem): Promise<SyncResult> {
    try {
      const {
        company_id,
        site_id,
        file_name,
        file_path,
        file_size,
        created_by,
      } = item.data;

      // Validate required fields
      if (!company_id || !site_id || !file_name || !file_path || !created_by) {
        return {
          queueItemId: item.id,
          status: 'ERROR',
          error: 'Missing required fields for photo',
        };
      }

      // Build metadata with geolocation and capture time
      const metadata: Record<string, any> = {
        offline_captured: true,
        offline_timestamp: item.timestamp,
        entity_type: 'photo',
        ...(item.metadata?.deviceInfo && { device_info: item.metadata.deviceInfo }),
        ...(item.metadata?.capturedAt && { captured_at: item.metadata.capturedAt }),
      };

      // Add geolocation if provided
      if (item.metadata?.geolocation) {
        metadata.geolocation = item.metadata.geolocation;
        metadata.gps_latitude = item.metadata.geolocation.lat;
        metadata.gps_longitude = item.metadata.geolocation.lng;
      }

      // Insert as evidence item with photo category
      const { data: photo, error } = await supabaseAdmin
        .from('evidence_items')
        .insert({
          company_id,
          site_id,
          file_name,
          file_path,
          file_size: file_size || 0,
          mime_type: 'image/jpeg', // Default to JPEG, can be overridden
          storage_provider: 'SUPABASE',
          category: 'PHOTO',
          validation_status: 'PENDING',
          is_archived: false,
          metadata,
          created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create photo: ${error.message}`);
      }

      // Log audit trail
      await auditService.logCreate('evidence', photo.id, created_by, {
        offline_sync: true,
        entity_type: 'photo',
        original_timestamp: item.timestamp,
        geolocation: item.metadata?.geolocation,
      });

      return {
        queueItemId: item.id,
        status: 'SUCCESS',
        serverId: photo.id,
      };
    } catch (error: any) {
      console.error('Error processing photo:', error);
      return {
        queueItemId: item.id,
        status: 'ERROR',
        error: error.message || 'Failed to process photo',
      };
    }
  }

  /**
   * Resolve a conflict between local and server versions
   * Applies the specified resolution strategy
   */
  async resolveConflict(
    localItem: any,
    serverItem: any,
    resolution: ConflictResolution
  ): Promise<any> {
    try {
      let resolvedData: any;

      switch (resolution) {
        case 'LOCAL':
          // Use local version, overwrite server
          resolvedData = {
            ...localItem,
            updated_at: new Date().toISOString(),
            metadata: {
              ...(serverItem.metadata || {}),
              ...(localItem.metadata || {}),
              conflict_resolution: {
                strategy: 'LOCAL',
                resolved_at: new Date().toISOString(),
                server_version: serverItem.updated_at,
              },
            },
          };
          break;

        case 'SERVER':
          // Keep server version, discard local changes
          resolvedData = {
            ...serverItem,
            metadata: {
              ...(serverItem.metadata || {}),
              conflict_resolution: {
                strategy: 'SERVER',
                resolved_at: new Date().toISOString(),
                local_version_discarded: true,
              },
            },
          };
          break;

        case 'MERGE':
          // Merge both versions (prefer local for most fields, keep server timestamps)
          resolvedData = {
            ...serverItem,
            ...localItem,
            id: serverItem.id, // Always keep server ID
            created_at: serverItem.created_at, // Keep original creation time
            updated_at: new Date().toISOString(),
            metadata: {
              ...(serverItem.metadata || {}),
              ...(localItem.metadata || {}),
              conflict_resolution: {
                strategy: 'MERGE',
                resolved_at: new Date().toISOString(),
                server_version: serverItem.updated_at,
              },
            },
          };
          break;

        default:
          throw new Error(`Unknown resolution strategy: ${resolution}`);
      }

      // Apply the resolved data
      if (resolution !== 'SERVER') {
        const { error } = await supabaseAdmin
          .from('evidence_items')
          .update(resolvedData)
          .eq('id', serverItem.id);

        if (error) {
          throw new Error(`Failed to apply conflict resolution: ${error.message}`);
        }

        // Log audit trail with conflict resolution metadata
        const changes: Record<string, { old: any; new: any }> = {};
        for (const key in resolvedData) {
          if (serverItem[key] !== resolvedData[key]) {
            changes[key] = { old: serverItem[key], new: resolvedData[key] };
          }
        }
        await auditService.logUpdate('evidence', serverItem.id, 'system', changes);
      }

      return resolvedData;
    } catch (error: any) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Get sync status for a user
   * Returns last sync time and pending item count
   */
  async getSyncStatus(userId: string): Promise<SyncStatus> {
    try {
      // Get last successful sync from audit logs
      const { data: lastSyncLog } = await supabaseAdmin
        .from('audit_logs')
        .select('created_at, metadata')
        .eq('user_id', userId)
        .eq('action', 'update')
        .contains('metadata', { offline_sync: true })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Count pending items (items created offline but not yet validated)
      const { count: pendingCount } = await supabaseAdmin
        .from('evidence_items')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('validation_status', 'PENDING')
        .contains('metadata', { offline_captured: true });

      const status: SyncStatus = {
        lastSync: new Date().toISOString(),
        pendingCount: pendingCount || 0,
      };

      if (lastSyncLog) {
        status.lastSuccessfulSync = lastSyncLog.created_at;
      }

      return status;
    } catch (error: any) {
      console.error('Error getting sync status:', error);
      return {
        lastSync: new Date().toISOString(),
        pendingCount: 0,
        lastError: error.message,
      };
    }
  }

  /**
   * Batch update sync status for multiple items
   * Marks items as synced and validated
   */
  async markItemsSynced(itemIds: string[], validatedBy: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('evidence_items')
        .update({
          validation_status: 'APPROVED',
          validated_by: validatedBy,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', itemIds);

      if (error) {
        throw new Error(`Failed to mark items as synced: ${error.message}`);
      }

      // Log audit trail for each item
      for (const itemId of itemIds) {
        await auditService.logStatusChange(
          'evidence',
          itemId,
          validatedBy,
          'PENDING',
          'APPROVED',
          { sync_validation: true }
        );
      }
    } catch (error: any) {
      console.error('Error marking items as synced:', error);
      throw error;
    }
  }

  /**
   * Get pending offline items for a user
   * Returns items that were created offline and not yet validated
   */
  async getPendingOfflineItems(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('evidence_items')
        .select('*')
        .eq('created_by', userId)
        .eq('validation_status', 'PENDING')
        .contains('metadata', { offline_captured: true })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch pending items: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error getting pending offline items:', error);
      throw error;
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
