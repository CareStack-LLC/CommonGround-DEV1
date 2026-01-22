import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Shield, Users, CheckCircle, MessageSquare, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | CommonGround',
  description: 'CommonGround exists to help families find peace when communication has broken down. Technology built for when co-parenting is hard.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9]">
      {/* Hero - Mission Statement */}
      <section className="relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-20 left-0 w-full h-px bg-[#D97757]" />
          <div className="absolute top-40 right-0 w-2/3 h-px bg-[#2C5F5D]" />
          <div className="absolute bottom-40 left-0 w-1/2 h-px bg-[#D97757]" />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24 relative">
          <div className="max-w-3xl">
            {/* Label */}
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="h-px w-12 bg-[#D97757]" />
              <span className="text-sm font-medium text-[#D97757] tracking-wide uppercase">
                Our Mission
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#2C3E50] mb-6 leading-[1.1]" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              When communication breaks down,
              <br />
              <span className="text-[#2C5F5D]">children still need peace</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8">
              CommonGround exists to help families navigate co-parenting when talking has become too hard.
              We believe technology can reduce conflict, protect children, and create space for healing.
            </p>

            {/* Mission statement box */}
            <div className="border-l-4 border-[#2C5F5D] pl-6 py-3 bg-gradient-to-r from-[#F5F9F9] to-transparent">
              <p className="text-gray-700 font-medium text-lg">
                Every child deserves parents who can work together—even when they can't be together.
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
              <Heart className="h-5 w-5 text-[#D97757]" />
              <span className="text-sm font-semibold text-[#D97757] uppercase tracking-wide">
                The Reality
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              Co-parenting apps assume <span className="text-[#D97757]">you're talking</span>
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Most co-parenting tools are designed for parents who are already cooperating.
                But what about families where communication has become toxic? Where every
                conversation escalates into conflict?
              </p>
              <p>
                <strong className="text-gray-700">Millions of children</strong> live in high-conflict
                custody situations. They hear the arguments. They feel the tension. They blame themselves.
              </p>
              <p className="text-gray-700 font-medium">
                These families don't need better communication tools. They need space to heal.
              </p>
            </div>
          </div>

          <div className="relative">
            {/* Statistics cards */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 border-2 border-[#2C5F5D]/10 shadow-sm">
                <div className="text-4xl font-bold text-[#2C5F5D] mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  40%
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  of marriages end in divorce, impacting millions of children each year
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border-2 border-[#D97757]/10 shadow-sm">
                <div className="text-4xl font-bold text-[#D97757] mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  25-30%
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  of divorces involve high conflict that directly harms children's wellbeing
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border-2 border-[#2C5F5D]/10 shadow-sm">
                <div className="text-4xl font-bold text-[#2C5F5D] mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  $50B+
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  annual cost of high-conflict custody battles on families and courts
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution - How We're Different */}
      <section className="bg-gradient-to-br from-[#2C5F5D] to-[#1e4442] text-white py-16 sm:py-20 my-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-[#D97757]" />
              <span className="text-sm font-semibold text-[#D97757] uppercase tracking-wide">
                Our Approach
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              Technology that reduces conflict, <span className="text-[#D97757]">not just manages it</span>
            </h2>
            <p className="text-lg text-white/80">
              CommonGround is designed for families where communication has broken down.
              We remove friction, automate the painful parts, and create accountability without escalation.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <MessageSquare className="h-10 w-10 text-[#D97757] mb-4" />
              <h3 className="text-xl font-semibold mb-2">Communication Without Conflict</h3>
              <p className="text-white/70 text-sm">
                ARIA AI analyzes messages before they're sent, catching inflammatory language
                before it causes damage
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <Calendar className="h-10 w-10 text-[#D97757] mb-4" />
              <h3 className="text-xl font-semibold mb-2">Automation Over Argument</h3>
              <p className="text-white/70 text-sm">
                Set schedules once, never negotiate pickups again. Silent handoffs with GPS
                verification eliminate contact
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <CheckCircle className="h-10 w-10 text-[#D97757] mb-4" />
              <h3 className="text-xl font-semibold mb-2">Accountability & Evidence</h3>
              <p className="text-white/70 text-sm">
                Court-ready documentation of every interaction, payment, and exchange.
                Truth over accusations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Principles */}
      <section className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-[#2C5F5D]" />
            <span className="text-sm font-semibold text-[#2C5F5D] uppercase tracking-wide">
              What We Believe
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            Principles that <span className="text-[#2C5F5D]">guide everything we build</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-8 border-2 border-[#2C5F5D]/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-[#2C5F5D] flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Children First, Always
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Every feature we build asks: "Will this reduce stress on the kids?"
                  If it doesn't help children feel safer and more secure, we don't build it.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FFF8F3] to-white rounded-2xl p-8 border-2 border-[#D97757]/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-[#D97757] flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Safety Through Distance
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Sometimes the best communication is no communication. We create structured space
                  between parents when tension is high, protecting everyone involved.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-8 border-2 border-[#2C5F5D]/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-[#2C5F5D] flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Truth Over Drama
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Objective records replace he-said-she-said. GPS verification. Timestamped messages.
                  Payment receipts. Let the facts speak.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FFF8F3] to-white rounded-2xl p-8 border-2 border-[#D97757]/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-[#D97757] flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
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
      <section className="bg-gradient-to-br from-[#FFF8F3] to-[#FFE8D9] py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-[#D97757]" />
              <span className="text-sm font-semibold text-[#D97757] uppercase tracking-wide">
                Making a Difference
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              Real families finding <span className="text-[#D97757]">real peace</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Thousands of families use CommonGround to reduce conflict, improve co-parenting,
              and give their children the stability they deserve.
            </p>
          </div>

          {/* Impact metrics */}
          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="text-5xl font-bold text-[#2C5F5D] mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                10K+
              </div>
              <p className="text-gray-700 font-medium">Families served</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[#D97757] mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                85%
              </div>
              <p className="text-gray-700 font-medium">Report reduced conflict</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[#2C5F5D] mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                500K+
              </div>
              <p className="text-gray-700 font-medium">Messages mediated by ARIA</p>
            </div>
          </div>

          {/* Testimonial highlights - anonymous */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2C5F5D]/10">
              <p className="text-gray-700 italic mb-4">
                "For the first time in years, I don't dread opening messages from my ex.
                ARIA catches the hostile tone before it reaches me. It's like having a buffer."
              </p>
              <p className="text-sm text-gray-500">— Parent in California</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#D97757]/10">
              <p className="text-gray-700 italic mb-4">
                "The silent handoff changed everything. We don't have to see each other,
                and my son doesn't have to witness the tension anymore."
              </p>
              <p className="text-sm text-gray-500">— Parent in Texas</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Join the Mission */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            Every family deserves peace.
            <br />
            <span className="text-[#D97757]">Yours can start today.</span>
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Join thousands of parents who've found a better way to co-parent.
            Reduce conflict. Protect your children. Create space to heal.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#2C5F5D] text-white font-semibold rounded-full hover:bg-[#1e4442] transition-colors shadow-lg hover:shadow-xl group"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#2C5F5D] font-semibold rounded-full hover:bg-gray-50 transition-colors border-2 border-[#2C5F5D]"
            >
              See How It Works
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            No credit card required • Free tier forever • 14-day trial on paid plans
          </p>
        </div>
      </section>
    </div>
  );
}
