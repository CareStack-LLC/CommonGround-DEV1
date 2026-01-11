import { Metadata } from 'next';
import Link from 'next/link';
import {
  MessageSquare,
  FileText,
  Calendar,
  Wallet,
  Shield,
  Users,
  ArrowRight,
  Check,
  Sparkles,
  Clock,
  Bell,
  Lock,
  FileCheck,
  Scale,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features | CommonGround',
  description: 'Explore all CommonGround features: ARIA messaging, SharedCare agreements, TimeBridge scheduling, ClearFund expenses, and more.',
};

/**
 * Features Page
 *
 * Comprehensive breakdown of all platform features with comparisons.
 */

const mainFeatures = [
  {
    icon: MessageSquare,
    name: 'ARIA Messaging',
    tagline: 'AI-Powered Communication',
    description: 'Send messages with confidence. ARIA analyzes your messages before they\'re sent, suggesting gentler alternatives that maintain your meaning while reducing conflict.',
    highlights: [
      'Real-time sentiment analysis',
      'Smart rewrite suggestions',
      'Conflict prevention alerts',
      'Good faith metrics tracking',
    ],
    color: 'cg-amber',
  },
  {
    icon: FileText,
    name: 'SharedCare Agreements',
    tagline: 'Build Your Agreement Together',
    description: 'Create comprehensive custody agreements with our guided 18-section wizard. Both parents contribute and approve, ensuring everyone is on the same page.',
    highlights: [
      '18 customizable sections',
      'Dual parent approval',
      'Version history tracking',
      'Court-ready PDF export',
    ],
    color: 'cg-sage',
  },
  {
    icon: Calendar,
    name: 'TimeBridge Calendar',
    tagline: 'Shared Scheduling Made Simple',
    description: 'Keep track of custody schedules, exchanges, and important events in one shared calendar. Never miss a pickup or forget an appointment again.',
    highlights: [
      'Visual custody tracking',
      'Exchange reminders',
      'Silent Handoff GPS check-in',
      'Grace period management',
    ],
    color: 'cg-slate',
  },
  {
    icon: Wallet,
    name: 'ClearFund Expenses',
    tagline: 'Transparent Financial Tracking',
    description: 'Track shared expenses, request reimbursements, and maintain a clear ledger of who owes what. No more arguments about money.',
    highlights: [
      'Purpose-locked obligations',
      'Receipt verification',
      'Automatic split calculations',
      'Payment history tracking',
    ],
    color: 'cg-sage',
  },
  {
    icon: FileCheck,
    name: 'Court Exports',
    tagline: 'Evidence When You Need It',
    description: 'Generate verified evidence packages for court proceedings. All communications, agreements, and compliance data in one court-ready document.',
    highlights: [
      'SHA-256 integrity verification',
      'Date range selection',
      'Redaction options',
      'Professional formatting',
    ],
    color: 'cg-slate',
  },
  {
    icon: Users,
    name: 'Legal Portal',
    tagline: 'Professional Access',
    description: 'Grant secure, time-limited access to attorneys, GALs, mediators, and other professionals involved in your case.',
    highlights: [
      'Role-based permissions',
      'Audit trail logging',
      'Time-limited access',
      'Read-only options',
    ],
    color: 'cg-amber',
  },
];

const comparisonItems = [
  { feature: 'Shared custody calendar', commonground: true, spreadsheet: false, email: false },
  { feature: 'AI-powered message assistance', commonground: true, spreadsheet: false, email: false },
  { feature: 'Custody agreement builder', commonground: true, spreadsheet: false, email: false },
  { feature: 'Expense tracking & splits', commonground: true, spreadsheet: true, email: false },
  { feature: 'Court-ready documentation', commonground: true, spreadsheet: false, email: false },
  { feature: 'Exchange check-in verification', commonground: true, spreadsheet: false, email: false },
  { feature: 'Professional access portal', commonground: true, spreadsheet: false, email: false },
  { feature: 'Version history', commonground: true, spreadsheet: true, email: true },
  { feature: 'Mobile friendly', commonground: true, spreadsheet: false, email: true },
  { feature: 'Conflict reduction tools', commonground: true, spreadsheet: false, email: false },
];

const additionalFeatures = [
  { icon: Bell, name: 'Smart Notifications', description: 'Get reminders for exchanges, pending approvals, and important deadlines.' },
  { icon: Lock, name: 'End-to-End Encryption', description: 'All data is encrypted at rest and in transit using bank-level security.' },
  { icon: Clock, name: 'Activity Tracking', description: 'See what\'s happened while you were away with the activity feed.' },
  { icon: Sparkles, name: 'Quick Accords', description: 'Create quick agreements for one-time schedule changes or decisions.' },
  { icon: Scale, name: 'Compliance Metrics', description: 'Track on-time exchanges and agreement compliance over time.' },
  { icon: Shield, name: 'Audit Logging', description: 'Every action is logged for transparency and court readiness.' },
];

export default function FeaturesPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-amber/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Everything you need for <span className="text-cg-sage">peaceful co-parenting</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A complete platform designed to reduce conflict, improve communication,
              and keep your children at the center of every decision.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {mainFeatures.map((feature, index) => {
              const Icon = feature.icon;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={feature.name}
                  className={`grid lg:grid-cols-2 gap-12 items-center ${
                    isEven ? '' : 'lg:flex-row-reverse'
                  }`}
                >
                  <div className={isEven ? '' : 'lg:order-2'}>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 bg-${feature.color}-subtle rounded-full mb-4`}>
                      <Icon className={`w-4 h-4 text-${feature.color}`} />
                      <span className={`text-sm font-medium text-${feature.color}`}>
                        {feature.tagline}
                      </span>
                    </div>
                    <h2 className="text-3xl font-semibold text-foreground mb-4">
                      {feature.name}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full bg-${feature.color}-subtle flex items-center justify-center`}>
                            <Check className={`w-3 h-3 text-${feature.color}`} />
                          </div>
                          <span className="text-foreground">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={isEven ? '' : 'lg:order-1'}>
                    <div className={`bg-gradient-to-br from-${feature.color}-subtle to-background rounded-3xl p-8 aspect-video flex items-center justify-center border border-border/50`}>
                      <Icon className={`w-24 h-24 text-${feature.color}/30`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Why CommonGround?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how we compare to the alternatives.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Feature</th>
                  <th className="text-center py-4 px-4">
                    <div className="font-semibold text-cg-sage">CommonGround</div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="font-semibold text-muted-foreground">Spreadsheets</div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="font-semibold text-muted-foreground">Email/Text</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonItems.map((item) => (
                  <tr key={item.feature} className="border-b border-border/50">
                    <td className="py-4 px-4 text-foreground">{item.feature}</td>
                    <td className="text-center py-4 px-4">
                      {item.commonground ? (
                        <Check className="w-5 h-5 text-cg-sage mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {item.spreadsheet ? (
                        <Check className="w-5 h-5 text-muted-foreground mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {item.email ? (
                        <Check className="w-5 h-5 text-muted-foreground mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              And much more...
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built with everything you need for successful co-parenting.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.name}
                  className="bg-card rounded-xl p-6 border border-border/50 hover:border-cg-sage/30 transition-colors"
                >
                  <Icon className="w-8 h-8 text-cg-sage mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{feature.name}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
