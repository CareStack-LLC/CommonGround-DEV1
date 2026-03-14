import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Shield, Users, CheckCircle, MessageSquare, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | CommonGround',
  description: 'CommonGround helps families find peace and stability through structured co-parenting tools. Technology built to put children first.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#E8F4F8]">
      {/* Hero - Mission Statement */}
      <section className="relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-20 left-0 w-full h-px bg-[#F5A623]" />
          <div className="absolute top-40 right-0 w-2/3 h-px bg-[var(--portal-primary)]" />
          <div className="absolute bottom-40 left-0 w-1/2 h-px bg-[#F5A623]" />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24 relative">
          <div className="max-w-3xl">
            {/* Label */}
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="h-px w-12 bg-[#F5A623]" />
              <span className="text-sm font-medium text-[#F5A623] tracking-wide uppercase">
                Our Mission
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#1E3A4A] mb-6 leading-[1.1]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Every child deserves
              <br />
              <span className="text-[var(--portal-primary)]">a peaceful family</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8">
              CommonGround helps families navigate co-parenting with calm and clarity.
              We believe technology can bring structure, protect children, and create space for families to thrive.
            </p>

            {/* Mission statement box */}
            <div className="border-l-4 border-[var(--portal-primary)] pl-6 py-3 bg-gradient-to-r from-[#E8F4F8] to-transparent">
              <p className="text-gray-700 font-medium text-lg">
                Every child deserves parents who can work together — even when they can't be together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem - Reality Check */}
      <section className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-[#F5A623]" />
              <span className="text-sm font-semibold text-[#F5A623] uppercase tracking-wide">
                Why We Exist
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Co-parenting takes <span className="text-[#F5A623]">the right tools</span>
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Most co-parenting tools assume parents are already communicating well.
                But many families need more structure — clear boundaries, automatic scheduling,
                and support to keep conversations focused on the children.
              </p>
              <p>
                <strong className="text-gray-700">Millions of children</strong> are caught in the middle
                when co-parenting communication breaks down. They feel the stress.
                They deserve better.
              </p>
              <p className="text-gray-700 font-medium">
                These families need tools that create calm and structure. That's why we built CommonGround.
              </p>
            </div>
          </div>

          <div className="relative">
            {/* Statistics cards */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10 shadow-sm">
                <div className="text-4xl font-bold text-[var(--portal-primary)] mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  40%
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  of marriages end in divorce, impacting millions of children each year
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border-2 border-[#F5A623]/10 shadow-sm">
                <div className="text-4xl font-bold text-[#F5A623] mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  25-30%
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  of separations involve challenges that directly affect children's wellbeing
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10 shadow-sm">
                <div className="text-4xl font-bold text-[var(--portal-primary)] mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  $50B+
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  annual cost of difficult custody situations on families and courts
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution - How We're Different */}
      <section className="bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white py-16 sm:py-20 my-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-[#F5A623]" />
              <span className="text-sm font-semibold text-[#F5A623] uppercase tracking-wide">
                Our Approach
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Technology that creates calm, <span className="text-[#F5A623]">not just manages it</span>
            </h2>
            <p className="text-lg text-white/80">
              CommonGround is designed to bring structure and peace to co-parenting.
              We reduce friction, automate coordination, and help families focus on what matters — their children.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <MessageSquare className="h-10 w-10 text-[#F5A623] mb-4" />
              <h3 className="text-xl font-semibold mb-2">Clear Communication</h3>
              <p className="text-white/70 text-sm">
                ARIA AI helps keep messages constructive and child-focused,
                so conversations stay calm and productive
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <Calendar className="h-10 w-10 text-[#F5A623] mb-4" />
              <h3 className="text-xl font-semibold mb-2">Effortless Coordination</h3>
              <p className="text-white/70 text-sm">
                Set schedules once, get automatic reminders. Smooth handoffs with GPS
                verification give children consistency
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <CheckCircle className="h-10 w-10 text-[#F5A623] mb-4" />
              <h3 className="text-xl font-semibold mb-2">Trusted Documentation</h3>
              <p className="text-white/70 text-sm">
                Court-ready records of every interaction, payment, and exchange.
                Clear facts that everyone can rely on
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Principles */}
      <section className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-[var(--portal-primary)]" />
            <span className="text-sm font-semibold text-[var(--portal-primary)] uppercase tracking-wide">
              What We Believe
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            Principles that <span className="text-[var(--portal-primary)]">guide everything we build</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-[#E8F4F8] to-white rounded-2xl p-8 border-2 border-[var(--portal-primary)]/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-[var(--portal-primary)] flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Children First, Always
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Every feature we build asks: "Will this help children feel safer and more secure?"
                  If it doesn't serve the children, we don't build it.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FEF7ED] to-white rounded-2xl p-8 border-2 border-[#F5A623]/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-[#F5A623] flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Peace Through Structure
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Clear boundaries and consistent routines give families the stability they need.
                  We create structured space that protects everyone involved.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#E8F4F8] to-white rounded-2xl p-8 border-2 border-[var(--portal-primary)]/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-[var(--portal-primary)] flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Clarity Over Confusion
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Objective records bring clarity. GPS verification. Timestamped messages.
                  Payment receipts. Clear facts everyone can rely on.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FEF7ED] to-white rounded-2xl p-8 border-2 border-[#F5A623]/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-[#F5A623] flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  No Judgment, Just Support
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We don't take sides. We don't judge. Every family's situation is unique,
                  and we're here to help regardless of how you got here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Impact */}
      <section className="bg-gradient-to-br from-[#FEF7ED] to-[#F5A623]/10 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-[#F5A623]" />
              <span className="text-sm font-semibold text-[#F5A623] uppercase tracking-wide">
                Making a Difference
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Real families finding <span className="text-[#F5A623]">real peace</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Thousands of families use CommonGround to bring calm and structure
              to their co-parenting, giving their children the stability they deserve.
            </p>
          </div>

          {/* Impact metrics */}
          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--portal-primary)] mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                10K+
              </div>
              <p className="text-gray-700 font-medium">Families supported</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[#F5A623] mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                85%
              </div>
              <p className="text-gray-700 font-medium">Report calmer co-parenting</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[var(--portal-primary)] mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                500K+
              </div>
              <p className="text-gray-700 font-medium">Messages supported by ARIA</p>
            </div>
          </div>

          {/* Testimonial highlights */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--portal-primary)]/10">
              <p className="text-gray-700 italic mb-4">
                "For the first time in years, I feel calm about co-parenting.
                ARIA keeps our messages focused on the kids, and the structure makes everything predictable."
              </p>
              <p className="text-sm text-gray-500">— Parent in California</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5A623]/10">
              <p className="text-gray-700 italic mb-4">
                "The automated scheduling changed everything. Our children know exactly what to expect,
                and we spend less time coordinating and more time being present."
              </p>
              <p className="text-sm text-gray-500">— Parent in Texas</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Join the Mission */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            Every family deserves peace.
            <br />
            <span className="text-[#F5A623]">Yours can start today.</span>
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Join thousands of families who've found a calmer way to co-parent.
            Structure, clarity, and peace for your children.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-[#2D8A70] transition-colors shadow-lg hover:shadow-xl group"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[var(--portal-primary)] font-semibold rounded-full hover:bg-gray-50 transition-colors border-2 border-[var(--portal-primary)]"
            >
              See How It Works
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            No credit card required. Free tier forever. 14-day trial on paid plans.
          </p>
        </div>
      </section>
    </div>
  );
}
