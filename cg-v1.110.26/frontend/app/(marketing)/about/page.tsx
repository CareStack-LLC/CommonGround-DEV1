import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Shield, Users, CheckCircle, MessageSquare, Calendar } from 'lucide-react';
import { DecorativeRules } from '@/components/marketing';

export const metadata: Metadata = {
  title: 'About Us | CommonGround',
  description: 'CommonGround helps families find peace and stability through structured co-parenting tools. Technology built to put children first.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cg-sand via-white to-cg-mist">
      {/* Hero - Mission Statement */}
      <section className="relative overflow-hidden">
        <DecorativeRules variant="section" />

        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24 relative">
          <div className="max-w-3xl">
            {/* Label */}
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="h-px w-12 bg-cg-amber" />
              <span className="text-sm font-medium text-cg-amber tracking-wide uppercase">
                Our Mission
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-foreground mb-6 leading-[1.1]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Every child deserves
              <br />
              <span className="text-cg-sage">a peaceful family</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8">
              CommonGround gives separated parents the structure to co-parent calmly — and keeps kids out of the conflict.
              Clear schedules, steadier messages, and records you can trust when it matters.
            </p>

            {/* Mission statement box */}
            <div className="border-l-4 border-cg-sage pl-6 py-3 bg-gradient-to-r from-cg-mist to-transparent">
              <p className="text-gray-700 font-medium text-lg">
                Protecting children through better co-parent communication — supported by parents, attorneys, and family law professionals working together.
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
              <Heart className="h-5 w-5 text-cg-amber" />
              <span className="text-sm font-semibold text-cg-amber uppercase tracking-wide">
                Why We Exist
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-foreground mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Co-parenting takes <span className="text-cg-amber">the right tools</span>
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
              <div className="bg-white rounded-2xl p-6 border-2 border-cg-sage/10 shadow-sm">
                <div className="text-4xl font-bold text-cg-sage mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  40%
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  of marriages end in divorce, impacting millions of children each year
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border-2 border-cg-amber/10 shadow-sm">
                <div className="text-4xl font-bold text-cg-amber mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Millions
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  of children are caught in ongoing co-parent conflict each year
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border-2 border-cg-sage/10 shadow-sm">
                <div className="text-4xl font-bold text-cg-sage mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Every day
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  custody conflict drains the time, money, and energy families need for their kids
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution - How We're Different */}
      <section className="bg-gradient-to-br from-foreground to-cg-slate text-white py-16 sm:py-20 my-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-cg-amber" />
              <span className="text-sm font-semibold text-cg-amber uppercase tracking-wide">
                Our Approach
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Technology that creates calm, <span className="text-cg-amber">not just manages it</span>
            </h2>
            <p className="text-lg text-white/80">
              CommonGround takes the friction out of co-parenting: ARIA steadies messages, TimeBridge runs the schedule, and every exchange is documented.
              So parents spend less energy coordinating and more on their kids.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <MessageSquare className="h-10 w-10 text-cg-amber mb-4" />
              <h3 className="text-xl font-semibold mb-2">Clear Communication</h3>
              <p className="text-white/70 text-sm">
                ARIA AI helps keep messages constructive and child-focused,
                so conversations stay calm and productive
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <Calendar className="h-10 w-10 text-cg-amber mb-4" />
              <h3 className="text-xl font-semibold mb-2">Effortless Coordination</h3>
              <p className="text-white/70 text-sm">
                Set schedules once, get automatic reminders. Smooth handoffs with GPS
                verification give children consistency
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <CheckCircle className="h-10 w-10 text-cg-amber mb-4" />
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
            <Users className="h-5 w-5 text-cg-sage" />
            <span className="text-sm font-semibold text-cg-sage uppercase tracking-wide">
              What We Believe
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif text-foreground mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            Principles that <span className="text-cg-sage">guide everything we build</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-cg-mist to-white rounded-2xl p-8 border-2 border-cg-sage/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-cg-sage flex items-center justify-center flex-shrink-0">
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

          <div className="bg-gradient-to-br from-cg-amber-subtle to-white rounded-2xl p-8 border-2 border-cg-amber/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-cg-amber flex items-center justify-center flex-shrink-0">
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

          <div className="bg-gradient-to-br from-cg-mist to-white rounded-2xl p-8 border-2 border-cg-sage/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-cg-sage flex items-center justify-center flex-shrink-0">
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

          <div className="bg-gradient-to-br from-cg-amber-subtle to-white rounded-2xl p-8 border-2 border-cg-amber/10">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-cg-amber flex items-center justify-center flex-shrink-0">
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

      {/* Founder Story */}
      <section className="bg-gradient-to-br from-foreground to-cg-slate text-white py-16 sm:py-20 my-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-cg-amber" />
              <span className="text-sm font-semibold text-cg-amber uppercase tracking-wide">
                Our Story
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Why CommonGround <span className="text-cg-amber">exists</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-[auto_1fr] gap-10 items-start max-w-4xl mx-auto">
            {/* Founder photo */}
            <div className="flex flex-col items-center gap-3 md:sticky md:top-8">
              <div className="h-40 w-40 rounded-full overflow-hidden shadow-xl border-4 border-white/20">
                <img
                  src="/images/website/thomasimage.PNG"
                  alt="Thomas Wilform with his children"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">Thomas Wilform</p>
                <p className="text-white/60 text-sm">Founder &amp; CEO</p>
              </div>
            </div>

            {/* Story content */}
            <div className="space-y-5 text-white/85 leading-relaxed">
              <p>
                CommonGround didn&apos;t come from some boardroom. I built this out of real life. I&apos;m from
                Compton with 15+ years in business and tech, and when I went looking for co-parenting tools,
                everything out there was basically a fancy spreadsheet. Nothing actually helped. Most didn&apos;t
                even let you connect with your kid. Like, what&apos;s the point?
              </p>
              <p>
                I wanted tech that auto-schedules exchanges, handles payments, keeps agreements accessible,
                and actually makes co-parenting easier. I built KidSpace so I could watch movies with my son
                even when we weren&apos;t in the same room. That&apos;s the whole vibe. Fun meets function,
                heart meets practicality.
              </p>
              <p>
                I also run the Forever Forward Foundation, helping nonprofits get the IT infrastructure they
                need. Same energy. Technology should work for people, not the other way around. CommonGround
                was built to help parents actually parent better.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Impact */}
      <section className="bg-gradient-to-br from-cg-amber-subtle to-cg-amber/10 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-cg-amber" />
              <span className="text-sm font-semibold text-cg-amber uppercase tracking-wide">
                Making a Difference
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-foreground mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Real families finding <span className="text-cg-amber">real peace</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Families use CommonGround to bring calm and structure
              to their co-parenting, giving their children the stability they deserve.
            </p>
          </div>

          {/* Impact metrics */}
          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="text-5xl font-bold text-cg-sage mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Growing
              </div>
              <p className="text-gray-700 font-medium">Families finding their way</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-cg-amber mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Calmer
              </div>
              <p className="text-gray-700 font-medium">Parents report calmer days</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-cg-sage mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Every
              </div>
              <p className="text-gray-700 font-medium">Message guided by ARIA</p>
            </div>
          </div>

          {/* Testimonial highlights */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-cg-sage/10">
              <p className="text-gray-700 italic mb-4">
                "For the first time in years, I feel calm about co-parenting.
                ARIA keeps our messages focused on the kids, and the structure makes everything predictable."
              </p>
              <p className="text-sm text-gray-500">— Parent in California</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-cg-amber/10">
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
          <h2 className="text-3xl sm:text-4xl font-serif text-foreground mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            Every family deserves peace.
            <br />
            <span className="text-cg-amber">Yours can start today.</span>
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Set up in about two minutes and start co-parenting calmer today —
            structure, clarity, and steadier days for your children.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/early-access"
              className="inline-flex items-center justify-center px-8 py-4 bg-cg-sage text-white font-semibold rounded-full hover:bg-cg-sage-dark transition-colors shadow-lg hover:shadow-xl group"
            >
              Start free — no card needed
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-cg-sage font-semibold rounded-full hover:bg-gray-50 transition-colors border-2 border-cg-sage"
            >
              See how it works
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            No credit card required. Free tier forever. 14-day trial on paid plans.
          </p>
          <p className="text-sm text-gray-400 mt-3">
            Family law professional?{' '}
            <Link href="/professionals" className="text-cg-sage hover:underline">
              See how the professional portal works
            </Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
