'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { MarketingHeader, MarketingFooter } from '@/components/marketing';
import {
  ArrowRight,
  Calendar,
  DollarSign,
  Video,
  MessageCircle,
  Check,
  Shield,
  Users,
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--portal-primary)]/10 flex items-center justify-center mx-auto animate-pulse">
            <div className="w-6 h-6 bg-[var(--portal-primary)] rounded-full" />
          </div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#E8F4F8]">
      <MarketingHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
        {/* Decorative lines */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-32 left-0 w-full h-px bg-[#F5A623]" />
          <div className="absolute top-64 right-0 w-3/4 h-px bg-[var(--portal-primary)]" />
        </div>

        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Headline */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#1E3A4A] mb-6 leading-[1.05]"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              The calm way to
              <br />
              <span className="text-[#3DAA8A]">co-parent</span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
              Peaceful tools that put your children first.
              <br />
              <span className="font-medium text-[var(--portal-primary)]">Structure, clarity, and calm for every family.</span>
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-[#2D8A70] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
              >
                Start Free — Parents
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/lawyers"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-[var(--portal-primary)] font-semibold rounded-full hover:bg-gray-50 transition-all border-2 border-[var(--portal-primary)]"
              >
                For Attorneys — Schedule a Demo
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[var(--portal-primary)]" />
                Forever free tier
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[var(--portal-primary)]" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[var(--portal-primary)]" />
                Court-ready documentation
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[var(--portal-primary)]" />
                Trusted by 500+ law firms
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-5xl font-serif text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Everything your <span className="text-[#3DAA8A]">family needs</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple tools that bring peace and structure to co-parenting.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <div className="bg-gradient-to-br from-[#E8F4F8] to-white rounded-3xl p-8 border-2 border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/30 transition-all hover:shadow-lg group">
              <div className="h-16 w-16 rounded-2xl bg-[var(--portal-primary)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="h-8 w-8 text-[var(--portal-primary)]" />
              </div>
              <h3 className="text-2xl font-semibold text-[#1E3A4A] mb-3">Set schedules once</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Automated recurring pickup and dropoff reminders. Clear, consistent schedules your children can count on.
              </p>
              <p className="text-sm font-medium text-[var(--portal-primary)]">Schedules, simplified</p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-gradient-to-br from-[#FEF7ED] to-white rounded-3xl p-8 border-2 border-[#F5A623]/10 hover:border-[#F5A623]/30 transition-all hover:shadow-lg group">
              <div className="h-16 w-16 rounded-2xl bg-[#F5A623]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="h-8 w-8 text-[#F5A623]" />
              </div>
              <h3 className="text-2xl font-semibold text-[#1E3A4A] mb-3">Track every dollar</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Receipts, splits, and payments all in one place. Clear financial records for your family.
              </p>
              <p className="text-sm font-medium text-[#F5A623]">Finances made clear</p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-gradient-to-br from-[#E8F4F8] to-white rounded-3xl p-8 border-2 border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/30 transition-all hover:shadow-lg group">
              <div className="h-16 w-16 rounded-2xl bg-[var(--portal-primary)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="h-8 w-8 text-[var(--portal-primary)]" />
              </div>
              <h3 className="text-2xl font-semibold text-[#1E3A4A] mb-3">Call your kids</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Video chat directly with your children. Stay connected and present in their lives, always.
              </p>
              <p className="text-sm font-medium text-[var(--portal-primary)]">Stay connected, always</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Messaging */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <MessageCircle className="h-5 w-5 text-[#F5A623]" />
                <span className="text-sm font-semibold text-[#F5A623] uppercase tracking-wide">
                  ARIA Messaging
                </span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-serif mb-4"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                AI helps you communicate with <span className="text-[#F5A623]">calm</span>
              </h2>
              <p className="text-lg text-white/80 mb-6 leading-relaxed">
                When you need to message, ARIA helps keep conversations constructive.
                Not rewriting your words — just helping you communicate clearly.
              </p>
              <p className="text-white/60 italic text-sm">
                "ARIA helped me focus on what matters — my kids."
                <br />
                <span className="text-white/40">— Parent in California</span>
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              {/* Chat container */}
              <div className="bg-[#0b141a] rounded-2xl p-4 shadow-2xl">
                <div className="space-y-3">
                  {/* Outgoing message bubble */}
                  <div className="flex justify-end">
                    <div className="relative max-w-[85%]">
                      <div className="bg-[#005c4b] text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-lg">
                        <p className="text-[15px] leading-relaxed">
                          You're always late. This is ridiculous.
                        </p>
                        <p className="text-[11px] text-white/50 text-right mt-1">Draft</p>
                      </div>
                    </div>
                  </div>

                  {/* ARIA Alert */}
                  <div className="flex justify-center my-2">
                    <div className="bg-[#F5A623] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                      ARIA Suggestion
                    </div>
                  </div>

                  {/* ARIA suggestion card */}
                  <div className="bg-gradient-to-br from-[#F5A623]/30 to-[#F5A623]/10 rounded-2xl p-4 border border-[#F5A623]/40 shadow-lg mx-2">
                    <p className="text-[#F5A623] font-semibold text-sm mb-2">A calmer approach</p>
                    <p className="text-white/90 text-sm leading-relaxed">
                      This phrasing may feel like an attack. Consider focusing on the schedule so your children have a smoother transition.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                        Rewrite
                      </button>
                      <button className="bg-white/10 hover:bg-white/20 text-white/70 text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                        Send Anyway
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="text-4xl font-bold text-[var(--portal-primary)] mb-2">87%</div>
              <p className="text-sm text-gray-600">Calmer communication</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-[var(--portal-primary)] mb-2">10K+</div>
              <p className="text-sm text-gray-600">Families supported</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-[var(--portal-primary)] mb-2">24/7</div>
              <p className="text-sm text-gray-600">Access from anywhere</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-[var(--portal-primary)] mb-2">100%</div>
              <p className="text-sm text-gray-600">Court-ready documentation</p>
            </div>
          </div>

          {/* Testimonial */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-[#FEF7ED] to-white rounded-3xl p-10 border-2 border-[#F5A623]/10 shadow-lg">
              <p className="text-lg text-gray-700 leading-relaxed mb-6 italic">
                "CommonGround gave us the structure we needed. The kids know what to expect, and everything just runs smoothly now. It changed our family for the better."
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[var(--portal-primary)]/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-[var(--portal-primary)]" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Marcus R.</p>
                  <p className="text-sm text-gray-600">Father of 2, Los Angeles</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-16 bg-gradient-to-br from-[#E8F4F8] to-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Built to protect what matters most
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Every feature is designed to keep your children's world stable.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 text-center">
              <div className="h-14 w-14 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-[var(--portal-primary)]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Encrypted & Private</h3>
              <p className="text-sm text-gray-600">Bank-level security for all communications</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 text-center">
              <div className="h-14 w-14 rounded-xl bg-[#F5A623]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="h-7 w-7 text-[#F5A623]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Court-Ready</h3>
              <p className="text-sm text-gray-600">Verified exports when you need them</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 text-center">
              <div className="h-14 w-14 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="h-7 w-7 text-[var(--portal-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Always Available</h3>
              <p className="text-sm text-gray-600">Access from phone, tablet, or desktop</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Ready to find common ground?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of families who've found a calmer way to co-parent — one that puts children first.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-10 py-5 bg-[#F5A623] text-white font-bold text-lg rounded-full hover:bg-[#E09520] transition-all shadow-2xl hover:shadow-3xl hover:-translate-y-1 group"
          >
            Start Free Today
            <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
          </Link>
          <p className="text-sm text-white/60 mt-6">
            Forever free tier for parents. No credit card required. Cancel anytime.
          </p>
          <p className="text-sm text-white/50 mt-3">
            Family law attorney?{' '}
            <Link href="/lawyers" className="text-[#F5A623] hover:underline">Schedule a demo for your practice</Link>.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
