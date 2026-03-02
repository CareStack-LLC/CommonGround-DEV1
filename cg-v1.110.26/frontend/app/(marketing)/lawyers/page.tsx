'use client';

import Link from 'next/link';
import {
  Briefcase,
  Shield,
  FileText,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Lock,
  Award,
  Zap,
  MessageSquare,
  FileCheck,
  Scale,
} from 'lucide-react';

export default function LawyersLandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(to right, #C9A961 1px, transparent 1px),
            linear-gradient(to bottom, #C9A961 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />

        {/* Diagonal accent */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-br from-[#C9A961]/10 to-transparent transform skew-x-12 translate-x-1/4" />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-24 pb-32 lg:pt-32 lg:pb-40">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Hero content */}
            <div className="space-y-8 text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A961]/20 border border-[#C9A961]/30 rounded-lg backdrop-blur-sm">
                <Award className="w-4 h-4 text-[#C9A961]" />
                <span className="text-sm font-medium text-[#C9A961]">Trusted by 500+ law firms nationwide</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif leading-[1.05] tracking-tight">
                The Family Law
                <br />
                <span className="text-[#C9A961]">Practice Platform</span>
              </h1>

              <p className="text-xl text-white/80 leading-relaxed max-w-xl">
                Stop drowning in case management chaos. CommonGround gives you the tools to run a modern family law practice—automated evidence, client portals, and court-ready exports.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/contact/demo"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#C9A961] text-[#1E3A5F] text-lg font-bold rounded-lg hover:bg-[#D4B56F] transition-all hover:scale-105 shadow-xl"
                >
                  Schedule Your Demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/professionals"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white text-lg font-semibold rounded-lg border border-white/20 hover:bg-white/20 backdrop-blur-sm transition-all"
                >
                  View Features
                </Link>
              </div>

              <div className="flex items-center gap-8 pt-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#C9A961]" />
                  <span className="text-white/70">No setup fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#C9A961]" />
                  <span className="text-white/70">Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Right: ROI stats */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: '10+', unit: 'hours/week', label: 'Average time saved' },
                { value: '92%', unit: '', label: 'Client satisfaction rate' },
                { value: '500+', unit: '', label: 'Firms using CommonGround' },
                { value: '15K+', unit: '', label: 'Cases managed' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-[#C9A961]/50 transition-all"
                >
                  <div className="flex items-baseline gap-1 mb-2">
                    <div className="text-4xl font-serif font-bold text-white">
                      {stat.value}
                    </div>
                    {stat.unit && (
                      <div className="text-lg text-[#C9A961] font-medium">
                        {stat.unit}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-white/70 leading-snug">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Practice Benefits Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A5F]/5 border border-[#1E3A5F]/10 rounded-lg mb-6">
              <TrendingUp className="w-4 h-4 text-[#1E3A5F]" />
              <span className="text-sm font-semibold text-[#1E3A5F]">MEASURABLE IMPACT</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-serif text-[#1E3A5F] mb-4">
              Build a Better Practice
            </h2>
            <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
              CommonGround eliminates the administrative overhead that keeps you from focusing on your clients.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: Clock,
                title: 'Save 10+ Hours Per Week',
                description: 'Automated evidence compilation, client communication, and case documentation',
                stats: ['Auto-generated court exports', 'Bulk message analysis', 'One-click compliance reports'],
              },
              {
                icon: Users,
                title: 'Happier Clients, Better Outcomes',
                description: 'Give clients 24/7 access to their case data and reduce anxiety',
                stats: ['Client portal with real-time updates', 'Transparent expense tracking', 'Verified communication logs'],
              },
              {
                icon: BarChart3,
                title: 'Win More Cases',
                description: 'Court-ready evidence with cryptographic verification and neutral reporting',
                stats: ['SHA-256 integrity verification', 'Uneditable audit trails', 'Professional PDF exports'],
              },
            ].map((benefit, i) => (
              <div key={i} className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-[#C9A961]/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-[#FAFBFC] rounded-2xl p-8 border border-[#E5E7EB] hover:border-[#C9A961]/30 transition-all">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#1E3A5F] to-[#2A4A6F] rounded-xl mb-6 shadow-lg">
                    <benefit.icon className="w-7 h-7 text-[#C9A961]" />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-serif font-bold text-[#1E3A5F] mb-3">
                    {benefit.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#4A5568] mb-6 leading-relaxed">
                    {benefit.description}
                  </p>

                  {/* Stats */}
                  <ul className="space-y-2">
                    {benefit.stats.map((stat, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-[#6B7280]">
                        <div className="w-1 h-1 bg-[#C9A961] rounded-full mt-2 flex-shrink-0" />
                        {stat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 lg:py-32 bg-[#FAFBFC]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-[#1E3A5F] mb-4">
              Everything Your Practice Needs
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Briefcase,
                name: 'Professional Portal',
                description: 'Dedicated dashboard for attorneys with case overview, timeline, and analytics',
                features: [
                  'Multi-case management',
                  'Client communication tools',
                  'Compliance tracking & alerts',
                  'Team collaboration features',
                ],
              },
              {
                icon: FileCheck,
                name: 'Court-Ready Exports',
                description: 'Generate professional evidence packages with cryptographic verification',
                features: [
                  'Auto-compiled evidence packages',
                  'SHA-256 integrity verification',
                  'Neutral, unbiased reporting',
                  'Professional PDF formatting',
                ],
              },
              {
                icon: MessageSquare,
                name: 'Client Communication',
                description: 'Secure messaging with ARIA AI monitoring and sentiment analysis',
                features: [
                  'Flag problematic communications',
                  'Track communication patterns',
                  'Generate good faith reports',
                  'Reduce client anxiety',
                ],
              },
              {
                icon: Zap,
                name: 'Intake Automation',
                description: 'AI-powered client intake with structured data extraction',
                features: [
                  'Conversational intake forms',
                  'Auto-populate case data',
                  'Conflict check automation',
                  'Instant client assessment',
                ],
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 border-2 border-[#E5E7EB] hover:border-[#C9A961]/40 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-[#1E3A5F]/5 rounded-xl">
                      <feature.icon className="w-6 h-6 text-[#1E3A5F]" />
                    </div>
                  </div>

                  <div className="flex-1">
                    {/* Name */}
                    <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">
                      {feature.name}
                    </h3>

                    {/* Description */}
                    <p className="text-[#4A5568] mb-4 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-2">
                      {feature.features.map((item, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-[#6B7280]">
                          <CheckCircle2 className="w-4 h-4 text-[#C9A961] flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section className="py-20 lg:py-32 bg-white border-t-2 border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A5F]/5 border border-[#1E3A5F]/10 rounded-lg mb-6">
                <Shield className="w-4 h-4 text-[#1E3A5F]" />
                <span className="text-sm font-semibold text-[#1E3A5F]">ENTERPRISE SECURITY</span>
              </div>

              <h2 className="text-4xl lg:text-5xl font-serif text-[#1E3A5F] mb-6">
                Bank-Level Security.
                <br />
                <span className="text-[#C9A961]">Bar Association Approved.</span>
              </h2>

              <p className="text-lg text-[#4A5568] mb-8 leading-relaxed">
                CommonGround meets the highest standards for legal technology. Your client data is protected, your communications are privileged, and your evidence is admissible.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Lock, text: 'SOC 2 Type II Certified' },
                  { icon: Shield, text: 'ABA Legal Technology Standards Compliant' },
                  { icon: FileText, text: 'HIPAA Compliant for Sensitive Health Data' },
                  { icon: Scale, text: 'Court-Admissible Evidence Standards' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-[#1E3A5F]/5 rounded-lg">
                      <item.icon className="w-5 h-5 text-[#1E3A5F]" />
                    </div>
                    <span className="text-[#1E3A5F] font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                'End-to-end encryption',
                'Multi-factor authentication',
                'Role-based access control',
                'Automatic audit logs',
                'Data residency options',
                'Regular security audits',
                'Disaster recovery',
                '99.9% uptime SLA',
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-[#FAFBFC] rounded-xl p-6 border border-[#E5E7EB] text-center"
                >
                  <CheckCircle2 className="w-6 h-6 text-[#C9A961] mx-auto mb-3" />
                  <div className="text-sm font-medium text-[#1E3A5F]">{feature}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 lg:py-32 bg-[#1E3A5F] text-white">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="md:col-span-2">
              <div className="mb-6">
                <Award className="w-12 h-12 text-[#C9A961] mb-4" />
              </div>
              <blockquote className="text-2xl lg:text-3xl font-serif leading-relaxed mb-8">
                "CommonGround cut my evidence prep time from 6 hours to 30 minutes. The auto-generated exports are court-ready, and judges love the neutral presentation. It's transformed how I practice family law."
              </blockquote>
              <div>
                <div className="font-bold text-lg mb-1">Rebecca Chen, Esq.</div>
                <div className="text-[#C9A961]">Managing Partner, Chen Family Law Group</div>
                <div className="text-white/60 text-sm mt-1">San Francisco, CA • 15 years experience</div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-serif font-bold text-[#C9A961] mb-1">6hrs → 30min</div>
                <div className="text-sm text-white/80">Evidence prep time</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-serif font-bold text-[#C9A961] mb-1">100%</div>
                <div className="text-sm text-white/80">Court acceptance rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <h2 className="text-4xl lg:text-6xl font-serif text-[#1E3A5F] mb-6">
            Ready to Modernize
            <br />
            <span className="text-[#C9A961]">Your Practice?</span>
          </h2>
          <p className="text-xl text-[#4A5568] mb-10 max-w-2xl mx-auto">
            Schedule a personalized demo and see how CommonGround can save you 10+ hours per week while delivering better client outcomes.
          </p>

          <Link
            href="/contact/demo"
            className="group inline-flex items-center justify-center gap-3 px-12 py-5 bg-gradient-to-r from-[#1E3A5F] to-[#2A4A6F] text-white text-xl font-bold rounded-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            Schedule Your Demo
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="mt-8 text-sm text-[#6B7280]">
            Join 500+ law firms • Average 30-minute demo • No commitment required
          </p>

          <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-[#E5E7EB]">
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-[#1E3A5F]">500+</div>
              <div className="text-sm text-[#6B7280]">Firms</div>
            </div>
            <div className="w-px h-12 bg-[#E5E7EB]" />
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-[#1E3A5F]">15K+</div>
              <div className="text-sm text-[#6B7280]">Cases</div>
            </div>
            <div className="w-px h-12 bg-[#E5E7EB]" />
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-[#1E3A5F]">92%</div>
              <div className="text-sm text-[#6B7280]">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Outfit:wght@400;500;600;700&display=swap');

        .font-serif {
          font-family: 'Playfair Display', serif;
        }

        * {
          font-family: 'Outfit', sans-serif;
        }
      `}</style>
    </div>
  );
}
