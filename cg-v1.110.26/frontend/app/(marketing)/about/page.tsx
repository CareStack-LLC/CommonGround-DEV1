import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Code, Users, Wrench, GraduationCap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | CommonGround',
  description: 'The story of CommonGround - built by a father and tech professional who needed a better way to co-parent.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9]">
      {/* Hero - Personal Introduction */}
      <section className="relative overflow-hidden">
        {/* Subtle decorative lines */}
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
                The Story Behind CommonGround
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#2C3E50] mb-6 leading-[1.1]" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              I built this for myself.
              <br />
              <span className="text-[#2C5F5D]">Then realized others needed it too.</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8">
              Hi, I'm TJ. Father to TJ Jr. and Malia. 15+ years in tech. CISSP certified.
              And someone who needed a better way to co-parent.
            </p>

            {/* Personal touch - handwritten style quote */}
            <div className="border-l-4 border-[#D97757] pl-6 py-2 bg-gradient-to-r from-[#FFF8F3] to-transparent">
              <p className="text-gray-700 italic text-lg">
                "Most co-parenting apps assume you're talking. We weren't.
                I needed something that just worked—no drama, no back-and-forth."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem - Relatable */}
      <section className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-[#D97757]" />
              <span className="text-sm font-semibold text-[#D97757] uppercase tracking-wide">
                The Problem
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              Built for parents who <span className="text-[#D97757]">aren't talking</span>
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                I have two co-parents. We don't communicate well—and that's okay.
                Trying to force conversations just made things worse.
              </p>
              <p>
                Every co-parenting app I found was designed for parents who were already
                cooperating. But what about the rest of us?
              </p>
            </div>
          </div>

          <div className="relative">
            {/* Icon grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-full bg-[#FFF8F3] flex items-center justify-center mb-3">
                  <span className="text-2xl">📅</span>
                </div>
                <p className="text-sm font-medium text-gray-700">Schedule conflicts</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow mt-8">
                <div className="h-12 w-12 rounded-full bg-[#F5F9F9] flex items-center justify-center mb-3">
                  <span className="text-2xl">💬</span>
                </div>
                <p className="text-sm font-medium text-gray-700">Toxic messages</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-full bg-[#FFF8F3] flex items-center justify-center mb-3">
                  <span className="text-2xl">💰</span>
                </div>
                <p className="text-sm font-medium text-gray-700">Money arguments</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow mt-8">
                <div className="h-12 w-12 rounded-full bg-[#F5F9F9] flex items-center justify-center mb-3">
                  <span className="text-2xl">📱</span>
                </div>
                <p className="text-sm font-medium text-gray-700">Missing my kids</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution - What I Built */}
      <section className="bg-gradient-to-br from-[#2C5F5D] to-[#1e4442] text-white py-16 sm:py-20 my-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Code className="h-5 w-5 text-[#D97757]" />
              <span className="text-sm font-semibold text-[#D97757] uppercase tracking-wide">
                The Solution
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              Instead of forcing things, I made them <span className="text-[#D97757]">easy</span>
            </h2>
            <p className="text-lg text-white/80">
              I used the tech I know to solve the problems I had every day.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Automated scheduling</h3>
              <p className="text-white/70 text-sm">
                Set it once, never argue about pickups again
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl mb-3">💳</div>
              <h3 className="text-xl font-semibold mb-2">Shared expenses</h3>
              <p className="text-white/70 text-sm">
                Track who owes what, no spreadsheets needed
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl mb-3">📞</div>
              <h3 className="text-xl font-semibold mb-2">Talk to my kids</h3>
              <p className="text-white/70 text-sm">
                Video calls without going through anyone
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SimpleTech Systems - Professional Credibility */}
      <section className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="grid md:grid-cols-5 gap-12 items-start">
          <div className="md:col-span-3">
            <div className="inline-flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5 text-[#2C5F5D]" />
              <span className="text-sm font-semibold text-[#2C5F5D] uppercase tracking-wide">
                Built by SimpleTech Systems
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              Backed by 15+ years of <span className="text-[#2C5F5D]">building things that work</span>
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                I'm a CISSP-certified security professional with a background in completing
                large-scale software products. I've been in tech for over 15 years.
              </p>
              <p>
                CommonGround isn't a side project or a startup experiment. It's built with
                the same rigor and attention to detail I've brought to enterprise systems—except
                this time, it's personal.
              </p>
              <p>
                SimpleTech Systems is my way of applying professional-grade engineering to
                problems that real families face every day.
              </p>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-8 border-2 border-[#2C5F5D]/10">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#2C5F5D] mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">CISSP Certified</p>
                    <p className="text-sm text-gray-600">Security-first architecture</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#2C5F5D] mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">15+ Years in Tech</p>
                    <p className="text-sm text-gray-600">Enterprise software experience</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#2C5F5D] mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">SimpleTech Systems</p>
                    <p className="text-sm text-gray-600">Professional-grade solutions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Forever Forward - Giving Back */}
      <section className="bg-gradient-to-br from-[#FFF8F3] to-[#FFE8D9] py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <GraduationCap className="h-5 w-5 text-[#D97757]" />
                <span className="text-sm font-semibold text-[#D97757] uppercase tracking-wide">
                  Forever Forward Nonprofit
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                Helping fathers and families <span className="text-[#D97757]">level up</span>
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Building CommonGround taught me that technology can change lives—but
                  only if people know how to use it.
                </p>
                <p>
                  That's why I started <strong>Forever Forward</strong>, a nonprofit dedicated
                  to helping fathers and families understand technology and get training in
                  trades and tech careers.
                </p>
                <p className="text-gray-600 text-sm italic">
                  Because every dad should have the tools—literal and digital—to provide for
                  their family and stay connected to their kids.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-[#D97757]/20">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#D97757]/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-[#D97757]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Tech Training</h3>
                      <p className="text-sm text-gray-600">
                        Coding bootcamps, cybersecurity basics, software skills
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#D97757]/10 flex items-center justify-center flex-shrink-0">
                      <Wrench className="h-6 w-6 text-[#D97757]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Trades Education</h3>
                      <p className="text-sm text-gray-600">
                        HVAC, electrical, plumbing, construction certifications
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#D97757]/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="h-6 w-6 text-[#D97757]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Family Support</h3>
                      <p className="text-sm text-gray-600">
                        Resources for fathers navigating co-parenting and custody
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <a
                    href="https://foreverforward.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D97757] font-semibold hover:text-[#c26647] transition-colors inline-flex items-center gap-2 group"
                  >
                    Learn more about Forever Forward
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Soft Invitation */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            If you're struggling to co-parent,
            <br />
            <span className="text-[#D97757]">you're not alone</span>
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            I built CommonGround because I needed it. Maybe you do too.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#2C5F5D] text-white font-semibold rounded-full hover:bg-[#1e4442] transition-colors shadow-lg hover:shadow-xl group"
            >
              Try CommonGround Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#2C5F5D] font-semibold rounded-full hover:bg-gray-50 transition-colors border-2 border-[#2C5F5D]"
            >
              Get in Touch
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            No credit card required. Forever free tier available.
          </p>
        </div>
      </section>

      {/* Footer signature */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="border-t border-gray-200 pt-8">
          <p className="text-center text-gray-600">
            Built with care by TJ
            <br />
            <span className="text-sm text-gray-500">For TJ Jr., Malia, and every parent trying their best</span>
          </p>
        </div>
      </div>
    </div>
  );
}
