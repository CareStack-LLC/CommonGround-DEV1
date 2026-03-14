'use client';

import Link from 'next/link';
import {
  Shield,
  DollarSign,
  Calendar,
  MessageSquare,
  Heart,
  FileCheck,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react';

export default function ParentsLandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFCFA]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Organic background shape */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-[40%] -right-[20%] w-[800px] h-[800px] rounded-full opacity-[0.03]"
            style={{
              background: 'radial-gradient(circle, #3DAA8A 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-24 lg:pt-32 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Hero content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3DAA8A]/5 border border-[#3DAA8A]/10">
                <Sparkles className="w-4 h-4 text-[#3DAA8A]" />
                <span className="text-sm font-medium text-[#3DAA8A]">Trusted by 10,000+ families</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif leading-[1.1] text-[#1A1A1A]">
                Peaceful
                <br />
                <span className="text-[#3DAA8A]">Co-Parenting</span>
                <br />
                Made Simple
              </h1>

              <p className="text-xl text-[#4A4A4A] leading-relaxed max-w-xl">
                Your children deserve stability. Keep communication calm, document everything, split expenses fairly, and protect what matters most: your kids.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/auth/register"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#3DAA8A] text-white text-lg font-semibold rounded-xl hover:bg-[#3D5A49] transition-all hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#3DAA8A] text-lg font-semibold rounded-xl border-2 border-[#3DAA8A]/20 hover:border-[#3DAA8A] transition-all"
                >
                  Watch Demo
                </Link>
              </div>

              <p className="text-sm text-[#6A6A6A]">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>

            {/* Right: Stats grid */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: '87%', label: 'Calmer conversations reported' },
                { value: '10K+', label: 'Families using CommonGround' },
                { value: '99.4%', label: 'On-time exchange rate' },
                { value: '4.9★', label: 'Average user rating' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-8 border border-[#E8E5E0] hover:border-[#3DAA8A]/30 transition-all hover:shadow-lg"
                  style={{
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  <div className="text-4xl font-serif font-bold text-[#3DAA8A] mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#6A6A6A] leading-snug">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-[#1A1A1A] mb-4">
              You Shouldn't Have to Dread
              <br />
              <span className="text-[#3DAA8A]">Every Message</span>
            </h2>
            <p className="text-xl text-[#6A6A6A] max-w-2xl mx-auto">
              We built CommonGround to give you peace of mind—not more stress.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: MessageSquare,
                problem: '"Every message feels stressful"',
                solution: 'ARIA supports calm, child-focused communication',
                color: '#D4956C',
              },
              {
                icon: DollarSign,
                problem: '"I can\'t keep track of who owes what"',
                solution: 'ClearFund tracks every dollar, automatically',
                color: '#3DAA8A',
              },
              {
                icon: FileCheck,
                problem: '"I have no proof for court"',
                solution: 'Everything documented, court-ready, uneditable',
                color: '#8B7355',
              },
            ].map((item, i) => (
              <div key={i} className="space-y-6">
                {/* Icon */}
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon className="w-8 h-8" style={{ color: item.color }} />
                </div>

                {/* Problem */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-[#6A6A6A] uppercase tracking-wide">
                    The Problem
                  </div>
                  <div className="text-xl font-serif text-[#1A1A1A] italic">
                    {item.problem}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center">
                  <div className="flex-1 h-px bg-gradient-to-r from-[#E8E5E0] to-transparent" />
                  <ArrowRight className="w-5 h-5 text-[#3DAA8A] mx-2" />
                  <div className="flex-1 h-px bg-gradient-to-l from-[#E8E5E0] to-transparent" />
                </div>

                {/* Solution */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: item.color }}>
                    The Solution
                  </div>
                  <div className="text-lg text-[#2A2A2A] font-medium leading-snug">
                    {item.solution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 lg:py-32 bg-[#FDFCFA]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-[#1A1A1A] mb-4">
              Everything You Need
              <br />
              <span className="text-[#3DAA8A]">In One Place</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                name: 'ARIA Safe Messaging',
                benefits: [
                  'Helps keep messages constructive',
                  'Flags messages that could hurt you in court',
                  'Peace of mind with every send',
                ],
                color: '#3DAA8A',
              },
              {
                icon: DollarSign,
                name: 'ClearFund Expenses',
                benefits: [
                  'Split expenses by custody percentage',
                  'Track who paid what, automatically',
                  'No more "I already paid for that"',
                ],
                color: '#D4956C',
              },
              {
                icon: Calendar,
                name: 'TimeBridge Calendar',
                benefits: [
                  'GPS-verified exchange check-ins',
                  'Custody time tracked daily',
                  'Court-ready compliance reports',
                ],
                color: '#8B7355',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-8 border border-[#E8E5E0] hover:border-[#3DAA8A]/30 hover:shadow-xl transition-all"
              >
                {/* Icon */}
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>

                {/* Name */}
                <h3 className="text-2xl font-serif font-bold text-[#1A1A1A] mb-4">
                  {feature.name}
                </h3>

                {/* Benefits */}
                <ul className="space-y-3">
                  {feature.benefits.map((benefit, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#3DAA8A] flex-shrink-0 mt-0.5" />
                      <span className="text-[#4A4A4A] leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-[#3DAA8A] to-[#3D5A49] text-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif mb-4">
              Join Thousands of Parents
              <br />
              Finding Peace
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              CommonGround is already helping families find stability and focus on their children.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '87%', label: 'Calmer communication', subtext: 'ARIA supports constructive messaging' },
              { value: '10,000+', label: 'Families protected', subtext: 'Growing every day' },
              { value: '$2.4M', label: 'Expenses tracked', subtext: 'Fair & transparent' },
              { value: '99.4%', label: 'Exchange success rate', subtext: 'GPS verified' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-serif font-bold mb-2">{stat.value}</div>
                <div className="text-lg font-semibold mb-1">{stat.label}</div>
                <div className="text-sm text-white/60">{stat.subtext}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="bg-[#FDFCFA] rounded-3xl p-12 border-2 border-[#E8E5E0]">
            <div className="flex items-start gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-6 h-6 text-[#D4956C] fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-2xl font-serif text-[#1A1A1A] mb-6 leading-relaxed italic">
              "I used to dread checking my phone. Now ARIA helps keep messages constructive, and I actually feel safe communicating about our daughter. This app gave me peace of mind."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-[#3DAA8A]" />
              </div>
              <div>
                <div className="font-semibold text-[#1A1A1A]">Sarah M.</div>
                <div className="text-sm text-[#6A6A6A]">Parent, California</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-32 bg-[#FDFCFA]">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <h2 className="text-4xl lg:text-6xl font-serif text-[#1A1A1A] mb-6">
            Ready to Reclaim
            <br />
            <span className="text-[#3DAA8A]">Your Peace?</span>
          </h2>
          <p className="text-xl text-[#6A6A6A] mb-10 max-w-2xl mx-auto">
            Join 10,000+ parents who chose a calmer path forward. Start your 14-day free trial—no credit card required.
          </p>

          <Link
            href="/auth/register"
            className="group inline-flex items-center justify-center gap-3 px-12 py-5 bg-[#3DAA8A] text-white text-xl font-semibold rounded-2xl hover:bg-[#3D5A49] transition-all hover:scale-105 shadow-2xl hover:shadow-3xl"
          >
            Start Your Free Trial
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="mt-6 text-sm text-[#6A6A6A]">
            Questions? <Link href="/help/contact" className="text-[#3DAA8A] hover:underline">Contact us</Link> • Takes 2 minutes to set up
          </p>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap');

        .font-serif {
          font-family: 'Cormorant Garamond', serif;
        }
      `}</style>
    </div>
  );
}
