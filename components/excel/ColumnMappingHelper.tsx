/**
 * Column Mapping Helper Component
 * Helps users map Excel columns to system fields
 * Reference: docs/specs/60_Frontend_UI_UX_Design_System.md Section 3.2
 */

'use client';

import * as React from 'react';
import { HelpCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dropdown } from '@/components/ui/dropdown';

export interface ColumnMappingHelperProps {
  excelColumns: string[];
  systemFields: string[];
  currentMapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  className?: string;
  autoDetect?: boolean;
}

const SYSTEM_FIELD_DESCRIPTIONS: Record<string, string> = {
  permit_number: 'Permit reference number (e.g., EPR/12345/001)',
  obligation_title: 'Title or summary of the obligation',
  frequency: 'Frequency: DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME',
  deadline_date: 'Deadline date in YYYY-MM-DD format',
  site_id: 'Site identifier (UUID)',
  category: 'Category: MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE',
  is_subjective: 'Boolean: true or false',
  description: 'Full description of the obligation',
};

export function ColumnMappingHelper({
  excelColumns,
  systemFields,
  currentMapping,
  onMappingChange,
  className,
  autoDetect = true,
}: ColumnMappingHelperProps) {
  const [mapping, setMapping] = React.useState<Record<string, string>>(currentMapping);
  const [autoDetected, setAutoDetected] = React.useState(false);

  // Auto-detect column mappings using fuzzy matching
  React.useEffect(() => {
    if (autoDetect && !autoDetected && excelColumns.length > 0) {
      const detected: Record<string, string> = {};
      
      excelColumns.forEach((excelCol) => {
        const normalized = excelCol.toLowerCase().replace(/[_\s-]/g, '');
        
        // Try to find best match
        for (const systemField of systemFields) {
          const normalizedSystem = systemField.toLowerCase().replace(/[_\s-]/g, '');
          
          // Exact match
          if (normalized === normalizedSystem) {
            detected[excelCol] = systemField;
            break;
          }
          
          // Partial match
          if (normalized.includes(normalizedSystem) || normalizedSystem.includes(normalized)) {
            detected[excelCol] = systemField;
            break;
          }
        }
      });
      
      if (Object.keys(detected).length > 0) {
        setMapping(detected);
        setAutoDetected(true);
        onMappingChange(detected);
      }
    }
  }, [excelColumns, systemFields, autoDetect, autoDetected, onMappingChange]);

  const handleMappingChange = (excelColumn: string, systemField: string) => {
    const newMapping = { ...mapping, [excelColumn]: systemField };
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const getMappingStatus = (excelColumn: string): 'mapped' | 'unmapped' | 'duplicate' => {
    if (!mapping[excelColumn]) return 'unmapped';
    
    // Check for duplicates
    const mappedFields = Object.values(mapping);
    const count = mappedFields.filter(f => f === mapping[excelColumn]).length;
    if (count > 1) return 'duplicate';
    
    return 'mapped';
  };

  const requiredFields = ['permit_number', 'obligation_title', 'frequency'];
  const optionalFields = systemFields.filter(f => !requiredFields.includes(f));

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-text-primary">Map Excel Columns to System Fields</h3>
      </div>

      <div className="bg-background-tertiary rounded-lg p-4 border border-slate">
        <p className="text-sm text-text-secondary mb-4">
          Match each Excel column to the corresponding system field. Required fields are marked with *.
        </p>

        <div className="space-y-3">
          {excelColumns.map((excelCol) => {
            const status = getMappingStatus(excelCol);
            const isRequired = requiredFields.includes(mapping[excelCol] || '');
            
            return (
              <div
                key={excelCol}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-lg border',
                  status === 'mapped' && 'bg-success/5 border-success/20',
                  status === 'unmapped' && 'bg-background-primary border-slate',
                  status === 'duplicate' && 'bg-warning/5 border-warning/20'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">{excelCol}</span>
                    {isRequired && <span className="text-xs text-danger">*</span>}
                    {status === 'mapped' && (
                      <CheckCircle className="h-4 w-4 text-success" />
                    )}
                    {status === 'duplicate' && (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  {mapping[excelCol] && SYSTEM_FIELD_DESCRIPTIONS[mapping[excelCol]] && (
                    <p className="text-xs text-text-tertiary">
                      {SYSTEM_FIELD_DESCRIPTIONS[mapping[excelCol]]}
                    </p>
                  )}
                  {status === 'duplicate' && (
                    <p className="text-xs text-warning mt-1">
                      This field is mapped to multiple columns
                    </p>
                  )}
                </div>
                <div className="w-48">
                  <Dropdown
                    value={mapping[excelCol] || ''}
                    onChange={(value) => handleMappingChange(excelCol, value)}
                    options={[
                      { value: '', label: 'Select field...' },
                      ...requiredFields.map(f => ({
                        value: f,
                        label: `${f} *`,
                      })),
                      ...optionalFields.map(f => ({
                        value: f,
                        label: f,
                      })),
                    ]}
                    placeholder="Select field"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-text-secondary">
              {Object.values(mapping).filter(Boolean).length} of {excelColumns.length} columns mapped
            </span>
          </div>
        </div>
        <div className="text-text-tertiary">
          {requiredFields.filter(f => !Object.values(mapping).includes(f)).length > 0 && (
            <span className="text-warning">
              {requiredFields.filter(f => !Object.values(mapping).includes(f)).length} required field(s) missing
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

