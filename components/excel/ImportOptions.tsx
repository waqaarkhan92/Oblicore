/**
 * Import Options Component
 * Checkboxes for import options (create missing sites, permits, skip duplicates)
 * Reference: docs/specs/60_Frontend_UI_UX_Design_System.md Section 3.2
 */

'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImportOptionsProps {
  createMissingSites: boolean;
  createMissingPermits: boolean;
  skipDuplicates: boolean;
  onOptionChange: (option: 'createMissingSites' | 'createMissingPermits' | 'skipDuplicates', value: boolean) => void;
  className?: string;
}

export function ImportOptions({
  createMissingSites,
  createMissingPermits,
  skipDuplicates,
  onOptionChange,
  className,
}: ImportOptionsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-semibold text-text-primary">Import Options</h3>
        <HelpCircle className="h-4 w-4 text-text-tertiary" />
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate hover:bg-background-tertiary cursor-pointer transition-colors">
          <Checkbox
            checked={createMissingSites}
            onChange={(checked) => onOptionChange('createMissingSites', checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary">Create missing sites</div>
            <div className="text-xs text-text-secondary mt-1">
              Automatically create new sites if site_id is not found in the system
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate hover:bg-background-tertiary cursor-pointer transition-colors">
          <Checkbox
            checked={createMissingPermits}
            onChange={(checked) => onOptionChange('createMissingPermits', checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary">Create missing permits</div>
            <div className="text-xs text-text-secondary mt-1">
              Automatically create new permit documents if permit_number is not found
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate hover:bg-background-tertiary cursor-pointer transition-colors">
          <Checkbox
            checked={skipDuplicates}
            onChange={(checked) => onOptionChange('skipDuplicates', checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary">Skip duplicates</div>
            <div className="text-xs text-text-secondary mt-1">
              Skip rows that match existing obligations (based on permit_number and obligation_title)
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}

