'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { exportsAPI, CaseExport, ExportStatus } from '@/lib/api';

interface ExportListProps {
  caseId: string;
  onCreateNew?: () => void;
}

export function ExportList({ caseId, onCreateNew }: ExportListProps) {
  const [exports, setExports] = useState<CaseExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadExports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await exportsAPI.listForCase(caseId);
      setExports(response.exports);
    } catch (err: any) {
      setError(err.message || 'Failed to load exports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExports();
  }, [caseId]);

  const handleDownload = async (exportItem: CaseExport) => {
    setDownloadingId(exportItem.id);
    try {
      const blob = await exportsAPI.download(exportItem.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CommonGround_Export_${exportItem.export_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Refresh to update download count
      loadExports();
    } catch (err: any) {
      alert(err.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (exportItem: CaseExport) => {
    if (!confirm('Are you sure you want to delete this export?')) return;

    try {
      await exportsAPI.delete(exportItem.id);
      loadExports();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const getStatusColor = (status: ExportStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'downloaded':
        return 'text-blue-600 bg-blue-100';
      case 'generating':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <p className="text-red-700">{error}</p>
          <Button variant="outline" onClick={loadExports} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (exports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-4">&#x1F4C4;</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No exports yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first court-ready documentation package
          </p>
          {onCreateNew && (
            <Button onClick={onCreateNew}>Create Export</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Export History</h3>
        {onCreateNew && (
          <Button onClick={onCreateNew}>New Export</Button>
        )}
      </div>

      <div className="space-y-3">
        {exports.map(exportItem => (
          <Card key={exportItem.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-medium">
                      {exportItem.export_number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        exportItem.status
                      )}`}
                    >
                      {exportItem.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                      {exportItem.package_type}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 space-y-1">
                    <p>
                      <span className="font-medium">Date Range:</span>{' '}
                      {formatDate(exportItem.date_range_start)} - {formatDate(exportItem.date_range_end)}
                    </p>
                    <p>
                      <span className="font-medium">Created:</span>{' '}
                      {formatDate(exportItem.created_at)}
                      {exportItem.page_count && ` • ${exportItem.page_count} pages`}
                      {exportItem.file_size_bytes && ` • ${formatFileSize(exportItem.file_size_bytes)}`}
                    </p>
                    {exportItem.download_count > 0 && (
                      <p className="text-xs">
                        Downloaded {exportItem.download_count} time{exportItem.download_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {exportItem.claim_type && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Claim:</span>{' '}
                      {exportItem.claim_type.replace(/_/g, ' ')}
                    </p>
                  )}

                  {exportItem.error_message && (
                    <p className="mt-2 text-sm text-red-600">
                      Error: {exportItem.error_message}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {(exportItem.status === 'completed' || exportItem.status === 'downloaded') && (
                    <Button
                      size="sm"
                      onClick={() => handleDownload(exportItem)}
                      disabled={downloadingId === exportItem.id}
                    >
                      {downloadingId === exportItem.id ? 'Downloading...' : 'Download'}
                    </Button>
                  )}
                  {exportItem.status === 'generating' && (
                    <Button size="sm" variant="outline" onClick={loadExports}>
                      Refresh
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(exportItem)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {exportItem.verification_url && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Verify:</span>{' '}
                    <span className="font-mono">{exportItem.verification_url}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
