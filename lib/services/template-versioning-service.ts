/**
 * Template Versioning Service
 * Manages notification template versions
 * Reference: docs/specs/42_Backend_Notifications.md Section 10
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface TemplateVersion {
  id: string;
  template_code: string;
  version: number;
  subject_template: string;
  html_template: string;
  text_template: string;
  is_active: boolean;
  effective_from: string;
  deprecated_at?: string;
  created_at: string;
  created_by?: string;
}

/**
 * Get active template version for a notification type
 */
export async function getActiveTemplate(
  templateCode: string
): Promise<TemplateVersion | null> {
  const { data: template, error } = await supabaseAdmin
    .from('notification_templates')
    .select('*')
    .eq('template_code', templateCode)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error || !template) {
    return null;
  }

  return template as TemplateVersion;
}

/**
 * Create new template version
 */
export async function createTemplateVersion(
  templateCode: string,
  subjectTemplate: string,
  htmlTemplate: string,
  textTemplate: string,
  createdBy?: string
): Promise<TemplateVersion> {
  // Get current max version
  const { data: currentVersions } = await supabaseAdmin
    .from('notification_templates')
    .select('version')
    .eq('template_code', templateCode)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = currentVersions && currentVersions.length > 0
    ? (currentVersions[0] as any).version + 1
    : 1;

  // Deactivate all previous versions
  await supabaseAdmin
    .from('notification_templates')
    .update({ is_active: false })
    .eq('template_code', templateCode);

  // Create new version
  const { data: newTemplate, error } = await supabaseAdmin
    .from('notification_templates')
    .insert({
      template_code: templateCode,
      version: nextVersion,
      subject_template: subjectTemplate,
      html_template: htmlTemplate,
      text_template: textTemplate,
      is_active: true,
      effective_from: new Date().toISOString(),
      created_by: createdBy,
    })
    .select()
    .single();

  if (error || !newTemplate) {
    throw new Error(`Failed to create template version: ${error?.message || 'Unknown error'}`);
  }

  return newTemplate as TemplateVersion;
}

/**
 * Rollback to previous template version
 */
export async function rollbackTemplate(
  templateCode: string,
  targetVersion: number
): Promise<void> {
  // Deactivate all versions
  await supabaseAdmin
    .from('notification_templates')
    .update({ is_active: false })
    .eq('template_code', templateCode);

  // Activate target version
  await supabaseAdmin
    .from('notification_templates')
    .update({
      is_active: true,
      effective_from: new Date().toISOString(),
    })
    .eq('template_code', templateCode)
    .eq('version', targetVersion);
}

/**
 * Store template version ID in notification
 */
export async function storeTemplateVersion(
  notificationId: string,
  templateVersionId: string
): Promise<void> {
  await supabaseAdmin
    .from('notifications')
    .update({
      metadata: {
        ...((await supabaseAdmin.from('notifications').select('metadata').eq('id', notificationId).single()).data?.metadata || {}),
        template_version_id: templateVersionId,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificationId);
}

