'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, File, CheckCircle, AlertCircle, Smartphone, Monitor, ChevronDown, ChevronUp, Sparkles, Search } from 'lucide-react';
import Link from 'next/link';
import { MobileEvidenceUpload } from '@/components/enhanced-features';

interface Obligation {
  id: string;
  obligation_title: string;
  site_id: string;
  category?: string;
  keywords?: string[];
}

export default function EvidenceUploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedObligations, setSelectedObligations] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadMode, setUploadMode] = useState<'standard' | 'mobile'>('standard');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestedObligations, setSuggestedObligations] = useState<string[]>([]);

  // Fetch obligations for multi-select
  const { data: obligationsData, isLoading: obligationsLoading } = useQuery<{
    data: Obligation[];
  }>({
    queryKey: ['obligations'],
    queryFn: async (): Promise<any> => {
      // apiClient.get returns {data: [...], pagination: {...}}
      return apiClient.get('/obligations?limit=100');
    },
  });

  const obligations: any[] = obligationsData?.data || [];

  // Auto-suggest obligations based on file name
  const suggestObligationsFromFileName = useCallback((fileName: string) => {
    if (!fileName || obligations.length === 0) return [];

    const lowerFileName = fileName.toLowerCase();
    const suggestions: string[] = [];

    // Common evidence keywords to obligation categories mapping
    const keywordMappings: Record<string, string[]> = {
      'monitoring': ['MONITORING', 'monitor', 'sample', 'reading', 'measurement'],
      'report': ['REPORTING', 'report', 'annual', 'quarterly', 'monthly'],
      'maintenance': ['MAINTENANCE', 'maintain', 'service', 'repair', 'inspection'],
      'record': ['RECORD_KEEPING', 'record', 'log', 'register', 'archive'],
      'calibration': ['MONITORING', 'calibrat', 'certif'],
      'emission': ['MONITORING', 'emission', 'discharge', 'effluent'],
      'waste': ['OPERATIONAL', 'waste', 'disposal', 'consignment'],
      'training': ['OPERATIONAL', 'training', 'competenc'],
      'permit': ['OPERATIONAL', 'permit', 'licence', 'consent'],
    };

    for (const obligation of obligations) {
      const title = (obligation.obligation_title || '').toLowerCase();
      const category = obligation.category || '';

      // Check for category match
      for (const [keyword, mappings] of Object.entries(keywordMappings)) {
        if (lowerFileName.includes(keyword)) {
          if (mappings.some(m => title.includes(m.toLowerCase()) || category === m)) {
            if (!suggestions.includes(obligation.id)) {
              suggestions.push(obligation.id);
            }
          }
        }
      }

      // Check for direct word matches in title
      const fileWords = lowerFileName.replace(/[^a-z0-9]/g, ' ').split(' ').filter((w: string) => w.length > 3);
      const titleWords = title.replace(/[^a-z0-9]/g, ' ').split(' ').filter((w: string) => w.length > 3);

      for (const word of fileWords) {
        if (titleWords.some((tw: string) => tw.includes(word) || word.includes(tw))) {
          if (!suggestions.includes(obligation.id)) {
            suggestions.push(obligation.id);
          }
        }
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }, [obligations]);

  // Auto-suggest when file is selected
  useEffect(() => {
    if (selectedFile && obligations.length > 0) {
      const suggestions = suggestObligationsFromFileName(selectedFile.name);
      setSuggestedObligations(suggestions);

      // Auto-select suggested if none already selected
      if (selectedObligations.length === 0 && suggestions.length > 0) {
        setSelectedObligations(suggestions);
      }
    }
  }, [selectedFile, obligations, suggestObligationsFromFileName, selectedObligations.length]);

  // Filter obligations by search term
  const filteredObligations = useMemo(() => {
    if (!searchTerm) return obligations;
    const lowerSearch = searchTerm.toLowerCase();
    return obligations.filter(
      (o: Obligation) => (o.obligation_title || '').toLowerCase().includes(lowerSearch)
    );
  }, [obligations, searchTerm]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Use apiClient.upload for file uploads
      return apiClient.upload('/evidence', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      router.push('/dashboard/evidence');
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ];

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.csv', '.xlsx', '.zip'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension) && !allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only PDF, images, documents, CSV, Excel, and ZIP files are allowed.');
      return;
    }

    // Validate file size (20MB max)
    const maxSizeBytes = 20 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`File too large. Maximum size is 20MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const toggleObligation = (obligationId: string) => {
    setSelectedObligations((prev) =>
      prev.includes(obligationId)
        ? prev.filter((id) => id !== obligationId)
        : [...prev, obligationId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (selectedObligations.length === 0) {
      toast.error('Please select at least one obligation to link this evidence to');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('obligation_ids', JSON.stringify(selectedObligations));
    
    if (description) {
      formData.append('metadata', JSON.stringify({ description }));
    }

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Upload Evidence</h1>
          <p className="text-text-secondary mt-2">
            Upload evidence files and link them to obligations
          </p>
        </div>
        <Link href="/dashboard/evidence">
          <Button variant="outline" size="md">
            Cancel
          </Button>
        </Link>
      </div>

      {/* Upload Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setUploadMode('standard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            uploadMode === 'standard'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Standard Upload
        </button>
        <button
          onClick={() => setUploadMode('mobile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            uploadMode === 'mobile'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Mobile Capture
        </button>
      </div>

      {/* Mobile Upload Mode */}
      {uploadMode === 'mobile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mobile Uploader */}
          <MobileEvidenceUpload
            obligationIds={selectedObligations}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['evidence'] });
              router.push('/dashboard/evidence');
            }}
          />

          {/* Obligation Selection for Mobile */}
          <div className="bg-white rounded-lg shadow-base p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Select Obligations <span className="text-danger">*</span>
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Select obligations to link the captured evidence to
            </p>

            {obligationsLoading ? (
              <div className="text-center py-8 text-text-secondary">Loading...</div>
            ) : obligations.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <p>No obligations found.</p>
              </div>
            ) : (
              <div className="border border-input-border rounded-lg max-h-96 overflow-y-auto">
                {obligations.map((obligation) => (
                  <label
                    key={obligation.id}
                    className="flex items-center gap-3 p-4 border-b border-input-border/50 last:border-b-0 hover:bg-background-tertiary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedObligations.includes(obligation.id)}
                      onChange={() => toggleObligation(obligation.id)}
                      className="w-4 h-4 text-primary border-input-border rounded focus:ring-primary"
                    />
                    <span className="flex-1 text-text-primary">{obligation.obligation_title}</span>
                  </label>
                ))}
              </div>
            )}

            {selectedObligations.length > 0 && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  {selectedObligations.length} obligation{selectedObligations.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standard Upload Mode */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <div className="bg-white rounded-lg shadow-base p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Select File</h2>
          
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-input-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
              <p className="text-text-primary font-medium mb-2">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-sm text-text-secondary mb-4">
                Supported formats: PDF, Images, Documents, CSV, Excel, ZIP (max 20MB)
              </p>
              <label htmlFor="file-input">
                <Button variant="primary" size="md" type="button" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
              <input
                id="file-input"
                type="file"
                className="hidden"
                onChange={handleFileInputChange}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.csv,.xlsx,.zip"
              />
            </div>
          ) : (
            <div className="border border-input-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-text-primary">{selectedFile.name}</p>
                    <p className="text-sm text-text-secondary">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Obligation Selection */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">
              Link to Obligations <span className="text-danger">*</span>
            </h2>
            {suggestedObligations.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Auto-suggested from file name</span>
              </div>
            )}
          </div>

          {/* Search filter */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              type="text"
              placeholder="Search obligations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {obligationsLoading ? (
            <div className="text-center py-8 text-text-secondary">Loading obligations...</div>
          ) : obligations.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <p className="mb-4">No obligations found. Please create obligations first.</p>
              <Link href="/dashboard/obligations">
                <Button variant="primary" size="md">
                  Go to Obligations
                </Button>
              </Link>
            </div>
          ) : (
            <div className="border border-input-border rounded-lg max-h-96 overflow-y-auto">
              {filteredObligations.map((obligation: Obligation) => {
                const isSuggested = suggestedObligations.includes(obligation.id);
                return (
                  <label
                    key={obligation.id}
                    className={`flex items-center gap-3 p-4 border-b border-input-border/50 last:border-b-0 cursor-pointer transition-colors ${
                      isSuggested ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-background-tertiary'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedObligations.includes(obligation.id)}
                      onChange={() => toggleObligation(obligation.id)}
                      className="w-4 h-4 text-primary border-input-border rounded focus:ring-primary"
                    />
                    <span className="flex-1 text-text-primary">{obligation.obligation_title}</span>
                    {isSuggested && (
                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                        Suggested
                      </span>
                    )}
                  </label>
                );
              })}
              {filteredObligations.length === 0 && searchTerm && (
                <div className="p-4 text-center text-text-secondary">
                  No obligations match "{searchTerm}"
                </div>
              )}
            </div>
          )}

          {selectedObligations.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
              <p className="text-sm text-primary font-medium">
                {selectedObligations.length} obligation{selectedObligations.length !== 1 ? 's' : ''} selected
              </p>
              <button
                type="button"
                onClick={() => setSelectedObligations([])}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Advanced Options - Progressive Disclosure */}
        <div className="bg-white rounded-lg shadow-base overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-text-primary">Additional Options</span>
            {showAdvanced ? (
              <ChevronUp className="h-5 w-5 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-5 w-5 text-text-tertiary" />
            )}
          </button>

          {showAdvanced && (
            <div className="px-6 pb-6 border-t border-gray-100">
              <h3 className="text-sm font-medium text-text-secondary mt-4 mb-2">Description (Optional)</h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description or notes about this evidence..."
                className="w-full min-h-[100px] rounded-lg border border-input-border px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploadMutation.isPending && (
          <div className="bg-white rounded-lg shadow-base p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-primary">Uploading...</span>
                <span className="text-text-secondary">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-background-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadMutation.isError && (
          <div className="bg-danger/10 border border-danger rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-danger">Upload Failed</p>
              <p className="text-sm text-text-secondary mt-1">
                {(uploadMutation.error as any)?.response?.data?.error?.message || 'An error occurred during upload'}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {uploadMutation.isSuccess && (
          <div className="bg-success/10 border border-success rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-success">Upload Successful</p>
              <p className="text-sm text-text-secondary mt-1">
                Evidence uploaded and linked to {selectedObligations.length} obligation{selectedObligations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/dashboard/evidence">
            <Button variant="outline" size="md" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={!selectedFile || selectedObligations.length === 0 || uploadMutation.isPending}
            loading={uploadMutation.isPending}
          >
            Upload Evidence
          </Button>
        </div>
        </form>
      )}
    </div>
  );
}

