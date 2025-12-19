/**
 * Financial Impact Service
 * Provides financial risk assessment for compliance packs
 * Reference: Phase 2.2 - Financial Impact Section
 *
 * @example
 * ```typescript
 * import { financialImpactService } from '@/lib/services/financial-impact-service';
 *
 * // Generate complete financial impact assessment for a company
 * const result = await financialImpactService.generateFinancialImpact(companyId);
 * console.log(`Total fine exposure: £${result.fineExposure.total}`);
 * console.log(`Total remediation cost: £${result.remediationCost.total}`);
 * console.log(`Insurance risk: ${result.insuranceRisk.riskLevel}`);
 *
 * // Or calculate specific components
 * const fineExposure = await financialImpactService.calculateFineExposure(overdueObligations);
 * const remediationCost = await financialImpactService.estimateRemediationCost(obligations);
 * const insuranceRisk = await financialImpactService.assessInsuranceRisk(
 *   fineExposure.total,
 *   remediationCost.total
 * );
 * ```
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface FineBreakdownItem {
  obligationId: string;
  obligationTitle: string;
  regulatoryBody: string;
  maxFine: number;
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedFine: number;
  regulationReference: string;
}

export interface FinancialImpactResult {
  fineExposure: {
    total: number;
    breakdown: FineBreakdownItem[];
  };
  remediationCost: {
    total: number;
    byCategory: Record<string, number>;
  };
  insuranceRisk: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    premiumImpact: number;
  };
  assessedAt: string;
}

// Fine calculation constants based on UK environmental regulations
const REGULATORY_FINES = {
  EPR_2016: 50000, // Environmental Permitting Regulations 2016
  WATER_RESOURCES_ACT: 100000, // Water Resources Act (unlimited, using baseline)
  MCPD: 50000, // Medium Combustion Plant Directive
  HAZARDOUS_WASTE: 250000, // Hazardous Waste Regulations
  DEFAULT: 50000, // Default for unknown regulations
};

// Likelihood multipliers for fine estimation
const LIKELIHOOD_MULTIPLIERS = {
  LOW: 0.1,
  MEDIUM: 0.3,
  HIGH: 0.6,
};

// Remediation cost ranges by category (in GBP)
const REMEDIATION_COSTS = {
  MONITORING: { min: 2000, max: 10000 },
  REPORTING: { min: 1000, max: 5000 },
  OPERATIONAL: { min: 5000, max: 50000 },
  MAINTENANCE: { min: 3000, max: 20000 },
  RECORD_KEEPING: { min: 1000, max: 5000 }, // Added for completeness
};

// Insurance risk thresholds
const INSURANCE_RISK_THRESHOLDS = {
  LOW: 50000,
  MEDIUM: 150000,
  HIGH: 300000,
};

export class FinancialImpactService {
  /**
   * Calculate fine exposure for overdue obligations
   */
  async calculateFineExposure(
    overdueObligations: Array<{
      id: string;
      obligation_title: string;
      category: string;
      document_id: string;
      deadline_date: string | null;
      status: string;
    }>
  ): Promise<{ total: number; breakdown: FineBreakdownItem[] }> {
    if (!overdueObligations || overdueObligations.length === 0) {
      return { total: 0, breakdown: [] };
    }

    const breakdown: FineBreakdownItem[] = [];

    // Fetch document details for regulatory body and reference
    const documentIds = Array.from(
      new Set(overdueObligations.map((o) => o.document_id))
    );
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('id, regulator, reference_number, document_type')
      .in('id', documentIds);

    interface DocumentData {
      id: string;
      regulator: string | null;
      reference_number: string | null;
      document_type: string;
    }

    const documentMap = new Map<string, DocumentData>(
      (documents || []).map((doc: DocumentData) => [doc.id, doc])
    );

    for (const obligation of overdueObligations) {
      const document = documentMap.get(obligation.document_id);
      const regulatoryBody = document?.regulator || 'UNKNOWN';
      const documentType = document?.document_type || 'UNKNOWN';
      const regulationReference = document?.reference_number || 'N/A';

      // Determine max fine based on document type and regulator
      const maxFine = this.getMaxFine(documentType, regulatoryBody);

      // Calculate likelihood based on how overdue and obligation status
      const likelihood = this.calculateLikelihood(
        obligation.deadline_date,
        obligation.status
      );

      // Calculate estimated fine
      const estimatedFine = Math.round(
        maxFine * LIKELIHOOD_MULTIPLIERS[likelihood]
      );

      breakdown.push({
        obligationId: obligation.id,
        obligationTitle: obligation.obligation_title,
        regulatoryBody,
        maxFine,
        likelihood,
        estimatedFine,
        regulationReference,
      });
    }

    const total = breakdown.reduce((sum, item) => sum + item.estimatedFine, 0);

    return { total, breakdown };
  }

  /**
   * Estimate remediation cost for obligations
   */
  async estimateRemediationCost(
    obligations: Array<{
      id: string;
      category: string;
      status: string;
    }>
  ): Promise<{ total: number; byCategory: Record<string, number> }> {
    if (!obligations || obligations.length === 0) {
      return { total: 0, byCategory: {} };
    }

    const byCategory: Record<string, number> = {};

    for (const obligation of obligations) {
      const category = obligation.category as keyof typeof REMEDIATION_COSTS;
      const costRange =
        REMEDIATION_COSTS[category] || REMEDIATION_COSTS.OPERATIONAL;

      // Use average cost for estimation
      const estimatedCost = (costRange.min + costRange.max) / 2;

      // Apply multiplier based on status severity
      const statusMultiplier = this.getStatusMultiplier(obligation.status);
      const adjustedCost = Math.round(estimatedCost * statusMultiplier);

      if (!byCategory[category]) {
        byCategory[category] = 0;
      }
      byCategory[category] += adjustedCost;
    }

    const total = Object.values(byCategory).reduce((sum, cost) => sum + cost, 0);

    return { total, byCategory };
  }

  /**
   * Assess insurance risk based on fine exposure and remediation costs
   */
  async assessInsuranceRisk(
    fineExposureTotal: number,
    remediationCostTotal: number
  ): Promise<{ riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; premiumImpact: number }> {
    const totalExposure = fineExposureTotal + remediationCostTotal;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    let premiumImpact: number;

    if (totalExposure < INSURANCE_RISK_THRESHOLDS.LOW) {
      riskLevel = 'LOW';
      premiumImpact = Math.round(totalExposure * 0.02); // 2% of exposure
    } else if (totalExposure < INSURANCE_RISK_THRESHOLDS.MEDIUM) {
      riskLevel = 'MEDIUM';
      premiumImpact = Math.round(totalExposure * 0.05); // 5% of exposure
    } else {
      riskLevel = 'HIGH';
      premiumImpact = Math.round(totalExposure * 0.10); // 10% of exposure
    }

    return { riskLevel, premiumImpact };
  }

  /**
   * Generate complete financial impact assessment
   */
  async generateFinancialImpact(
    companyId: string,
    siteId?: string
  ): Promise<FinancialImpactResult> {
    // Fetch overdue obligations
    let overdueQuery = supabaseAdmin
      .from('obligations')
      .select('id, obligation_title, category, document_id, deadline_date, status')
      .eq('company_id', companyId)
      .eq('status', 'OVERDUE')
      .is('deleted_at', null);

    if (siteId) {
      overdueQuery = overdueQuery.eq('site_id', siteId);
    }

    const { data: overdueObligations } = await overdueQuery;

    // Fetch all incomplete obligations for remediation cost estimation
    let incompleteQuery = supabaseAdmin
      .from('obligations')
      .select('id, category, status')
      .eq('company_id', companyId)
      .in('status', ['PENDING', 'IN_PROGRESS', 'DUE_SOON', 'OVERDUE', 'INCOMPLETE'])
      .is('deleted_at', null);

    if (siteId) {
      incompleteQuery = incompleteQuery.eq('site_id', siteId);
    }

    const { data: incompleteObligations } = await incompleteQuery;

    // Calculate fine exposure
    const fineExposure = await this.calculateFineExposure(
      overdueObligations || []
    );

    // Estimate remediation costs
    const remediationCost = await this.estimateRemediationCost(
      incompleteObligations || []
    );

    // Assess insurance risk
    const insuranceRisk = await this.assessInsuranceRisk(
      fineExposure.total,
      remediationCost.total
    );

    return {
      fineExposure,
      remediationCost,
      insuranceRisk,
      assessedAt: new Date().toISOString(),
    };
  }

  /**
   * Get maximum fine based on document type and regulator
   */
  private getMaxFine(documentType: string, regulator: string): number {
    switch (documentType) {
      case 'ENVIRONMENTAL_PERMIT':
        return REGULATORY_FINES.EPR_2016;
      case 'TRADE_EFFLUENT_CONSENT':
        return REGULATORY_FINES.WATER_RESOURCES_ACT;
      case 'MCPD_REGISTRATION':
        return REGULATORY_FINES.MCPD;
      default:
        // Check for hazardous waste based on regulator
        if (regulator === 'EA' || regulator === 'SEPA' || regulator === 'NRW') {
          return REGULATORY_FINES.HAZARDOUS_WASTE;
        }
        return REGULATORY_FINES.DEFAULT;
    }
  }

  /**
   * Calculate likelihood of fine based on how overdue the obligation is
   */
  private calculateLikelihood(
    deadlineDate: string | null,
    status: string
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (!deadlineDate) {
      return 'LOW';
    }

    const deadline = new Date(deadlineDate);
    const now = new Date();
    const daysOverdue = Math.floor(
      (now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)
    );

    // HIGH: More than 30 days overdue
    if (daysOverdue > 30) {
      return 'HIGH';
    }

    // MEDIUM: 7-30 days overdue
    if (daysOverdue > 7) {
      return 'MEDIUM';
    }

    // LOW: Less than 7 days overdue
    return 'LOW';
  }

  /**
   * Get status multiplier for remediation cost estimation
   */
  private getStatusMultiplier(status: string): number {
    switch (status) {
      case 'OVERDUE':
        return 1.5; // 50% higher cost due to urgency
      case 'INCOMPLETE':
        return 1.3; // 30% higher cost
      case 'DUE_SOON':
        return 1.2; // 20% higher cost
      case 'IN_PROGRESS':
        return 1.0; // Normal cost
      case 'PENDING':
        return 0.8; // 20% lower cost (proactive)
      default:
        return 1.0;
    }
  }
}

// Export singleton instance
export const financialImpactService = new FinancialImpactService();
