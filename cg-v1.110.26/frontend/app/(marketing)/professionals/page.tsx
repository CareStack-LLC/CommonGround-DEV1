'use client';

import Link from 'next/link';
import {
  Scale,
  Users,
  Building2,
  FileText,
  Shield,
  Eye,
  ArrowRight,
  Check,
  BarChart3,
  Download,
  Search,
  Zap,
  Globe,
} from 'lucide-react';

/**
 * Professionals Landing Page
 *
 * Focus on Firm Directory visibility and Contact Sales CTA
 */

const benefits = [
  {
    icon: Globe,
    title: 'Get discovered by clients',
    description: 'Your firm appears in our directory when parents are ready to file. Be there at the moment they need you most.',
    highlight: true,
  },
  {
    icon: Eye,
    title: 'See the full picture',
    description: 'Access verified communication records, compliance data, and behavioral patterns—not just "he said, she said."',
  },
  {
    icon: Download,
    title: 'Court-ready exports',
    description: 'SHA-256 verified documents. Timestamped. Tamper-proof. No more discovery disputes.',
  },
  {
    icon: BarChart3,
    title: 'Track compliance',
    description: 'Real-time dashboards show schedule adherence, communication quality, and agreement compliance.',
  },
];

const whoItsFor = [
  { role: 'Family Law Attorneys', icon: Scale },
  { role: 'Guardians ad Litem', icon: Users },
  { role: 'Mediators', icon: Building2 },
  { role: 'Custody Evaluators', icon: FileText },
  { role: 'Parenting Coordinators', icon: Users },
];

const directoryFeatures = [
  'Appear in searches by location and specialty',
  'Profile includes credentials, reviews, and availability',
  'Parents can request consultations directly',
  'One click to accept new clients',
];

export default function ProfessionalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--portal-primary)]/10 rounded-full mb-6">
            <Scale className="w-4 h-4 text-[var(--portal-primary)]" />
            <span className="text-sm font-medium text-[var(--portal-primary)]">For Family Law Professionals</span>
          </div>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#2C3E50] mb-6 leading-[1.05]"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Clients find you when they
            <br />
            <span className="text-[#D97757]">need you most</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            CommonGround puts your firm in front of parents at the moment they're ready to file—
            <span className="font-medium text-[var(--portal-primary)]"> not when they're searching Google.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?type=professional"
              className="inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-[#1e4442] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
            >
              Contact Sales
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact?type=demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[var(--portal-primary)] font-semibold rounded-full border-2 border-[var(--portal-primary)] hover:bg-[var(--portal-primary)]/5 transition-all"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Firm Directory Highlight */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[var(--portal-primary)] to-[#1e4442] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full mb-6">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Firm Directory</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-serif mb-6"
                style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
              >
                Be one click away from your next client
              </h2>
              <p className="text-lg text-white/80 mb-8">
                When parents on CommonGround are ready to hire representation, they search our directory first.
                Your firm shows up based on location, specialty, and availability—right when they need you.
              </p>
              <ul className="space-y-3">
                {directoryFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#D97757] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Directory Preview */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500">Find a professional near Los Angeles, CA...</span>
              </div>
              {[
                { name: 'Morrison Family Law', specialty: 'High-Conflict Custody', rating: '4.9' },
                { name: 'Chen & Associates', specialty: 'Mediation, Collaborative', rating: '4.8' },
                { name: 'Your Firm Here', specialty: 'Your Specialty', rating: '★', highlight: true },
              ].map((firm, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl mb-3 transition-all ${
                    firm.highlight
                      ? 'bg-[#D97757]/10 border-2 border-[#D97757]/30'
                      : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold ${firm.highlight ? 'text-[#D97757]' : 'text-[#2C3E50]'}`}>
                        {firm.name}
                      </p>
                      <p className="text-sm text-gray-500">{firm.specialty}</p>
                    </div>
                    <div className={`text-sm font-medium ${firm.highlight ? 'text-[#D97757]' : 'text-[var(--portal-primary)]'}`}>
                      {firm.rating}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4"
              style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
            >
              Built for family law <span className="text-[#D97757]">professionals</span>
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {whoItsFor.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.role}
                  className="flex items-center gap-3 bg-gradient-to-br from-[#F5F9F9] to-white rounded-full px-6 py-3 border-2 border-[var(--portal-primary)]/10"
                >
                  <Icon className="w-5 h-5 text-[var(--portal-primary)]" />
                  <span className="font-medium text-[#2C3E50]">{item.role}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 gap-8">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className={`rounded-3xl p-8 border-2 transition-all hover:shadow-lg group ${
                    benefit.highlight
                      ? 'bg-gradient-to-br from-[#D97757]/10 to-[#D97757]/5 border-[#D97757]/20 hover:border-[#D97757]/40'
                      : 'bg-gradient-to-br from-[#F5F9F9] to-white border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/30'
                  }`}
                >
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
                    benefit.highlight ? 'bg-[#D97757]/20' : 'bg-[var(--portal-primary)]/10'
                  }`}>
                    <Icon className={`h-7 w-7 ${benefit.highlight ? 'text-[#D97757]' : 'text-[var(--portal-primary)]'}`} />
                  </div>
                  <h3
                    className="text-xl font-semibold text-[#2C3E50] mb-3"
                    style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                  >
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4"
              style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
            >
              Simple to <span className="text-[#D97757]">get started</span>
            </h2>
          </div>

          <div className="space-y-8">
            {[
              { step: '01', title: 'Contact our sales team', description: 'We\'ll learn about your practice and show you the platform.' },
              { step: '02', title: 'Set up your firm profile', description: 'Add your credentials, specialties, and service areas.' },
              { step: '03', title: 'Appear in the directory', description: 'Parents searching in your area will find you immediately.' },
              { step: '04', title: 'Accept clients one click', description: 'When a parent requests you, you\'re instantly connected.' },
            ].map((item, index) => (
              <div key={item.step} className="flex gap-6 items-start">
                <span
                  className="text-5xl font-serif text-gray-100"
                  style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                >
                  {item.step}
                </span>
                <div className="flex-1 pt-2">
                  <h3
                    className="text-xl font-semibold text-[#2C3E50] mb-2"
                    style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-[var(--portal-primary)] to-[#1e4442] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Ready to grow your practice?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Get in front of parents who are ready to take action.
            No advertising. No cold leads. Just clients who need you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?type=professional"
              className="inline-flex items-center justify-center px-10 py-5 bg-[#D97757] text-white font-bold text-lg rounded-full hover:bg-[#c26647] transition-all shadow-2xl hover:-translate-y-1 group"
            >
              Contact Sales
              <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link
              href="/contact?type=demo"
              className="inline-flex items-center justify-center px-10 py-5 bg-white/10 text-white font-bold text-lg rounded-full hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
