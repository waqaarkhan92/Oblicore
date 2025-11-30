/**
 * Excel Import Dropzone Component
 * Reusable component for Excel file uploads
 * Reference: docs/specs/60_Frontend_UI_UX_Design_System.md Section 3.2
 */

'use client';

import * as React from 'react';
import { FileSpreadsheet, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExcelImportDropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[]; // ['.xlsx', '.xls', '.csv']
  maxSize?: number; // in bytes, default 10MB
  maxRows?: number; // default 10,000
  disabled?: boolean;
  className?: string;
  showTemplateLink?: boolean;
  onTemplateDownload?: () => void;
}

export function ExcelImportDropzone({
  onFileSelect,
  acceptedFormats = ['.xlsx', '.xls', '.csv'],
  maxSize = 10 * 1024 * 1024, // 10MB
  maxRows = 10000,
  disabled = false,
  className,
  showTemplateLink = true,
  onTemplateDownload,
}: ExcelImportDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFile = (file: File): string | null => {
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      return `Invalid file format. Accepted formats: ${acceptedFormats.join(', ')}`;
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTemplateDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTemplateDownload) {
      onTemplateDownload();
    } else {
      // Default template download - create a sample Excel file
      const templateData = [
        ['permit_number', 'obligation_title', 'frequency', 'deadline_date', 'site_id'],
        ['EPR/12345/001', 'Monthly monitoring report', 'MONTHLY', '2025-02-01', ''],
        ['EPR/12345/001', 'Annual compliance review', 'ANNUAL', '2025-12-31', ''],
      ];
      
      // Create CSV content
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'obligations_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-input-border bg-background-tertiary',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:border-primary hover:bg-primary/5'
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="h-16 w-16 text-success" />
            <div className="flex flex-col items-center gap-1">
              <p className="text-base font-semibold text-text-primary">{selectedFile.name}</p>
              <p className="text-sm text-text-secondary">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
              Remove file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-base font-semibold text-text-primary">
                Drop Excel file here or click to browse
              </p>
              <p className="text-sm text-text-secondary">
                Accepted formats: {acceptedFormats.join(', ')} (max {Math.round(maxSize / (1024 * 1024))}MB)
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary-dark transition-colors"
            >
              <Upload className="h-4 w-4" />
              Select File
            </button>
            {showTemplateLink && (
              <button
                type="button"
                onClick={handleTemplateDownload}
                className="text-sm text-primary hover:text-primary-dark underline"
              >
                Download Excel template
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 text-danger text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

