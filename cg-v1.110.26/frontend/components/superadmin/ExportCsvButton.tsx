'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { triggerCsvDownload } from '@/lib/admin-api';

/**
 * Drop-in "Export CSV" button for admin list views.
 *
 * Hits an authenticated CSV endpoint (using the admin JWT in Authorization
 * header) and saves the response as a downloaded file. No window.open, no
 * auth leakage via URL params.
 *
 * Usage:
 *   <ExportCsvButton
 *     endpoint="/admin/users/export.csv"
 *     filenameHint="users"
 *     filters={{ tier: 'plus', is_active: true }}
 *   />
 */
export function ExportCsvButton({
  endpoint,
  filenameHint,
  filters,
  label = 'Export CSV',
  size = 'md',
  variant = 'secondary',
}: {
  endpoint: string;
  filenameHint?: string;
  filters?: Record<string, string | number | boolean | undefined | null>;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary';
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setDownloading(true);
    setError(null);
    try {
      // Build query string from filters, omitting empty values
      const qs = new URLSearchParams();
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
        }
      }
      const query = qs.toString();
      const url = `${endpoint}${query ? `?${query}` : ''}`;

      // Date-stamped filename: <hint>_YYYY-MM-DD.csv
      const stamp = new Date().toISOString().slice(0, 10);
      const base = filenameHint || endpoint.split('/').pop()?.replace('.csv', '') || 'export';
      const filename = `${base}_${stamp}.csv`;

      await triggerCsvDownload(url, filename);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed');
      // Auto-clear error after 4s so the button stays usable
      setTimeout(() => setError(null), 4000);
    } finally {
      setDownloading(false);
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-xs gap-1.5'
      : 'px-3 py-2 text-sm gap-2';

  const variantClasses =
    variant === 'primary'
      ? 'bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white border-transparent'
      : 'bg-zinc-900/80 hover:bg-[#2D6A8F]/20 text-[#D0E4EC] border-[#2D6A8F]/20 hover:border-[#2D6A8F]/50';

  return (
    <div className="inline-flex flex-col items-stretch">
      <button
        onClick={handleClick}
        disabled={downloading}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 border ${sizeClasses} ${variantClasses}`}
        title="Download filtered rows as CSV"
      >
        {downloading ? (
          <Loader2 className={size === 'sm' ? 'w-3.5 h-3.5 animate-spin' : 'w-4 h-4 animate-spin'} />
        ) : (
          <Download className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        )}
        {label}
      </button>
      {error && (
        <span className="text-[11px] text-red-400 mt-1 max-w-[240px]">{error}</span>
      )}
    </div>
  );
}
