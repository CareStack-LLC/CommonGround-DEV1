'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldX,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  Calendar,
  FileText,
  Hash,
  Clock,
} from 'lucide-react';

interface VerificationResult {
  is_valid: boolean;
  report_id: string | null;
  report_type: string;
  report_category: string;
  sha256_hash: string | null;
  generated_at: string | null;
  date_range: string | null;
  family_file_ref: string | null;
  verified_at: string;
  message: string;
}

export function VerifyResultContent() {
  const params = useParams();
  const identifier = decodeURIComponent(params.id as string);

  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function verify() {
      setLoading(true);
      setError(null);

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      try {
        const res = await fetch(
          `${apiUrl}/api/v1/verify/${encodeURIComponent(identifier)}`
        );

        if (res.ok) {
          const data: VerificationResult = await res.json();
          setResult(data);
        } else if (res.status === 404) {
          const body = await res.json();
          setError(
            body?.detail?.message ||
              'No report found matching this identifier.'
          );
        } else {
          setError('Verification service is temporarily unavailable.');
        }
      } catch {
        setError('Unable to reach the verification service. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [identifier]);

  const copyHash = () => {
    if (result?.sha256_hash) {
      navigator.clipboard.writeText(result.sha256_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F0F9F6] via-white to-[#EDF5FA] print:bg-white">
      <section className="pt-16 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/verify"
            className="inline-flex items-center gap-1.5 text-sm text-[#4A6670] hover:text-foreground mb-8 print:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Verification
          </Link>

          {/* Loading */}
          {loading && (
            <div className="text-center py-20">
              <Loader2 className="w-10 h-10 text-cg-sage animate-spin mx-auto mb-4" />
              <p className="text-[#4A6670]">Verifying document...</p>
            </div>
          )}

          {/* Not Found */}
          {!loading && error && (
            <div className="bg-white rounded-2xl border border-red-200 shadow-lg p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-6">
                <ShieldX className="w-10 h-10 text-red-500" />
              </div>
              <h1
                className="text-3xl font-serif text-foreground mb-3"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Not Verified
              </h1>
              <p className="text-[#4A6670] mb-6">{error}</p>
              <p className="text-sm text-[#8BA3AE] font-mono break-all">
                Searched: {identifier}
              </p>
            </div>
          )}

          {/* Verified */}
          {!loading && result && (
            <div className="bg-white rounded-2xl border border-cg-sage/30 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-cg-sage-subtle to-cg-mist p-8 text-center border-b border-[#D1E0E5]">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cg-sage/10 mb-4">
                  <ShieldCheck className="w-10 h-10 text-cg-sage" />
                </div>
                <h1
                  className="text-3xl font-serif text-foreground mb-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Verified
                </h1>
                <p className="text-[#4A6670]">{result.message}</p>
              </div>

              {/* Details */}
              <div className="p-8 space-y-5">
                {result.report_id && (
                  <DetailRow
                    icon={FileText}
                    label="Report ID"
                    value={result.report_id}
                    mono
                  />
                )}

                <DetailRow
                  icon={FileText}
                  label="Report Type"
                  value={result.report_type}
                />

                <DetailRow
                  icon={FileText}
                  label="Category"
                  value={result.report_category}
                />

                {result.generated_at && (
                  <DetailRow
                    icon={Clock}
                    label="Generated"
                    value={formatDate(result.generated_at)}
                  />
                )}

                {result.date_range && (
                  <DetailRow
                    icon={Calendar}
                    label="Report Period"
                    value={result.date_range}
                  />
                )}

                {result.family_file_ref && (
                  <DetailRow
                    icon={FileText}
                    label="Family File"
                    value={result.family_file_ref}
                    mono
                  />
                )}

                {result.sha256_hash && (
                  <div className="flex items-start gap-3 py-3 border-b border-[#E8EDF0]">
                    <Hash className="w-5 h-5 text-[#8BA3AE] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wider text-[#8BA3AE] font-semibold mb-1">
                        SHA-256 Hash
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-foreground break-all">
                          {result.sha256_hash}
                        </p>
                        <button
                          onClick={copyHash}
                          className="shrink-0 p-1.5 rounded-md hover:bg-cg-mist transition-colors print:hidden"
                          title="Copy full hash"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-cg-sage" />
                          ) : (
                            <Copy className="w-4 h-4 text-[#8BA3AE]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <DetailRow
                  icon={Clock}
                  label="Verified At"
                  value={formatDate(result.verified_at)}
                />
              </div>

              {/* Footer */}
              <div className="bg-[#F8FAFB] p-6 border-t border-[#E8EDF0] text-center">
                <p className="text-xs text-[#8BA3AE]">
                  This verification confirms the document was generated by
                  CommonGround and has not been altered. Print this page for
                  your records.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#E8EDF0]">
      <Icon className="w-5 h-5 text-[#8BA3AE] shrink-0" />
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wider text-[#8BA3AE] font-semibold mb-0.5">
          {label}
        </p>
        <p
          className={`text-foreground font-semibold ${mono ? 'font-mono text-sm' : ''}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
