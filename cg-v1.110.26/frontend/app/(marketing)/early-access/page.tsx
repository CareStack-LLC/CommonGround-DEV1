import Link from 'next/link';
import { Check, ArrowRight, Sparkles, Shield, Heart } from 'lucide-react';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';

export const metadata = {
  title: 'Join Early Access | CommonGround',
  description:
    'Be one of the first families to experience calmer co-parenting with CommonGround. Early adopters get 30% off for life.',
};

export default function EarlyAccessPage() {
  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-24 lg:pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[#F5A623] font-medium mb-5 tracking-widest uppercase text-xs flex items-center justify-center gap-3">
            <span className="w-8 h-px bg-[#F5A623]/40" />
            Early Access
            <span className="w-8 h-px bg-[#F5A623]/40" />
          </p>

          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] text-[#1E3A4A] mb-6 leading-[1.15]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Be the first to experience{' '}
            <span className="text-[#3DAA8A]">calmer co-parenting.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-10">
            CommonGround is launching soon. Join our early adopter list to get
            first access, exclusive pricing, and help shape the platform.
          </p>
        </div>
      </section>

      {/* Form + Benefits */}
      <section className="pb-16 lg:pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Benefits */}
            <div>
              <h2
                className="text-2xl sm:text-3xl text-[#1E3A4A] mb-8"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                What early adopters{' '}
                <span className="text-[#3DAA8A]">get</span>
              </h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5A623]/10">
                    <Sparkles className="h-5 w-5 text-[#F5A623]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1E3A4A]">
                      30% off for life
                    </p>
                    <p className="text-sm text-gray-500">
                      Locked in for 36 months on any paid plan. The best price
                      CommonGround will ever offer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3DAA8A]/10">
                    <Heart className="h-5 w-5 text-[#3DAA8A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1E3A4A]">
                      First access to every feature
                    </p>
                    <p className="text-sm text-gray-500">
                      ARIA messaging, custody calendar, expense tracking,
                      KidSpace, court-ready exports — you get it all first.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3DAA8A]/10">
                    <Shield className="h-5 w-5 text-[#3DAA8A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1E3A4A]">
                      Priority support
                    </p>
                    <p className="text-sm text-gray-500">
                      Direct access to our team. Your feedback shapes what we
                      build next.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 bg-white rounded-2xl p-6 border border-gray-100">
                <h3
                  className="text-lg text-[#1E3A4A] mb-4"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                >
                  What is CommonGround?
                </h3>
                <ul className="space-y-3">
                  {[
                    'AI-coached messaging that keeps conversations calm',
                    'Shared custody calendar with automated schedules',
                    'GPS-verified custody exchanges (no interaction needed)',
                    'Expense tracking with auto-splits and receipts',
                    'KidSpace video calls and activities for children',
                    'Court-ready documentation with tamper-proof verification',
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-gray-600"
                    >
                      <Check className="w-4 h-4 text-[#3DAA8A] mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-1 text-[#3DAA8A] text-sm font-medium mt-4 hover:underline"
                >
                  See all features
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:sticky lg:top-24">
              <EarlyAdopterForm source="early_access_page" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
