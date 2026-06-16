'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, FileCheck, Hash } from 'lucide-react';

/**
 * Report Verification Landing Page
 *
 * Public page where anyone can verify the authenticity of a
 * CommonGround report by entering a Report ID or SHA-256 hash.
 */

export function VerifyContent() {
  const [identifier, setIdentifier] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) return;
    router.push(`/verify/${encodeURIComponent(trimmed)}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F0F9F6] via-white to-[#EDF5FA]">
      {/* Hero */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-cg-mist border border-cg-sage/20 rounded-full px-4 py-1.5 mb-8">
            <ShieldCheck className="w-4 h-4 text-cg-sage" />
            <span className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Document Verification
            </span>
          </div>

          <h1
            className="text-5xl sm:text-6xl font-serif text-foreground mb-6"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Report{' '}
            <span className="text-cg-sage">Verification</span>
          </h1>

          <p className="text-lg text-[#4A6670] max-w-xl mx-auto mb-12">
            Verify the authenticity of any CommonGround report. Enter a Report
            ID or SHA-256 hash to confirm the document has not been altered.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8BA3AE]" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="RPT-20260315-A1B2 or SHA-256 hash"
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#D1E0E5] bg-white text-foreground text-lg placeholder:text-[#8BA3AE] focus:outline-none focus:ring-2 focus:ring-cg-sage/40 focus:border-cg-sage shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!identifier.trim()}
              className="mt-4 w-full py-4 px-6 bg-cg-sage hover:bg-[#2D9A7A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-lg shadow-md"
            >
              Verify Report
            </button>
          </form>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-2xl font-serif text-foreground text-center mb-12"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            How Verification Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileCheck,
                title: 'Find Your Report ID',
                description:
                  'Every CommonGround report includes a unique Report ID (RPT-...) on the cover page and in the verification footer.',
              },
              {
                icon: Hash,
                title: 'Or Use SHA-256 Hash',
                description:
                  'Court-ready reports include a SHA-256 cryptographic hash. Enter the full 64-character hash to verify integrity.',
              },
              {
                icon: ShieldCheck,
                title: 'Instant Verification',
                description:
                  'We check the identifier against our records and confirm the report is authentic and unaltered since generation.',
              },
            ].map((step, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[#D1E0E5] p-6 text-center shadow-sm"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cg-mist mb-4">
                  <step.icon className="w-6 h-6 text-cg-sage" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#4A6670]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
