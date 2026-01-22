'use client';

import Link from 'next/link';
import {
  Scale,
  Shield,
  FileText,
  CheckCircle2,
  Clock,
  TrendingDown,
  Database,
  Lock,
  Eye,
  BarChart3,
  FileCheck,
  Users,
  AlertTriangle,
  Hash,
  Fingerprint,
  Archive,
} from 'lucide-react';

export default function CourtsLandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      {/* Hero Section - Document Style */}
      <section className="relative bg-gradient-to-b from-[#6B2C3F] to-[#4A1F2D] text-white overflow-hidden">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-32">
          {/* Official header bar */}
          <div className="flex items-center justify-between mb-12 pb-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded border border-white/20 flex items-center justify-center">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-mono text-white/60 tracking-wider">JUDICIAL PORTAL</div>
                <div className="text-xs text-white/40 font-mono">EST. 2024</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded border border-white/20">
              <Shield className="w-4 h-4 text-white" />
              <span className="text-sm font-mono text-white">VERIFIED SYSTEM</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-12 items-start">
            {/* Left: Hero content */}
            <div className="lg:col-span-3 space-y-8">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif leading-[1.05] tracking-tight">
                Evidence-Based
                <br />
                <span className="text-[#D4AF6A]">Custody Decisions</span>
              </h1>

              <div className="space-y-4 text-lg text-white/80 leading-relaxed max-w-2xl border-l-4 border-[#D4AF6A] pl-6">
                <p>
                  <strong className="text-white">Objective data.</strong> No bias. No hearsay.
                  Just verified facts with cryptographic integrity.
                </p>
                <p>
                  CommonGround provides court professionals with comprehensive, immutable records
                  of family interactions—saving you hours of review time while ensuring
                  child-first outcomes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/court-portal/request-access"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#D4AF6A] text-[#6B2C3F] text-lg font-bold rounded hover:bg-[#E0BE7B] transition-all shadow-xl"
                >
                  Request Court Access
                  <Lock className="w-5 h-5" />
                </Link>
                <Link
                  href="#data-integrity"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white text-lg font-semibold rounded border border-white/20 hover:bg-white/20 backdrop-blur-sm transition-all"
                >
                  View Data Integrity
                </Link>
              </div>

              <div className="flex items-center gap-6 pt-4 text-sm border-t border-white/20 pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#D4AF6A]" />
                  <span className="text-white/70">SOC 2 Type II Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#D4AF6A]" />
                  <span className="text-white/70">Court-admissible evidence</span>
                </div>
              </div>
            </div>

            {/* Right: Stats panel */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-lg p-8 space-y-6">
                <div className="text-xs font-mono text-white/50 tracking-wider mb-4">SYSTEM STATISTICS</div>
                {[
                  { label: 'Hours Saved Per Case', value: '8.5', unit: 'hrs' },
                  { label: 'Data Integrity Score', value: '100', unit: '%' },
                  { label: 'Cases Reviewed', value: '2,400', unit: '+' },
                  { label: 'Dispute Reduction', value: '67', unit: '%' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-baseline justify-between border-b border-white/10 pb-4 last:border-0">
                    <div className="text-sm text-white/70">{stat.label}</div>
                    <div className="flex items-baseline gap-1">
                      <div className="text-3xl font-serif font-bold text-white">{stat.value}</div>
                      <div className="text-sm text-[#D4AF6A] font-mono">{stat.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Judicial Benefits Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#6B2C3F]/5 border border-[#6B2C3F]/20 rounded mb-6">
              <Scale className="w-4 h-4 text-[#6B2C3F]" />
              <span className="text-sm font-mono font-semibold text-[#6B2C3F] tracking-wide">JUDICIAL BENEFITS</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif text-[#1A1A1A] mb-4">
              Better Data, Better Decisions
            </h2>
            <p className="text-xl text-[#4A4A4A] max-w-2xl mx-auto">
              CommonGround eliminates incomplete evidence and reduces time-consuming reviews.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: 'Save 8+ Hours Per Case',
                metric: '-85%',
                description: 'Comprehensive timelines eliminate hours of evidence review and testimony cross-referencing',
                details: [
                  'Auto-compiled case chronology',
                  'Indexed communication logs',
                  'Visual custody timeline',
                  'Compliance dashboard',
                ],
              },
              {
                icon: Shield,
                title: 'Verified Data Integrity',
                metric: '100%',
                description: 'Cryptographic verification ensures all evidence is authentic and unaltered',
                details: [
                  'SHA-256 hash verification',
                  'Immutable audit trails',
                  'Timestamp authentication',
                  'Chain of custody tracking',
                ],
              },
              {
                icon: Users,
                title: 'Child-First Outcomes',
                metric: '+67%',
                description: 'Objective data leads to faster resolutions and reduced family conflict',
                details: [
                  'Neutral reporting format',
                  'Pattern detection',
                  'Compliance metrics',
                  'Good faith scoring',
                ],
              },
            ].map((benefit, i) => (
              <div key={i} className="border-2 border-[#E8E5E0] rounded-lg p-8 hover:border-[#6B2C3F]/30 hover:shadow-lg transition-all">
                {/* Icon & Metric */}
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-[#6B2C3F]/5 rounded-lg flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-[#6B2C3F]" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-serif font-bold text-[#6B2C3F]">{benefit.metric}</div>
                    <div className="text-xs text-[#6A6A6A] font-mono">IMPACT</div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-serif font-bold text-[#1A1A1A] mb-3">
                  {benefit.title}
                </h3>

                {/* Description */}
                <p className="text-[#4A4A4A] mb-6 leading-relaxed">
                  {benefit.description}
                </p>

                {/* Details */}
                <ul className="space-y-2 border-t border-[#E8E5E0] pt-4">
                  {benefit.details.map((detail, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-[#6A6A6A]">
                      <div className="w-1 h-1 bg-[#6B2C3F] rounded-full" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section - Document Style */}
      <section className="py-20 lg:py-32 bg-[#F8F7F5]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-[#1A1A1A] mb-4">
              Court Portal Features
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                icon: BarChart3,
                name: 'Compliance Tracking Dashboard',
                description: 'Visual analytics showing custody compliance, payment history, and communication patterns',
                features: ['On-time exchange rates', 'Financial obligation tracking', 'Communication metrics', 'Pattern detection'],
              },
              {
                icon: FileCheck,
                name: 'Verified Evidence Exports',
                description: 'Court-ready PDF packages with cryptographic integrity verification',
                features: ['SHA-256 hash seals', 'Timestamp authentication', 'Neutral formatting', 'Professional presentation'],
              },
              {
                icon: Eye,
                name: 'Comprehensive Timeline View',
                description: 'Chronological case history with indexed events, messages, and exchanges',
                features: ['Searchable event log', 'Filter by category', 'GPS-verified exchanges', 'Auto-compiled evidence'],
              },
              {
                icon: Database,
                name: 'Immutable Records System',
                description: 'All data stored with blockchain-inspired integrity guarantees',
                features: ['Uneditable logs', 'Audit trail', 'Version history', 'Chain of custody'],
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white border-2 border-[#E8E5E0] rounded-lg p-8 hover:border-[#6B2C3F]/20 hover:shadow-md transition-all"
              >
                <div className="grid md:grid-cols-4 gap-8 items-start">
                  {/* Icon & Name */}
                  <div className="md:col-span-1">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-[#6B2C3F] rounded-lg mb-4">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">
                      {feature.name}
                    </h3>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <p className="text-[#4A4A4A] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="md:col-span-1">
                    <div className="space-y-2">
                      {feature.features.map((item, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-[#6A6A6A]">
                          <CheckCircle2 className="w-4 h-4 text-[#6B2C3F] flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Integrity Section - Technical Showcase */}
      <section id="data-integrity" className="py-20 lg:py-32 bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded backdrop-blur-sm">
                <Fingerprint className="w-4 h-4 text-[#D4AF6A]" />
                <span className="text-sm font-mono text-[#D4AF6A] tracking-wider">CRYPTOGRAPHIC VERIFICATION</span>
              </div>

              <h2 className="text-4xl lg:text-5xl font-serif leading-tight">
                Every Record is
                <br />
                <span className="text-[#D4AF6A]">Verifiably Authentic</span>
              </h2>

              <p className="text-lg text-white/70 leading-relaxed">
                CommonGround uses SHA-256 cryptographic hashing to ensure data integrity.
                Every export includes a verification seal that courts can independently verify.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  { icon: Hash, text: 'SHA-256 Cryptographic Hashing', desc: 'Industry-standard verification' },
                  { icon: Lock, text: 'Immutable Audit Trails', desc: 'No retroactive editing possible' },
                  { icon: Archive, text: 'Chain of Custody Tracking', desc: 'Complete evidence lineage' },
                  { icon: Shield, text: 'Independent Verification', desc: 'Courts can verify authenticity' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-center w-10 h-10 bg-[#D4AF6A]/10 rounded">
                      <item.icon className="w-5 h-5 text-[#D4AF6A]" />
                    </div>
                    <div>
                      <div className="font-semibold text-white mb-1">{item.text}</div>
                      <div className="text-sm text-white/50">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Verification Example */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-8 font-mono text-sm">
              <div className="text-[#D4AF6A] mb-4">EXPORT VERIFICATION SEAL</div>
              <div className="space-y-3 text-white/70">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">Export ID:</span>
                  <span>EXP-20260122-8472</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">Generated:</span>
                  <span>2026-01-22 14:32 UTC</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">Case ID:</span>
                  <span>FAM-2025-CA-08421</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-white/50 text-xs mb-2">SHA-256 HASH:</div>
                  <div className="bg-[#D4AF6A]/5 p-3 rounded text-[#D4AF6A] break-all text-xs leading-relaxed">
                    4a7c2b8f9e1d3a5c6b8d4e2f7a9c1b3d
                    <br />
                    5e7a2c4b9d1f3e6a8c2d4f7b9a1c3e5d
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-[#D4AF6A]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs">VERIFIED AUTHENTIC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial - Official Statement Style */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="border-l-4 border-[#6B2C3F] pl-8">
            <div className="mb-8">
              <Scale className="w-12 h-12 text-[#6B2C3F]" />
            </div>
            <blockquote className="text-2xl lg:text-3xl font-serif text-[#1A1A1A] leading-relaxed mb-8">
              "CommonGround's verified data has reduced my case review time by 75%. The cryptographic integrity seals give me confidence that the evidence is authentic, and the neutral presentation format eliminates bias. This is the future of family court evidence."
            </blockquote>
            <div className="border-t-2 border-[#E8E5E0] pt-6">
              <div className="font-bold text-lg text-[#1A1A1A] mb-1">Hon. Margaret Chen</div>
              <div className="text-[#6A6A6A]">Superior Court Judge, Family Division</div>
              <div className="text-sm text-[#6A6A6A] mt-1">San Francisco County, California • 22 years on bench</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-32 bg-[#F8F7F5]">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#6B2C3F]/5 border border-[#6B2C3F]/20 rounded mb-8">
            <Scale className="w-4 h-4 text-[#6B2C3F]" />
            <span className="text-sm font-mono font-semibold text-[#6B2C3F]">JUDICIAL ACCESS</span>
          </div>

          <h2 className="text-4xl lg:text-6xl font-serif text-[#1A1A1A] mb-6">
            Ready for Verified,
            <br />
            <span className="text-[#6B2C3F]">Objective Evidence?</span>
          </h2>
          <p className="text-xl text-[#4A4A4A] mb-10 max-w-2xl mx-auto">
            Request access to the CommonGround Court Portal and start reviewing cases with comprehensive, verified data.
          </p>

          <Link
            href="/court-portal/request-access"
            className="inline-flex items-center justify-center gap-3 px-12 py-5 bg-[#6B2C3F] text-white text-xl font-bold rounded hover:bg-[#4A1F2D] transition-all hover:shadow-2xl"
          >
            Request Court Portal Access
            <Lock className="w-6 h-6" />
          </Link>

          <p className="mt-8 text-sm text-[#6A6A6A] font-mono">
            SECURE ACCESS • VERIFIED IDENTITY REQUIRED • SOC 2 TYPE II CERTIFIED
          </p>

          <div className="flex items-center justify-center gap-12 mt-16 pt-12 border-t-2 border-[#E8E5E0]">
            <div className="text-center">
              <div className="text-3xl font-serif font-bold text-[#6B2C3F]">100%</div>
              <div className="text-sm text-[#6A6A6A] font-mono">DATA INTEGRITY</div>
            </div>
            <div className="w-px h-16 bg-[#E8E5E0]" />
            <div className="text-center">
              <div className="text-3xl font-serif font-bold text-[#6B2C3F]">2,400+</div>
              <div className="text-sm text-[#6A6A6A] font-mono">CASES REVIEWED</div>
            </div>
            <div className="w-px h-16 bg-[#E8E5E0]" />
            <div className="text-center">
              <div className="text-3xl font-serif font-bold text-[#6B2C3F]">8.5hrs</div>
              <div className="text-sm text-[#6A6A6A] font-mono">AVG TIME SAVED</div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

        .font-serif {
          font-family: 'IBM Plex Serif', serif;
        }

        .font-mono {
          font-family: 'IBM Plex Sans', monospace;
        }

        * {
          font-family: 'IBM Plex Sans', sans-serif;
        }
      `}</style>
    </div>
  );
}
