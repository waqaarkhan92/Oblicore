/**
 * Services Index
 * Central export point for all service modules
 * Reference: Phase 4.1 - Service Layer Abstraction
 */

// ============================================================================
// CORE DATA SERVICES
// ============================================================================

// Obligation Service
export { obligationService, ObligationService } from './obligation-service';
export type {
  Obligation,
  ObligationWithRelations,
  GetObligationsOptions,
  ObligationStats,
  ObligationStatus,
  ObligationCategory,
} from './obligation-service';

// Evidence Service
export { evidenceService, EvidenceService } from './evidence-service';
export type {
  EvidenceItem,
  EvidenceWithRelations,
  GetEvidenceOptions,
  EvidenceStats,
  ValidationStatus,
} from './evidence-service';

// Deadline Service
export { deadlineService, DeadlineService } from './deadline-service';
export type {
  Deadline,
  DeadlineWithRelations,
  GetDeadlinesOptions,
  DeadlineStats,
  DeadlineStatus,
} from './deadline-service';

// ============================================================================
// NOTIFICATION SERVICES
// ============================================================================

// Notification Service
export { notificationService, NotificationService } from './notification-service';
export type {
  Notification,
  CreateNotificationParams,
  GetNotificationsOptions,
} from './notification-service';

// Email Service
export { sendEmail } from './email-service';
export type { EmailOptions, EmailResult } from './email-service';

// SMS Notification Service
export { smsNotificationService } from './sms-notification-service';

// Digest Service
export {
  queueForDigest,
  getDigestNotifications,
  generateDigestContent,
  markDigestNotificationsAsSent,
} from './digest-service';
export type { DigestNotification } from './digest-service';

// ============================================================================
// AUDIT AND TRACKING SERVICES
// ============================================================================

// Audit Service
export { auditService, AuditService } from './audit-service';
export type {
  AuditLog,
  GetAuditLogsOptions,
  EntityType,
  AuditAction,
} from './audit-service';

// Activity Feed Service
export { activityFeedService, ActivityFeedService } from './activity-feed-service';
export type { ActivityType, ActivityEntry } from './activity-feed-service';

// Comment Service
export { commentService, CommentService } from './comment-service';
export type {
  Comment,
  CreateCommentParams,
  UpdateCommentParams,
  GetCommentsOptions,
} from './comment-service';

// ============================================================================
// ESCALATION AND ALERTING SERVICES
// ============================================================================

// Escalation Service
export {
  getEscalationRecipients,
  checkEscalation,
  createEscalationNotification,
} from './escalation-service';
export type {
  EscalationRecipient,
  EscalationCheckResult,
} from './escalation-service';

// Escalation Workflow Service
export {
  matchEscalationWorkflow,
  determineEscalationLevel,
  getEscalationRecipientsFromWorkflow,
  getCurrentEscalationLevel,
  createOrUpdateEscalation,
  getSystemDefaultWorkflow,
} from './escalation-workflow-service';
export type {
  EscalationWorkflow,
  EscalationMatchResult,
} from './escalation-workflow-service';

// Approval Workflow Service
export {
  determineApprovalRequirement,
  canUserApprove,
  submitApproval,
  getApprovalStatus,
  getPendingLevel2Approvals,
  escalateToLevel2,
  initializeApprovalMetadata,
  getApprovalLevelBadge,
} from './approval-workflow-service';
export type {
  ApprovalRequirement,
  ApprovalStatus,
  ApprovalAction,
  ReviewQueueItem,
} from './approval-workflow-service';

// ============================================================================
// SCORING AND COMPLIANCE SERVICES
// ============================================================================

// Risk Score Service
export { riskScoreService, RiskScoreService } from './risk-score-service';
export type { RiskFactors, RiskScore } from './risk-score-service';

// Compliance Score Service
export {
  calculateModuleComplianceScore,
  calculateSiteComplianceScore,
} from './compliance-score-service';
export type {
  ComplianceScoreResult,
  ModuleComplianceScore,
} from './compliance-score-service';

// Compliance Scorecard Service
export {
  calculateComplianceScore,
  getTopActions,
  getTrendIndicator,
  getScorecardData,
} from './compliance-scorecard-service';
export type {
  RAGStatus,
  TrendIndicator,
  UrgencyLevel,
  TopAction,
  ScorecardData,
} from './compliance-scorecard-service';

// Financial Impact Service
export { financialImpactService, FinancialImpactService } from './financial-impact-service';
export type {
  FineBreakdownItem,
  FinancialImpactResult,
} from './financial-impact-service';

// ============================================================================
// ENVIRONMENTAL AND ELV SERVICES
// ============================================================================

// ELV Headroom Service
export { elvHeadroomService, ELVHeadroomService } from './elv-headroom-service';
export type {
  ELVParameter,
  ELVReading,
  HeadroomResult,
  Exceedance,
  ELVSummary,
} from './elv-headroom-service';

// Emission Calculation Service
export {
  calculateGeneratorEmissions,
  calculateAnnualEmissionsSummary,
  storeEmissionCalculation,
} from './emission-calculation-service';
export type {
  EmissionCalculationResult,
  AnnualEmissionsSummary,
} from './emission-calculation-service';

// ============================================================================
// PACK AND DOCUMENT SERVICES
// ============================================================================

// Pack Engine Service
export { packEngineService } from './pack-engine-service';

// Document Grounding Service
export { documentGroundingService, DocumentGroundingService } from './document-grounding-service';
export type {
  TextMatch,
  HighlightRange,
  ValidationResult,
  DocumentSegment,
} from './document-grounding-service';

// ============================================================================
// AI AND EXTRACTION SERVICES
// ============================================================================

// AI Budget Service
export {
  getAIBudgetService,
  AIBudgetService,
  calculateCost,
  AI_PRICING,
} from './ai-budget-service';
export type {
  AIModel,
  UsageRecord,
  BudgetStatus,
  BudgetAlert,
} from './ai-budget-service';

// AI Analytics Service
export { aiAnalyticsService, AIAnalyticsService } from './ai-analytics-service';
export type {
  DateRangeOptions,
  AnalyticsOptions,
  PatternHitRate,
  CostTrend,
  CostMetrics,
  PatternSummary,
  PatternLibraryHealth,
  ExtractionStats,
} from './ai-analytics-service';

// Extraction Progress Service
export {
  updateExtractionProgress,
  getExtractionProgress,
  clearExtractionProgress,
  subscribeToProgress,
  formatProgressMessage,
} from './extraction-progress-service';
export type { ExtractionProgress } from './extraction-progress-service';

// ============================================================================
// INTEGRATION AND UTILITY SERVICES
// ============================================================================

// Webhook Service
export {
  webhookService,
  WebhookService,
  generateWebhookSecret,
  verifyWebhookSignature,
} from './webhook-service';
export type {
  WebhookEventType,
  WebhookPayload,
  WebhookConfig,
} from './webhook-service';

// iCal Service
export { icalService } from './ical-service';

// Diff Service
export {
  computeObjectDiff,
  computeTextDiff,
  formatUnifiedDiff,
} from './diff-service';
export type {
  DiffResult,
  TextDiffLine,
  TextDiffResult,
  TextDiffHunk,
} from './diff-service';

// Rate Limit Service
export {
  checkRateLimit,
  recordRateLimitUsage,
  getRateLimitStatus,
} from './rate-limit-service';
export type {
  RateLimitKey,
  RateLimitCheck,
} from './rate-limit-service';

// ============================================================================
// SUBSCRIPTION AND PREFERENCE SERVICES
// ============================================================================

// Subscription Service
export {
  canAccessPackType,
  canDistributePack,
  getAvailablePackTypes,
  getAvailableDistributionMethods,
} from './subscription-service';
export type {
  SubscriptionTier,
  PackType,
  DistributionMethod,
  PackAccessResult,
} from './subscription-service';

// Notification Preferences Service
export {
  getUserPreferences,
  shouldSendNotification,
} from './notification-preferences-service';
export type { NotificationPreference } from './notification-preferences-service';

// Template Versioning Service
export {
  getActiveTemplate,
  createTemplateVersion,
  rollbackTemplate,
  storeTemplateVersion,
} from './template-versioning-service';
export type { TemplateVersion } from './template-versioning-service';

// ============================================================================
// REPORTING SERVICES
// ============================================================================

// Report Builder Service
export { reportBuilderService, ReportBuilderService } from './report-builder-service';
export type {
  ReportConfig,
  ReportFilter,
  ReportResult,
  ExportOptions,
} from './report-builder-service';

// ============================================================================
// OFFLINE SYNC SERVICES
// ============================================================================

// Offline Sync Service (PWA Mobile)
export { offlineSyncService, OfflineSyncService } from './offline-sync-service';
export type {
  OfflineQueueItem,
  SyncResult,
  SyncStatus,
  ConflictResolution,
} from './offline-sync-service';
