/**
 * Notification Preferences Service
 * Handles user notification preferences checking
 * Reference: docs/specs/42_Backend_Notifications.md Section 7
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface NotificationPreference {
  notification_type: string;
  channel_preference: 'EMAIL_ONLY' | 'SMS_ONLY' | 'EMAIL_AND_SMS' | 'IN_APP_ONLY' | 'ALL_CHANNELS';
  frequency_preference: 'IMMEDIATE' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST' | 'NEVER';
  enabled: boolean;
}

/**
 * Get user notification preferences with inheritance
 */
export async function getUserPreferences(
  userId: string,
  notificationType: string
): Promise<NotificationPreference> {
  // Get user settings
  const { data: userData, error } = await supabaseAdmin
    .from('users')
    .select('settings')
    .eq('id', userId)
    .single();

  if (error || !userData) {
    // Fallback to system defaults
    return {
      notification_type: notificationType,
      channel_preference: 'ALL_CHANNELS',
      frequency_preference: 'IMMEDIATE',
      enabled: true,
    };
  }

  const preferences = userData.settings?.notification_preferences || [];

  // Try to find specific preference for this notification type
  const specificPreference = preferences.find(
    (p: any) => p.notification_type === notificationType
  );

  if (specificPreference) {
    return {
      notification_type: notificationType,
      channel_preference: specificPreference.channel_preference || 'ALL_CHANNELS',
      frequency_preference: specificPreference.frequency_preference || 'IMMEDIATE',
      enabled: specificPreference.enabled !== false,
    };
  }

  // Try to find "ALL" preference
  const allPreference = preferences.find((p: any) => p.notification_type === 'ALL');

  if (allPreference) {
    return {
      notification_type: notificationType,
      channel_preference: allPreference.channel_preference || 'ALL_CHANNELS',
      frequency_preference: allPreference.frequency_preference || 'IMMEDIATE',
      enabled: allPreference.enabled !== false,
    };
  }

  // Fallback to system defaults
  return {
    notification_type: notificationType,
    channel_preference: 'ALL_CHANNELS',
    frequency_preference: 'IMMEDIATE',
    enabled: true,
  };
}

/**
 * Check if notification should be sent based on preferences
 */
export async function shouldSendNotification(
  userId: string,
  notificationType: string,
  channel: 'EMAIL' | 'SMS' | 'IN_APP'
): Promise<boolean> {
  const preferences = await getUserPreferences(userId, notificationType);

  // Check if notification type is enabled
  if (!preferences.enabled) {
    return false;
  }

  // Check channel preference
  if (preferences.channel_preference === 'EMAIL_ONLY' && channel !== 'EMAIL') {
    return false;
  }
  if (preferences.channel_preference === 'SMS_ONLY' && channel !== 'SMS') {
    return false;
  }
  if (preferences.channel_preference === 'IN_APP_ONLY' && channel !== 'IN_APP') {
    return false;
  }

  // Check frequency preference
  if (preferences.frequency_preference === 'NEVER') {
    return false;
  }

  // For DAILY_DIGEST and WEEKLY_DIGEST, queue for digest
  if (preferences.frequency_preference === 'DAILY_DIGEST' || preferences.frequency_preference === 'WEEKLY_DIGEST') {
    // This will be handled by the notification creation - notifications with digest preference
    // should be created with status QUEUED and metadata indicating digest type
    return false; // Don't send immediately
  }

  // IMMEDIATE: Send now
  return true;
}

