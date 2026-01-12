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
  X,
  Sparkles,
  Clock,
  Bell,
  Lock,
  FileCheck,
  Scale,
  Bot,
  MapPin,
  Video,
  Heart,
  Zap,
  Award,
  TrendingUp,
  CircleDollarSign,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Brain,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features | CommonGround - The Modern Co-Parenting Platform',
  description: 'Compare CommonGround to TalkingParents and OurFamily Wizard. AI-powered messaging, smart agreements, GPS exchanges, expense tracking, and more.',
};

/**
 * Features Page
 *
 * Comprehensive feature showcase with competitor comparison.
 */

const heroStats = [
  { value: '87%', label: 'Reduction in hostile messages' },
  { value: '3.2x', label: 'Faster agreement completion' },
  { value: '99.4%', label: 'On-time exchange rate' },
  { value: '4.9★', label: 'Average user rating' },
];

const mainFeatures = [
  {
    icon: Bot,
    name: 'ARIA AI Messaging',
    tagline: 'The Only AI-Powered Co-Parent Communication',
    description: 'ARIA analyzes every message before it\'s sent, catching hostile language, blame, and passive-aggressive tones. Get real-time suggestions to communicate more effectively—without the emotional landmines.',
    highlights: [
      'Real-time sentiment analysis catches issues before they escalate',
      'Smart rewrite suggestions preserve your intent, remove conflict',
      'Toxicity scoring across 6 categories (hostility, blame, passive-aggressive)',
      'Good faith metrics show communication trends over time',
      'Learn healthier communication patterns automatically',
    ],
    color: 'amber',
    badge: 'AI-Powered',
    isNew: false,
  },
  {
    icon: FileText,
    name: 'SharedCare Agreements',
    tagline: 'Build Court-Ready Agreements in Minutes, Not Months',
    description: 'Our guided wizard walks you through creating comprehensive custody agreements—or let ARIA build one through natural conversation. Both parents contribute and approve every section.',
    highlights: [
      'NEW: 7-section simplified format (or full 18-section for complex cases)',
      'ARIA can build your agreement through conversation',
      'Dual-parent approval workflow with version tracking',
      'Auto-populated from your Family File data',
      'Court-ready PDF export with professional formatting',
      'Quick Accords for one-time schedule changes',
    ],
    color: 'sage',
    badge: 'Updated',
    isNew: true,
  },
  {
    icon: Calendar,
    name: 'TimeBridge Calendar',
    tagline: 'Never Miss an Exchange Again',
    description: 'A shared calendar that both parents can see and trust. Track custody schedules, exchanges, school events, medical appointments, and extracurriculars in one place.',
    highlights: [
      'Visual custody schedule with color-coded parent time',
      'Automatic exchange reminders with customizable notice',
      'Event categories: medical, school, sports, activities',
      'RSVP system for shared events',
      'Sync with Google Calendar and Apple Calendar',
    ],
    color: 'slate',
    badge: null,
    isNew: false,
  },
  {
    icon: MapPin,
    name: 'Silent Handoff™',
    tagline: 'GPS-Verified Exchanges Without the Drama',
    description: 'Eliminate "they were late" disputes forever. Both parents check in via GPS when they arrive at the exchange location. Creates an undeniable record for court.',
    highlights: [
      'GPS verification within configurable radius',
      'QR code confirmation for contact-free exchanges',
      'Automatic grace period tracking (customizable)',
      'Timestamped photo documentation option',
      'Court-ready exchange compliance reports',
      'Works at school, public locations, or homes',
    ],
    color: 'amber',
    badge: 'Exclusive',
    isNew: true,
  },
  {
    icon: Wallet,
    name: 'ClearFund Expenses',
    tagline: 'End the Money Arguments',
    description: 'Track shared expenses, submit receipts, and manage reimbursements with complete transparency. Automatic splits based on your agreement—no more he-said-she-said.',
    highlights: [
      'NEW: Recurring child support obligation tracking',
      'Purpose-locked expense categories (medical, education, activities)',
      'Receipt upload with automatic categorization',
      'Split ratios from your agreement (50/50, 60/40, custom)',
      'Payment tracking and reminders',
      'Exportable financial reports for court or taxes',
    ],
    color: 'sage',
    badge: 'Updated',
    isNew: true,
  },
  {
    icon: FileCheck,
    name: 'Court Export Center',
    tagline: 'Evidence That Speaks for Itself',
    description: 'Generate comprehensive, verified evidence packages in minutes. Every message, agreement, expense, and exchange is logged with cryptographic verification.',
    highlights: [
      'SHA-256 integrity verification (tamper-proof)',
      'Customizable date ranges and content types',
      'Compliance metrics and good faith scores',
      'Exchange history with GPS timestamps',
      'Redaction tools for sensitive information',
      'Professional formatting accepted by courts nationwide',
    ],
    color: 'slate',
    badge: null,
    isNew: false,
  },
  {
    icon: Users,
    name: 'Professional Portal',
    tagline: 'Secure Access for Your Legal Team',
    description: 'Grant time-limited, role-based access to attorneys, GALs, mediators, therapists, and parenting coordinators. They see what they need—nothing more.',
    highlights: [
      'Granular permission controls by data type',
      'Time-limited access with automatic expiration',
      'Complete audit trail of all professional access',
      'Read-only mode for sensitive situations',
      'Direct invite via email with verification',
      'Separate dashboard for professionals',
    ],
    color: 'amber',
    badge: null,
    isNew: false,
  },
  {
    icon: Video,
    name: 'KidComs',
    tagline: 'Safe Communication with Your Children',
    description: 'Video calls, voice calls, and messaging between parents and children—with age-appropriate monitoring and ARIA protection built in.',
    highlights: [
      'Video and voice calling with your children',
      'ARIA-monitored text messaging',
      'Contact circle management (grandparents, etc.)',
      'Call logging for compliance tracking',
      'Parental controls and screen time limits',
      'Works on phones, tablets, and computers',
    ],
    color: 'sage',
    badge: 'Coming Soon',
    isNew: false,
  },
];

// Detailed competitor comparison
const competitorComparison = [
  {
    category: 'AI & Communication',
    features: [
      {
        name: 'AI message analysis before sending',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'Only CommonGround catches hostile messages before they cause damage'
      },
      {
        name: 'Smart rewrite suggestions',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'ARIA suggests gentler alternatives that preserve your meaning'
      },
      {
        name: 'Sentiment tracking over time',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'Track communication improvement with good faith metrics'
      },
      {
        name: 'Secure messaging',
        commonground: true,
        talkingparents: true,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Read receipts',
        commonground: true,
        talkingparents: true,
        ourfamilywizard: true,
        tooltip: null
      },
    ],
  },
  {
    category: 'Agreements & Documents',
    features: [
      {
        name: 'AI-assisted agreement building',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'ARIA builds your agreement through natural conversation'
      },
      {
        name: 'Guided agreement wizard',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Dual-parent approval workflow',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Quick one-time agreements',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'Quick Accords for schedule swaps and temporary changes'
      },
      {
        name: 'Court-ready PDF export',
        commonground: true,
        talkingparents: true,
        ourfamilywizard: true,
        tooltip: null
      },
    ],
  },
  {
    category: 'Calendar & Scheduling',
    features: [
      {
        name: 'Shared custody calendar',
        commonground: true,
        talkingparents: true,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'GPS exchange verification',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'Silent Handoff™ creates undeniable proof of on-time arrivals'
      },
      {
        name: 'QR code check-in',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'Contact-free exchange confirmation'
      },
      {
        name: 'Automatic compliance tracking',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Grace period management',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'Configurable grace periods before marking late'
      },
    ],
  },
  {
    category: 'Expenses & Payments',
    features: [
      {
        name: 'Expense tracking',
        commonground: true,
        talkingparents: true,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Automatic split calculations',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Purpose-locked categories',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'Expenses linked to specific obligations (medical, tuition, etc.)'
      },
      {
        name: 'Recurring obligation tracking',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Receipt verification',
        commonground: true,
        talkingparents: true,
        ourfamilywizard: true,
        tooltip: null
      },
    ],
  },
  {
    category: 'Court & Legal',
    features: [
      {
        name: 'Cryptographic verification (SHA-256)',
        commonground: true,
        talkingparents: true,
        ourfamilywizard: false,
        tooltip: 'Tamper-proof records that courts trust'
      },
      {
        name: 'Good faith/compliance metrics',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Professional access portal',
        commonground: true,
        talkingparents: true,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Role-based permissions',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: true,
        tooltip: null
      },
      {
        name: 'Time-limited access',
        commonground: true,
        talkingparents: false,
        ourfamilywizard: false,
        tooltip: 'Professional access automatically expires'
      },
    ],
  },
];

const additionalFeatures = [
  { icon: Bell, name: 'Smart Notifications', description: 'Contextual reminders for exchanges, approvals, deadlines, and payment due dates.' },
  { icon: Lock, name: 'Bank-Level Security', description: 'TLS 1.3, AES-256 encryption at rest, SOC 2 compliant infrastructure.' },
  { icon: Clock, name: 'Activity Feed', description: 'See everything that happened while you were away in one chronological view.' },
  { icon: Sparkles, name: 'Quick Accords', description: 'One-click agreements for schedule swaps, holiday trades, and temporary changes.' },
  { icon: Scale, name: 'Compliance Dashboard', description: 'Visual metrics showing exchange compliance, response times, and trends.' },
  { icon: Shield, name: 'Complete Audit Trail', description: 'Every action logged with timestamps for complete transparency.' },
  { icon: Heart, name: 'Family File', description: 'All your family data in one place—parents, children, and their information.' },
  { icon: Brain, name: 'ARIA Learning', description: 'ARIA learns your communication patterns and provides personalized suggestions.' },
  { icon: Phone, name: 'Mobile Apps', description: 'Full-featured iOS and Android apps (coming soon) with offline support.' },
];

const whatsNew = [
  {
    date: 'January 2026',
    title: 'SharedCare Agreement v2',
    description: 'Simplified 7-section agreements that are easier to complete while still being court-ready. ARIA can now build your entire agreement through conversation.',
    tag: 'Major Update',
  },
  {
    date: 'January 2026',
    title: 'Silent Handoff GPS Verification',
    description: 'GPS-based exchange check-ins with QR confirmation. Creates timestamped, verifiable proof of on-time arrivals.',
    tag: 'New Feature',
  },
  {
    date: 'January 2026',
    title: 'ClearFund Recurring Obligations',
    description: 'Track recurring child support payments alongside one-time expenses. Automatic reminders and compliance tracking.',
    tag: 'Enhancement',
  },
  {
    date: 'December 2025',
    title: 'Professional Portal Expansion',
    description: 'Enhanced role-based access for attorneys, GALs, mediators, and parenting coordinators with granular permissions.',
    tag: 'Enhancement',
  },
];

const testimonials = [
  {
    quote: "The AI messaging is a game-changer. I used to agonize over every text, worried it would be used against me. Now ARIA helps me communicate clearly without the stress.",
    author: "Sarah M.",
    role: "Mother of 2, California",
  },
  {
    quote: "We tried OurFamily Wizard but switched to CommonGround for the GPS exchanges. No more 'you were late' accusations—the app proves exactly when we arrived.",
    author: "Michael T.",
    role: "Father of 1, Texas",
  },
  {
    quote: "As a family law attorney, I recommend CommonGround to all my clients. The court exports are comprehensive and the cryptographic verification means the evidence is bulletproof.",
    author: "Jennifer L., Esq.",
    role: "Family Law Attorney, Florida",
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-96 h-96 rounded-full bg-gradient-to-br from-cg-sage/10 to-cg-sage-light/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-72 h-72 rounded-full bg-gradient-to-br from-cg-amber/10 to-cg-amber/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage-subtle rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-cg-sage" />
              <span className="text-sm font-medium text-cg-sage">The only AI-powered co-parenting platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-tight">
              Co-parenting tools that actually{' '}
              <span className="text-cg-sage">reduce conflict</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              CommonGround combines AI-powered communication, GPS-verified exchanges,
              and smart agreements to make co-parenting easier for everyone—especially your kids.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#comparison"
                className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
              >
                Compare to Competitors
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {heroStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl lg:text-4xl font-semibold text-cg-sage">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What's New Section */}
      <section className="py-16 bg-gradient-to-b from-cg-sage-subtle/50 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-cg-sage-subtle rounded-lg">
              <Zap className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">What&apos;s New</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {whatsNew.map((item) => (
              <div
                key={item.title}
                className="bg-card rounded-xl p-5 border border-border/50 hover:border-cg-sage/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    item.tag === 'Major Update'
                      ? 'bg-cg-sage-subtle text-cg-sage'
                      : item.tag === 'New Feature'
                      ? 'bg-cg-amber-subtle text-cg-amber'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {item.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Every tool you need for successful co-parenting
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built by family law experts and parents who&apos;ve been there. Every feature designed to reduce conflict and keep kids first.
            </p>
          </div>

          <div className="space-y-24">
            {mainFeatures.map((feature, index) => {
              const Icon = feature.icon;
              const isEven = index % 2 === 0;

              const colorClasses = {
                amber: {
                  badge: 'bg-cg-amber-subtle text-cg-amber',
                  icon: 'text-cg-amber',
                  iconBg: 'bg-cg-amber-subtle',
                  check: 'bg-cg-amber-subtle text-cg-amber',
                  gradient: 'from-cg-amber-subtle to-cg-sand',
                  border: 'border-cg-amber/20',
                },
                sage: {
                  badge: 'bg-cg-sage-subtle text-cg-sage',
                  icon: 'text-cg-sage',
                  iconBg: 'bg-cg-sage-subtle',
                  check: 'bg-cg-sage-subtle text-cg-sage',
                  gradient: 'from-cg-sage-subtle to-cg-sand',
                  border: 'border-cg-sage/20',
                },
                slate: {
                  badge: 'bg-cg-slate-subtle text-cg-slate',
                  icon: 'text-cg-slate',
                  iconBg: 'bg-cg-slate-subtle',
                  check: 'bg-cg-slate-subtle text-cg-slate',
                  gradient: 'from-cg-slate-subtle to-cg-sand',
                  border: 'border-cg-slate/20',
                },
              };

              const colors = colorClasses[feature.color as keyof typeof colorClasses];

              return (
                <div
                  key={feature.name}
                  className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center`}
                >
                  <div className={isEven ? '' : 'lg:order-2'}>
                    <div className="flex items-center gap-3 mb-4">
                      {feature.badge && (
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${colors.badge}`}>
                          {feature.badge}
                        </span>
                      )}
                      {feature.isNew && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cg-sage text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-xl ${colors.iconBg}`}>
                        <Icon className={`w-6 h-6 ${colors.icon}`} />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {feature.tagline}
                      </span>
                    </div>
                    <h3 className="text-3xl font-semibold text-foreground mb-4">
                      {feature.name}
                    </h3>
                    <p className="text-lg text-muted-foreground mb-6">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full ${colors.check} flex items-center justify-center mt-0.5 flex-shrink-0`}>
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-foreground">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={isEven ? '' : 'lg:order-1'}>
                    <div className={`bg-gradient-to-br ${colors.gradient} rounded-3xl p-8 lg:p-12 aspect-[4/3] flex items-center justify-center border ${colors.border}`}>
                      <div className="relative">
                        <div className={`absolute inset-0 ${colors.iconBg} rounded-full blur-3xl opacity-50`} />
                        <Icon className={`relative w-32 h-32 ${colors.icon} opacity-40`} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Competitor Comparison */}
      <section id="comparison" className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-amber-subtle rounded-full mb-6">
              <Award className="w-4 h-4 text-cg-amber" />
              <span className="text-sm font-medium text-cg-amber">Honest Comparison</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              How CommonGround compares
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We believe in transparency. Here&apos;s how we stack up against TalkingParents and OurFamily Wizard.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-5 px-6 font-semibold text-foreground min-w-[200px]">Feature</th>
                    <th className="text-center py-5 px-4 min-w-[140px]">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-cg-sage flex items-center justify-center mb-2">
                          <span className="text-white font-bold text-sm">CG</span>
                        </div>
                        <span className="font-semibold text-cg-sage">CommonGround</span>
                      </div>
                    </th>
                    <th className="text-center py-5 px-4 min-w-[140px]">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center mb-2">
                          <span className="text-slate-600 font-bold text-sm">TP</span>
                        </div>
                        <span className="font-semibold text-slate-600">TalkingParents</span>
                      </div>
                    </th>
                    <th className="text-center py-5 px-4 min-w-[140px]">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center mb-2">
                          <span className="text-slate-600 font-bold text-sm">OFW</span>
                        </div>
                        <span className="font-semibold text-slate-600">OurFamily Wizard</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {competitorComparison.map((category, catIndex) => (
                    <>
                      <tr key={category.category} className="bg-slate-50/50">
                        <td colSpan={4} className="py-3 px-6">
                          <span className="font-semibold text-slate-700">{category.category}</span>
                        </td>
                      </tr>
                      {category.features.map((feature, featIndex) => (
                        <tr
                          key={feature.name}
                          className={`border-b border-slate-100 ${featIndex === category.features.length - 1 ? 'border-b-slate-200' : ''}`}
                        >
                          <td className="py-4 px-6 text-foreground">
                            <div className="flex items-center gap-2">
                              {feature.name}
                              {feature.tooltip && (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cg-sage-subtle text-cg-sage text-xs cursor-help" title={feature.tooltip}>
                                  ?
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            {feature.commonground ? (
                              <CheckCircle2 className="w-6 h-6 text-cg-sage mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-slate-300 mx-auto" />
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {feature.talkingparents ? (
                              <Check className="w-5 h-5 text-slate-400 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-slate-300 mx-auto" />
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {feature.ourfamilywizard ? (
                              <Check className="w-5 h-5 text-slate-400 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-slate-300 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Comparison Footer */}
            <div className="bg-cg-sage-subtle p-6 border-t border-cg-sage/10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cg-sage" />
                  <span className="font-medium text-foreground">
                    CommonGround has <span className="text-cg-sage font-semibold">12+ exclusive features</span> not available anywhere else
                  </span>
                </div>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-cg-sage text-white font-semibold px-6 py-3 rounded-full transition-all duration-300 hover:bg-cg-sage-light hover:shadow-lg"
                >
                  Try CommonGround Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Why We're Different */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="w-12 h-12 rounded-xl bg-cg-amber-subtle flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-cg-amber" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">AI That Prevents Conflict</h3>
              <p className="text-muted-foreground text-sm">
                Other apps just record your messages. ARIA helps you communicate better <em>before</em> you hit send, preventing conflicts before they start.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="w-12 h-12 rounded-xl bg-cg-sage-subtle flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-cg-sage" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">GPS Exchange Proof</h3>
              <p className="text-muted-foreground text-sm">
                Silent Handoff™ creates undeniable proof of when you arrived. No more &quot;they were late&quot; accusations—the GPS doesn&apos;t lie.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="w-12 h-12 rounded-xl bg-cg-slate-subtle flex items-center justify-center mb-4">
                <CircleDollarSign className="w-6 h-6 text-cg-slate" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Purpose-Locked Expenses</h3>
              <p className="text-muted-foreground text-sm">
                Our expense system ties payments to specific obligations—medical, tuition, activities—so every dollar is accounted for with receipts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Trusted by thousands of families
            </h2>
            <p className="text-lg text-muted-foreground">
              See what parents and professionals are saying about CommonGround.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-8 border border-border hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-foreground mb-6 leading-relaxed">
                  &quot;{testimonial.quote}&quot;
                </blockquote>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Plus everything else you need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every feature designed with one goal: making co-parenting easier.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.name}
                  className="bg-card rounded-xl p-6 border border-border hover:border-cg-sage/50 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-cg-sage-subtle group-hover:bg-cg-sage/20 flex items-center justify-center mb-4 transition-colors">
                    <Icon className="w-6 h-6 text-cg-sage" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.name}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-cg-sage relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-6">
            Ready to transform your co-parenting experience?
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
            Join thousands of families who&apos;ve found common ground. Start your free 14-day trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-cg-sage font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-6">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
