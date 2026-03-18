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
  MessageSquare,
  Calendar,
  DollarSign,
  ClipboardCheck,
  Brain,
  Globe,
} from 'lucide-react';

/**
 * Professionals Landing Page
 *
 * Unified page for all family law professionals — attorneys, mediators,
 * GALs, custody evaluators, and parenting coordinators.
 *
 * CommonGround is NOT a practice management tool. It's a bridge between
 * parents and professionals — giving professionals a window into verified
 * family data without managing the case themselves.
 */

const whoItsFor = [
  { role: 'Family Law Attorneys', icon: Scale, description: 'Access verified evidence for custody and support cases' },
  { role: 'Mediators', icon: Building2, description: 'Review communication patterns before and during sessions' },
  { role: 'Guardians ad Litem', icon: Shield, description: 'See the full picture of family dynamics and compliance' },
  { role: 'Custody Evaluators', icon: FileText, description: 'Analyze behavioral data and co-parenting patterns' },
  { role: 'Parenting Coordinators', icon: Users, description: 'Monitor compliance and track agreement adherence' },
];

const dataAccess = [
  {
    icon: MessageSquare,
    title: 'Communications',
    description: 'Verified, timestamped messages between co-parents with tone and sentiment context from ARIA.',
  },
  {
    icon: Calendar,
    title: 'Custody Exchanges',
    description: 'Check-in/check-out logs, schedule adherence, and any documented disruptions or modifications.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Data',
    description: 'Agreement adherence tracking, schedule compliance rates, and behavioral pattern analysis.',
  },
  {
    icon: DollarSign,
    title: 'Financial Records',
    description: 'Shared expense submissions, payment history, and verified financial documentation.',
  },
  {
    icon: Brain,
    title: 'ARIA Analysis',
    description: 'AI-powered insights on communication quality, co-parenting dynamics, and areas of concern.',
  },
  {
    icon: Download,
    title: 'Court-Ready Exports',
    description: 'Professional PDF reports with SHA-256 verification, neutral formatting, and complete audit trails.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Get invited or self-enroll',
    description: 'A parent adds you to their case, or you join through our professional portal.',
  },
  {
    step: '02',
    title: 'Access the family file',
    description: 'Review the family\'s CommonGround activity — communications, exchanges, finances, and compliance.',
  },
  {
    step: '03',
    title: 'Review and analyze',
    description: 'Use verified data and ARIA insights to inform your recommendations and decisions.',
  },
  {
    step: '04',
    title: 'Export court-ready documentation',
    description: 'Generate professional, tamper-proof reports ready for court filings or mediation sessions.',
  },
];

export default function ProfessionalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A4A]/10 rounded-full mb-6">
            <Eye className="w-4 h-4 text-[#1E3A4A]" />
            <span className="text-sm font-medium text-[#1E3A4A]">For Family Law Professionals</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl text-[#1E3A4A] mb-6 leading-[1.1]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            The family data your cases need
            <br />
            <span className="text-[#3DAA8A]">organized, verified, and ready</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            CommonGround gives professionals a window into verified co-parenting activity — messages,
            custody exchanges, finances, and compliance — without managing the case yourself.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/help/contact?type=demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#1E3A4A] text-white font-semibold rounded-full hover:bg-[#2D6A8F] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
            >
              Schedule a Demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#1E3A4A] font-semibold rounded-full border-2 border-[#1E3A4A]/20 hover:border-[#1E3A4A]/40 hover:bg-[#1E3A4A]/5 transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Built for every family law <span className="text-[#3DAA8A]">professional</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you represent a parent, evaluate a family, or mediate a dispute — CommonGround
              gives you the verified data you need to do your best work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whoItsFor.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.role}
                  className="flex items-start gap-4 bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-6 border-2 border-[#1E3A4A]/8 hover:border-[#3DAA8A]/30 transition-all hover:shadow-md"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#3DAA8A]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-[#3DAA8A]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1E3A4A] mb-1">{item.role}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What You'll See — Data Access Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-[#F4F8F7] to-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3DAA8A]/10 rounded-full mb-6">
              <ClipboardCheck className="w-4 h-4 text-[#3DAA8A]" />
              <span className="text-sm font-medium text-[#3DAA8A]">What You'll See</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              A complete window into <span className="text-[#3DAA8A]">family activity</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              When a parent invites you to their case, you get read access to verified, timestamped
              records — the kind of data that changes how you approach family law.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataAccess.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-[#3DAA8A]/30 hover:shadow-lg transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#1E3A4A]/8 flex items-center justify-center mb-4 group-hover:bg-[#3DAA8A]/10 transition-colors">
                    <Icon className="h-6 w-6 text-[#1E3A4A] group-hover:text-[#3DAA8A] transition-colors" />
                  </div>
                  <h3
                    className="text-lg font-semibold text-[#1E3A4A] mb-2"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Directory Feature — Secondary, not hero */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F5A623]/10 rounded-full mb-6">
                <Globe className="w-4 h-4 text-[#F5A623]" />
                <span className="text-sm font-medium text-[#F5A623]">Professional Directory</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl text-[#1E3A4A] mb-6"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Get discovered by families <span className="text-[#F5A623]">who need you</span>
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                When parents on CommonGround need professional support, they search our directory.
                Your profile shows up based on location, specialty, and availability.
              </p>
              <ul className="space-y-3">
                {[
                  'Appear in searches by location and specialty',
                  'Profile includes credentials and service areas',
                  'Parents can request consultations directly',
                  'Easy onboarding — set up your profile in minutes',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#3DAA8A] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Directory Preview */}
            <div className="bg-[#F4F8F7] rounded-3xl p-6 border-2 border-gray-100 shadow-lg">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <Search className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500">Find a professional near Los Angeles, CA...</span>
              </div>
              {[
                { name: 'Morrison Family Law', specialty: 'Custody & Co-Parenting', type: 'Attorney' },
                { name: 'Bay Area Mediation Group', specialty: 'Mediation, Collaborative', type: 'Mediator' },
                { name: 'Your Practice Here', specialty: 'Your Specialty', type: '', highlight: true },
              ].map((firm, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl mb-3 transition-all ${
                    firm.highlight
                      ? 'bg-[#F5A623]/10 border-2 border-[#F5A623]/30'
                      : 'bg-white border border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold ${firm.highlight ? 'text-[#F5A623]' : 'text-[#1E3A4A]'}`}>
                        {firm.name}
                      </p>
                      <p className="text-sm text-gray-500">{firm.specialty}</p>
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                      firm.highlight
                        ? 'bg-[#F5A623]/20 text-[#F5A623]'
                        : 'bg-[#3DAA8A]/10 text-[#3DAA8A]'
                    }`}>
                      {firm.highlight ? 'Join today' : firm.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 bg-[#F4F8F7]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Simple to <span className="text-[#3DAA8A]">get started</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              No complex onboarding. No software to install. Access verified family data in minutes.
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#1E3A4A] flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{item.step}</span>
                </div>
                <div className="flex-1 pt-1">
                  <h3
                    className="text-xl font-semibold text-[#1E3A4A] mb-2"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
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

      {/* Security & Trust */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] rounded-3xl p-8 sm:p-12 text-white">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full mb-6">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Security & Compliance</span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl mb-4"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Built for the standards your profession demands
                </h2>
                <p className="text-lg text-white/80">
                  Every record is encrypted, timestamped, and tamper-proof. Court-ready by design.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  'End-to-end encryption',
                  'SHA-256 verification',
                  'Uneditable audit trails',
                  'Role-based access',
                  'Tamper-proof records',
                  'Secure data exports',
                ].map((feature) => (
                  <div
                    key={feature}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                  >
                    <Check className="w-5 h-5 text-[#3DAA8A] mb-2" />
                    <div className="text-sm font-medium text-white/90">{feature}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2
            className="text-4xl sm:text-5xl mb-6"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Better data makes for better outcomes
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            See how CommonGround gives family law professionals the verified, organized data
            they need — without adding another tool to manage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/help/contact?type=demo"
              className="inline-flex items-center justify-center px-10 py-5 bg-[#F5A623] text-white font-bold text-lg rounded-full hover:bg-[#E09520] transition-all shadow-2xl hover:-translate-y-1 group"
            >
              Schedule a Demo
              <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center px-10 py-5 bg-white/10 text-white font-bold text-lg rounded-full hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
