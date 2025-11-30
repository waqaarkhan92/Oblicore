/**
 * Import Preview Component
 * Shows preview of Excel import with valid rows, errors, and warnings
 * Reference: docs/specs/60_Frontend_UI_UX_Design_System.md Section 3.2
 */

'use client';

import * as React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Edit2, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ImportRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'valid' | 'error' | 'warning';
  errors?: string[];
  warnings?: string[];
}

export interface ImportPreviewProps {
  importId: string;
  validRows: ImportRow[];
  errors: ImportRow[];
  warnings: ImportRow[];
  onConfirm: () => void;
  onEdit?: (rowIndex: number) => void;
  onSkip?: (rowIndex: number) => void;
  onCancel?: () => void;
  className?: string;
  showColumnMapping?: boolean;
  columnMapping?: Record<string, string>;
}

export function ImportPreview({
  importId,
  validRows,
  errors,
  warnings,
  onConfirm,
  onEdit,
  onSkip,
  onCancel,
  className,
  showColumnMapping = false,
  columnMapping,
}: ImportPreviewProps) {
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
  const [filter, setFilter] = React.useState<'all' | 'valid' | 'error' | 'warning'>('all');

  const allRows = React.useMemo(() => {
    return [...validRows, ...warnings, ...errors].sort((a, b) => a.rowNumber - b.rowNumber);
  }, [validRows, warnings, errors]);

  const filteredRows = React.useMemo(() => {
    if (filter === 'all') return allRows;
    return allRows.filter(row => row.status === filter);
  }, [allRows, filter]);

  const toggleRowSelection = (rowNumber: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber);
    } else {
      newSelected.add(rowNumber);
    }
    setSelectedRows(newSelected);
  };

  const selectAll = () => {
    if (selectedRows.size === filteredRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredRows.map(r => r.rowNumber)));
    }
  };

  const getStatusIcon = (status: ImportRow['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-danger" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusBadge = (status: ImportRow['status']) => {
    const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
    switch (status) {
      case 'valid':
        return cn(baseClasses, 'bg-success/10 text-success');
      case 'error':
        return cn(baseClasses, 'bg-danger/10 text-danger');
      case 'warning':
        return cn(baseClasses, 'bg-warning/10 text-warning');
    }
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background-primary rounded-lg p-4 border border-slate">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="text-sm font-medium text-text-secondary">Valid</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{validRows.length}</p>
        </div>
        <div className="bg-background-primary rounded-lg p-4 border border-slate">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-5 w-5 text-danger" />
            <span className="text-sm font-medium text-text-secondary">Errors</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{errors.length}</p>
        </div>
        <div className="bg-background-primary rounded-lg p-4 border border-slate">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span className="text-sm font-medium text-text-secondary">Warnings</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{warnings.length}</p>
        </div>
        <div className="bg-background-primary rounded-lg p-4 border border-slate">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-text-secondary">Total</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{allRows.length}</p>
        </div>
      </div>

      {/* Column Mapping Display */}
      {showColumnMapping && columnMapping && (
        <div className="bg-background-tertiary rounded-lg p-4 border border-slate">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Column Mapping</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {Object.entries(columnMapping).map(([excelCol, systemField]) => (
              <div key={excelCol} className="flex items-center gap-2">
                <span className="text-text-secondary">{excelCol}</span>
                <span className="text-text-tertiary">→</span>
                <span className="text-text-primary font-medium">{systemField}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-secondary">Filter:</span>
        {(['all', 'valid', 'error', 'warning'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              filter === f
                ? 'bg-primary text-white'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Preview Table */}
      <div className="bg-background-primary rounded-lg border border-slate overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-tertiary border-b border-slate">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                    onChange={selectAll}
                    className="rounded border-input-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                  Row
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                  Data Preview
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                  Issues
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate">
              {filteredRows.map((row) => (
                <tr
                  key={row.rowNumber}
                  className={cn(
                    'hover:bg-background-tertiary transition-colors',
                    row.status === 'error' && 'bg-danger/5'
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.rowNumber)}
                      onChange={() => toggleRowSelection(row.rowNumber)}
                      className="rounded border-input-border"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary font-medium">
                    {row.rowNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(row.status)}
                      <span className={getStatusBadge(row.status)}>
                        {row.status.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-text-secondary">
                      {Object.entries(row.data)
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <div key={key} className="truncate max-w-xs">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      {Object.keys(row.data).length > 3 && (
                        <div className="text-text-tertiary">
                          +{Object.keys(row.data).length - 3} more fields
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {row.errors?.map((error, idx) => (
                        <div key={idx} className="text-xs text-danger">
                          {error}
                        </div>
                      ))}
                      {row.warnings?.map((warning, idx) => (
                        <div key={idx} className="text-xs text-warning">
                          {warning}
                        </div>
                      ))}
                      {!row.errors?.length && !row.warnings?.length && (
                        <span className="text-xs text-text-tertiary">No issues</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.status === 'error' && onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(row.rowNumber)}
                          className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Edit row"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {(row.status === 'error' || row.status === 'warning') && onSkip && (
                        <button
                          type="button"
                          onClick={() => onSkip(row.rowNumber)}
                          className="p-1 text-warning hover:bg-warning/10 rounded transition-colors"
                          title="Skip row"
                        >
                          <SkipForward className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate">
        <div className="text-sm text-text-secondary">
          {selectedRows.size > 0 && (
            <span>{selectedRows.size} row(s) selected</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={validRows.length === 0}
          >
            Confirm Import ({validRows.length} valid rows)
          </Button>
        </div>
      </div>
    </div>
  );
}

