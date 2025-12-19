/**
 * Report Builder Service
 * Enables custom report generation and export with multiple format support
 * Reference: Custom Report Builder Feature
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  dataType: 'obligations' | 'evidence' | 'deadlines' | 'sites' | 'compliance';
  columns: string[];
  filters: ReportFilter[];
  dateRange?: { start: string; end: string };
  groupBy?: string;
  sortBy?: { column: string; direction: 'asc' | 'desc' };
  createdBy?: string;
  companyId?: string;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}

export interface ReportResult {
  data: any[];
  totalRows: number;
  columns: string[];
  generatedAt: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fileName?: string;
  includeHeaders?: boolean;
}

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const AVAILABLE_COLUMNS: Record<string, string[]> = {
  obligations: [
    'id',
    'obligation_title',
    'obligation_description',
    'summary',
    'category',
    'status',
    'deadline_date',
    'frequency',
    'assigned_to',
    'confidence_score',
    'created_at',
    'updated_at',
  ],
  evidence: [
    'id',
    'file_name',
    'file_size',
    'mime_type',
    'category',
    'description',
    'validation_status',
    'validated_at',
    'validated_by',
    'expiry_date',
    'is_archived',
    'created_at',
    'updated_at',
  ],
  deadlines: [
    'id',
    'due_date',
    'compliance_period',
    'status',
    'completed_at',
    'completed_by',
    'is_late',
    'sla_target_date',
    'sla_breached_at',
    'created_at',
  ],
  sites: [
    'id',
    'name',
    'site_name',
    'address',
    'postcode',
    'latitude',
    'longitude',
    'site_type',
    'status',
    'created_at',
    'updated_at',
  ],
  compliance: [
    'id',
    'site_id',
    'compliance_date',
    'compliance_status',
    'compliance_percentage',
    'total_obligations',
    'completed_obligations',
    'overdue_obligations',
    'risk_level',
    'created_at',
  ],
};

// ============================================================================
// REPORT BUILDER SERVICE
// ============================================================================

export class ReportBuilderService {
  /**
   * Save a report configuration to the database
   */
  async saveReportConfig(config: ReportConfig): Promise<string> {
    try {
      const configData = {
        name: config.name,
        description: config.description,
        data_type: config.dataType,
        columns: config.columns,
        filters: config.filters,
        date_range: config.dateRange,
        group_by: config.groupBy,
        sort_by: config.sortBy,
        created_by: config.createdBy,
        company_id: config.companyId,
      };

      if (config.id) {
        // Update existing config
        const { data, error } = await supabaseAdmin
          .from('report_configs')
          .update(configData)
          .eq('id', config.id)
          .select('id')
          .single();

        if (error) throw error;
        return data.id;
      } else {
        // Create new config
        const { data, error } = await supabaseAdmin
          .from('report_configs')
          .insert(configData)
          .select('id')
          .single();

        if (error) throw error;
        return data.id;
      }
    } catch (error) {
      console.error('Error saving report config:', error);
      throw new Error('Failed to save report configuration');
    }
  }

  /**
   * Get all saved report configurations for a company
   */
  async getReportConfigs(companyId: string): Promise<ReportConfig[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('report_configs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        dataType: row.data_type,
        columns: row.columns,
        filters: row.filters,
        dateRange: row.date_range,
        groupBy: row.group_by,
        sortBy: row.sort_by,
        createdBy: row.created_by,
        companyId: row.company_id,
      }));
    } catch (error) {
      console.error('Error fetching report configs:', error);
      throw new Error('Failed to fetch report configurations');
    }
  }

  /**
   * Delete a report configuration
   */
  async deleteReportConfig(configId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('report_configs')
        .delete()
        .eq('id', configId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting report config:', error);
      throw new Error('Failed to delete report configuration');
    }
  }

  /**
   * Generate a report based on the provided configuration
   */
  async generateReport(config: ReportConfig): Promise<ReportResult> {
    try {
      // Build the query based on data type
      let query = supabaseAdmin.from(this.getTableName(config.dataType)).select('*');

      // Apply company filter if provided
      if (config.companyId) {
        query = query.eq('company_id', config.companyId);
      }

      // Apply filters
      for (const filter of config.filters) {
        query = this.applyFilter(query, filter);
      }

      // Apply date range filter
      if (config.dateRange) {
        const dateField = this.getDateField(config.dataType);
        query = query
          .gte(dateField, config.dateRange.start)
          .lte(dateField, config.dateRange.end);
      }

      // Apply sorting
      if (config.sortBy) {
        query = query.order(config.sortBy.column, {
          ascending: config.sortBy.direction === 'asc',
        });
      }

      // Execute query
      const { data, error } = await query;

      if (error) throw error;

      // Filter columns if specified
      let resultData = data || [];
      if (config.columns && config.columns.length > 0) {
        resultData = resultData.map((row: any) => {
          const filteredRow: any = {};
          config.columns.forEach((col) => {
            if (row[col] !== undefined) {
              filteredRow[col] = row[col];
            }
          });
          return filteredRow;
        });
      }

      return {
        data: resultData,
        totalRows: resultData.length,
        columns: config.columns || Object.keys(resultData[0] || {}),
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Export report results to the specified format
   */
  async exportReport(result: ReportResult, options: ExportOptions): Promise<Buffer> {
    const fileName = options.fileName || `report_${Date.now()}`;
    const includeHeaders = options.includeHeaders !== false;

    try {
      switch (options.format) {
        case 'csv':
          return this.exportToCSV(result, includeHeaders);

        case 'xlsx':
          return this.exportToExcel(result, includeHeaders);

        case 'json':
          return Buffer.from(JSON.stringify(result.data, null, 2), 'utf-8');

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      throw new Error('Failed to export report');
    }
  }

  /**
   * Get available columns for a data type
   */
  getAvailableColumns(dataType: string): string[] {
    return AVAILABLE_COLUMNS[dataType] || [];
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get the table name for a data type
   */
  private getTableName(dataType: string): string {
    const tableMap: Record<string, string> = {
      obligations: 'obligations',
      evidence: 'evidence_items',
      deadlines: 'deadlines',
      sites: 'sites',
      compliance: 'compliance_scores',
    };
    return tableMap[dataType] || dataType;
  }

  /**
   * Get the date field for a data type
   */
  private getDateField(dataType: string): string {
    const dateFieldMap: Record<string, string> = {
      obligations: 'created_at',
      evidence: 'created_at',
      deadlines: 'due_date',
      sites: 'created_at',
      compliance: 'compliance_date',
    };
    return dateFieldMap[dataType] || 'created_at';
  }

  /**
   * Apply a filter to a Supabase query
   */
  private applyFilter(query: any, filter: ReportFilter): any {
    switch (filter.operator) {
      case 'eq':
        return query.eq(filter.field, filter.value);
      case 'neq':
        return query.neq(filter.field, filter.value);
      case 'gt':
        return query.gt(filter.field, filter.value);
      case 'lt':
        return query.lt(filter.field, filter.value);
      case 'gte':
        return query.gte(filter.field, filter.value);
      case 'lte':
        return query.lte(filter.field, filter.value);
      case 'contains':
        return query.ilike(filter.field, `%${filter.value}%`);
      case 'in':
        return query.in(filter.field, filter.value);
      default:
        return query;
    }
  }

  /**
   * Export report to CSV format
   */
  private exportToCSV(result: ReportResult, includeHeaders: boolean): Buffer {
    const rows: string[] = [];

    // Add headers
    if (includeHeaders && result.columns.length > 0) {
      rows.push(result.columns.map(this.escapeCSVValue).join(','));
    }

    // Add data rows
    result.data.forEach((row: any) => {
      const values = result.columns.map((col) => {
        const value = row[col];
        return this.escapeCSVValue(value);
      });
      rows.push(values.join(','));
    });

    return Buffer.from(rows.join('\n'), 'utf-8');
  }

  /**
   * Export report to Excel format
   */
  private exportToExcel(result: ReportResult, includeHeaders: boolean): Buffer {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Prepare data
      const worksheetData: any[] = [];

      // Add headers if requested
      if (includeHeaders && result.columns.length > 0) {
        worksheetData.push(result.columns);
      }

      // Add data rows
      result.data.forEach((row: any) => {
        const rowData = result.columns.map((col) => row[col] ?? '');
        worksheetData.push(rowData);
      });

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      return Buffer.from(excelBuffer);
    } catch (error) {
      console.error('Error creating Excel file, falling back to CSV:', error);
      // Fallback to CSV if Excel generation fails
      return this.exportToCSV(result, includeHeaders);
    }
  }

  /**
   * Escape a value for CSV format
   */
  private escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // Check if value needs to be quoted
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      // Escape double quotes by doubling them
      const escapedValue = stringValue.replace(/"/g, '""');
      return `"${escapedValue}"`;
    }

    return stringValue;
  }
}

// Export singleton instance
export const reportBuilderService = new ReportBuilderService();
