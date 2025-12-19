'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  FileText,
  TrendingUp,
  AlertCircle,
  Users,
  Calendar,
  DollarSign,
  Download,
  Plus,
  X,
  Save,
  Play,
  Trash2,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import {
  ResourceForecast,
  UserActivityReport,
  CostSummaryWidget,
} from '@/components/enhanced-features';

type ReportView = 'overview' | 'user-activity' | 'resource-forecast' | 'cost-analysis' | 'builder';

interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  dataType: 'obligations' | 'evidence' | 'deadlines' | 'sites' | 'compliance';
  columns: string[];
  filters: ReportFilter[];
  dateRange?: { start: string; end: string };
  sortBy?: { column: string; direction: 'asc' | 'desc' };
}

interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}

interface ReportResult {
  data: any[];
  totalRows: number;
  columns: string[];
  generatedAt: string;
}

const reportTypes = [
  {
    id: 'compliance-summary',
    name: 'Compliance Summary',
    description: 'Overview of compliance status across all sites',
    icon: BarChart3,
    color: 'text-blue-600',
  },
  {
    id: 'deadline-report',
    name: 'Deadline Report',
    description: 'Upcoming and overdue deadlines',
    icon: AlertCircle,
    color: 'text-red-600',
  },
  {
    id: 'obligation-status',
    name: 'Obligation Status',
    description: 'Status of all obligations by category',
    icon: FileText,
    color: 'text-green-600',
  },
  {
    id: 'trend-analysis',
    name: 'Trend Analysis',
    description: 'Compliance trends over time',
    icon: TrendingUp,
    color: 'text-purple-600',
  },
];

const DATA_TYPES = [
  { value: 'obligations', label: 'Obligations' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'deadlines', label: 'Deadlines' },
  { value: 'sites', label: 'Sites' },
  { value: 'compliance', label: 'Compliance Scores' },
];

const FILTER_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'lt', label: 'Less Than' },
  { value: 'gte', label: 'Greater Than or Equal' },
  { value: 'lte', label: 'Less Than or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'in', label: 'In List' },
];

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<ReportView>('overview');

  // Report Builder State
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    dataType: 'obligations',
    columns: [],
    filters: [],
    sortBy: undefined,
    dateRange: undefined,
  });

  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  // Fetch available columns when data type changes
  const { data: columnsData } = useQuery({
    queryKey: ['report-columns', reportConfig.dataType],
    queryFn: async () => {
      const response = await fetch(`/api/v1/reports/columns?dataType=${reportConfig.dataType}`);
      if (!response.ok) throw new Error('Failed to fetch columns');
      return response.json();
    },
    enabled: activeView === 'builder',
  });

  // Fetch saved report configs
  const { data: savedConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ['report-configs'],
    queryFn: async () => {
      const response = await fetch('/api/v1/reports/configs');
      if (!response.ok) throw new Error('Failed to fetch report configs');
      return response.json();
    },
    enabled: activeView === 'builder',
  });

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: async (config: ReportConfig) => {
      const response = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to generate report');
      return response.json();
    },
    onSuccess: (data) => {
      setReportResult(data);
      toast.success('Report generated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate report');
    },
  });

  // Save report config mutation
  const saveMutation = useMutation({
    mutationFn: async (config: ReportConfig) => {
      const response = await fetch('/api/v1/reports/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to save report config');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Report configuration saved');
      setShowSaveModal(false);
      queryClient.invalidateQueries({ queryKey: ['report-configs'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save report configuration');
    },
  });

  // Export report mutation
  const exportMutation = useMutation({
    mutationFn: async ({ format }: { format: 'csv' | 'xlsx' | 'json' }) => {
      const response = await fetch('/api/v1/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: reportResult, format }),
      });
      if (!response.ok) throw new Error('Failed to export report');
      return { blob: await response.blob(), format };
    },
    onSuccess: ({ blob, format }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to export report');
    },
  });

  // Delete config mutation
  const deleteMutation = useMutation({
    mutationFn: async (configId: string) => {
      const response = await fetch(`/api/v1/reports/configs/${configId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete report config');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Report configuration deleted');
      queryClient.invalidateQueries({ queryKey: ['report-configs'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete report configuration');
    },
  });

  // Update available columns when columnsData changes
  useState(() => {
    if (columnsData?.columns) {
      setAvailableColumns(columnsData.columns);
    }
  });

  const addFilter = () => {
    setReportConfig({
      ...reportConfig,
      filters: [...reportConfig.filters, { field: '', operator: 'eq', value: '' }],
    });
  };

  const removeFilter = (index: number) => {
    setReportConfig({
      ...reportConfig,
      filters: reportConfig.filters.filter((_, i) => i !== index),
    });
  };

  const updateFilter = (index: number, updates: Partial<ReportFilter>) => {
    const newFilters = [...reportConfig.filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setReportConfig({ ...reportConfig, filters: newFilters });
  };

  const toggleColumn = (column: string) => {
    const newColumns = reportConfig.columns.includes(column)
      ? reportConfig.columns.filter((c) => c !== column)
      : [...reportConfig.columns, column];
    setReportConfig({ ...reportConfig, columns: newColumns });
  };

  const loadSavedConfig = (config: ReportConfig) => {
    setReportConfig(config);
    setReportResult(null);
  };

  const views = [
    { id: 'overview' as const, label: 'Report Types', icon: FileText },
    { id: 'builder' as const, label: 'Report Builder', icon: Plus },
    { id: 'user-activity' as const, label: 'User Activity', icon: Users },
    { id: 'resource-forecast' as const, label: 'Resource Forecast', icon: Calendar },
    { id: 'cost-analysis' as const, label: 'Cost Analysis', icon: DollarSign },
  ];

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Reports' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <PageHeader
        title="Reports"
        description="Generate and view compliance reports"
      />

      {/* View Toggle */}
      <div className="flex flex-wrap gap-2">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === view.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Overview - Report Type Cards */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <Icon className={`h-8 w-8 ${report.color}`} />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Report Builder */}
      {activeView === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Report Configuration</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Type
                  </label>
                  <select
                    value={reportConfig.dataType}
                    onChange={(e) =>
                      setReportConfig({
                        ...reportConfig,
                        dataType: e.target.value as any,
                        columns: [],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {DATA_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={reportConfig.dateRange?.start || ''}
                      onChange={(e) =>
                        setReportConfig({
                          ...reportConfig,
                          dateRange: {
                            start: e.target.value,
                            end: reportConfig.dateRange?.end || '',
                          },
                        })
                      }
                      placeholder="Start Date"
                    />
                    <Input
                      type="date"
                      value={reportConfig.dateRange?.end || ''}
                      onChange={(e) =>
                        setReportConfig({
                          ...reportConfig,
                          dateRange: {
                            start: reportConfig.dateRange?.start || '',
                            end: e.target.value,
                          },
                        })
                      }
                      placeholder="End Date"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Select Columns</h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(columnsData?.columns || []).map((column: string) => (
                  <label
                    key={column}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={reportConfig.columns.includes(column)}
                      onChange={() => toggleColumn(column)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{column}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
                <Button onClick={addFilter} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </div>

              <div className="space-y-3">
                {reportConfig.filters.map((filter, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={filter.field}
                      onChange={(e) => updateFilter(index, { field: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select Field</option>
                      {(columnsData?.columns || []).map((col: string) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {FILTER_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    <Input
                      value={filter.value}
                      onChange={(e) => updateFilter(index, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1"
                    />

                    <button
                      onClick={() => removeFilter(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {reportConfig.filters.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No filters added. Click "Add Filter" to add one.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => generateMutation.mutate(reportConfig)}
                disabled={generateMutation.isPending || reportConfig.columns.length === 0}
                variant="primary"
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button
                onClick={() => setShowSaveModal(true)}
                disabled={reportConfig.columns.length === 0}
                variant="outline"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Config
              </Button>
            </div>

            {/* Report Preview */}
            {reportResult && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Report Preview</h3>
                    <p className="text-sm text-gray-500">
                      {reportResult.totalRows} rows | Generated at{' '}
                      {new Date(reportResult.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => exportMutation.mutate({ format: 'csv' })}
                      size="sm"
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      onClick={() => exportMutation.mutate({ format: 'xlsx' })}
                      size="sm"
                      variant="outline"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      onClick={() => exportMutation.mutate({ format: 'json' })}
                      size="sm"
                      variant="outline"
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {reportResult.columns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportResult.data.slice(0, 10).map((row, idx) => (
                        <tr key={idx}>
                          {reportResult.columns.map((col) => (
                            <td
                              key={col}
                              className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                            >
                              {row[col] !== null && row[col] !== undefined
                                ? String(row[col])
                                : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reportResult.totalRows > 10 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Showing first 10 of {reportResult.totalRows} rows
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Saved Configs Sidebar */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Saved Reports</h3>

            <div className="space-y-2">
              {configsLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : (savedConfigs?.configs || []).length === 0 ? (
                <p className="text-sm text-gray-500">No saved reports</p>
              ) : (
                (savedConfigs?.configs || []).map((config: ReportConfig) => (
                  <div
                    key={config.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-primary cursor-pointer"
                    onClick={() => loadSavedConfig(config)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{config.name}</p>
                        {config.description && (
                          <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {config.dataType} | {config.columns.length} columns
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (config.id) deleteMutation.mutate(config.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Activity Report */}
      {activeView === 'user-activity' && (
        <UserActivityReport defaultPeriod="30d" showExport />
      )}

      {/* Resource Forecast */}
      {activeView === 'resource-forecast' && (
        <ResourceForecast weeksAhead={8} />
      )}

      {/* Cost Analysis */}
      {activeView === 'cost-analysis' && (
        <div className="space-y-6">
          <CostSummaryWidget />
        </div>
      )}

      {/* Save Config Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Report Configuration"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Name
            </label>
            <Input
              value={reportConfig.name}
              onChange={(e) => setReportConfig({ ...reportConfig, name: e.target.value })}
              placeholder="e.g., Monthly Obligations Report"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <Input
              value={reportConfig.description || ''}
              onChange={(e) =>
                setReportConfig({ ...reportConfig, description: e.target.value })
              }
              placeholder="Brief description of this report"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => saveMutation.mutate(reportConfig)}
              disabled={!reportConfig.name || saveMutation.isPending}
              variant="primary"
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
            <Button onClick={() => setShowSaveModal(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
