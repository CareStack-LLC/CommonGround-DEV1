import Link from 'next/link';
import { Metadata } from 'next';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Brain,
  Users,
  Download,
  Trash2,
  HeartHandshake,
  Play,
  Lightbulb,
  ChevronRight,
  ArrowRight,
  BookOpen,
  CreditCard,
  Scale,
  MessageSquare,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy & Security | CommonGround Help Center',
  description:
    'Learn how CommonGround protects your data, what your co-parent can and cannot see, and how to manage your privacy settings.',
};

const tocItems = [
  { id: 'what-they-see', label: 'What your co-parent can see' },
  { id: 'what-they-cant', label: 'What they cannot see' },
  { id: 'encryption', label: 'Data encryption' },
  { id: 'aria-privacy', label: 'ARIA privacy' },
  { id: 'professional-access', label: 'Professional access controls' },
  { id: 'data-export', label: 'Data export' },
  { id: 'account-deletion', label: 'Account deletion' },
  { id: 'no-data-selling', label: 'No data selling' },
];

const relatedGuides = [
  { title: 'Messaging & ARIA', href: '/help/guides/messaging-aria', icon: MessageSquare },
  { title: 'For Professionals', href: '/help/guides/professional-access', icon: Scale },
  { title: 'Account & Billing', href: '/help/guides/account-billing', icon: CreditCard },
  { title: 'Getting Started', href: '/help/guides/getting-started', icon: BookOpen },
];

export default function PrivacySecurityGuidePage() {
  return (
    <article className="pb-20">
      {/* Hero */}
      <section className="pt-12 pb-10 lg:pt-16 lg:pb-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cg-sage/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-cg-sage" />
          </div>
          <h1
            className="text-3xl sm:text-4xl text-foreground mb-4"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Privacy & Security
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Your safety is our foundation. Here is exactly how CommonGround protects your
            data, what is shared with your co-parent, and what stays completely private.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        {/* Table of Contents */}
        <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-12">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            In this guide
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {tocItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:text-cg-sage transition-colors py-1"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-cg-sage" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* What your co-parent CAN see */}
        <section id="what-they-see" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What your co-parent can see
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Co-parenting requires a shared record. Once information is sent or shared, both
            parents can access it for accountability and transparency.
          </p>
          <ul className="space-y-2.5 text-gray-700">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Sent messages</strong> &mdash; any message you send through ARIA after accepting the final version</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Shared calendar events</strong> &mdash; schedule entries, exchanges, and holiday rotations</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Approved agreements</strong> &mdash; custody agreement sections both parents have signed off on</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Expense records</strong> &mdash; shared expenses, payment requests, and receipts they are part of</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Exchange logs</strong> &mdash; GPS check-in data and handoff confirmations</span>
            </li>
          </ul>
        </section>

        {/* What your co-parent CANNOT see */}
        <section id="what-they-cant" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <EyeOff className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What your co-parent cannot see
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Your private space is exactly that &mdash; private. These items are never
            visible to your co-parent under any circumstances.
          </p>
          <ul className="space-y-2.5 text-gray-700">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
              <span><strong>Your drafts</strong> &mdash; unsent message drafts stay completely private</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
              <span><strong>ARIA suggestions</strong> &mdash; the rewrites ARIA offers you are never shared</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
              <span><strong>Your original message before rewrite</strong> &mdash; only the final, sent version is visible</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
              <span><strong>Private notes</strong> &mdash; personal notes you keep within the app</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
              <span><strong>Your login activity</strong> &mdash; when and where you log in is never disclosed</span>
            </li>
          </ul>

          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4 mt-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Tip</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  If you start typing a message but decide not to send it, your co-parent
                  will never know you were composing. There are no &quot;typing indicators&quot;
                  or read receipts in CommonGround.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Encryption */}
        <section id="encryption" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              How your data is encrypted
            </h2>
          </div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            CommonGround uses the same encryption standards trusted by major financial
            institutions to keep your information safe.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-foreground mb-2">At rest</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                All stored data is protected with <strong>AES-256 encryption</strong> &mdash;
                the same standard used by banks and government agencies worldwide.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-foreground mb-2">In transit</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Every connection uses <strong>TLS 1.3</strong>, the latest transport
                security protocol, ensuring data cannot be intercepted between your
                device and our servers.
              </p>
            </div>
          </div>
        </section>

        {/* ARIA Privacy */}
        <section id="aria-privacy" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              ARIA privacy
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            ARIA is your private communication coach. Here is how privacy works with
            AI-assisted messaging:
          </p>
          <ul className="space-y-2.5 text-gray-700 mb-6">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span>Drafts and ARIA suggestions are <strong>completely private</strong> and visible only to you</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span>Only the <strong>final sent message</strong> is shared with your co-parent</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span>Your co-parent cannot tell whether you accepted or rejected an ARIA suggestion</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span>ARIA analysis data is not stored after your message is sent</span>
            </li>
          </ul>

          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Tip</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Think of ARIA like a private editor sitting beside you. Your co-parent
                  only sees the polished version you choose to send &mdash; never the
                  drafts or suggestions behind it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Video placeholder */}
        <div className="bg-gradient-to-br from-foreground to-cg-slate rounded-2xl p-8 text-center text-white mb-14">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h3
            className="text-xl mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Privacy & Security Overview
          </h3>
          <p className="text-white/70 text-sm">Video walkthrough coming soon</p>
        </div>

        {/* Professional access */}
        <section id="professional-access" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Professional access controls
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            When you grant a professional (attorney, mediator, therapist) access to your
            case, you stay in full control.
          </p>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">1</span>
              <span><strong>You grant access</strong> &mdash; professionals can only view your case after you explicitly invite them</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">2</span>
              <span><strong>Time-limited</strong> &mdash; access can be set to expire automatically after a defined period</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">3</span>
              <span><strong>Read-only</strong> &mdash; professionals can view records but cannot modify your data</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">4</span>
              <span><strong>Fully logged</strong> &mdash; every action a professional takes is recorded in the audit trail</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">5</span>
              <span><strong>Revocable at any time</strong> &mdash; remove a professional&apos;s access instantly from your settings</span>
            </li>
          </ol>
        </section>

        {/* Data export */}
        <section id="data-export" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Data export
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Your data belongs to you. You can request a full export at any time.
          </p>
          <ol className="space-y-2.5 text-gray-700 mb-4">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">1</span>
              <span>Go to <strong>Settings &gt; Privacy &gt; Export My Data</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">2</span>
              <span>Select the data categories you want to include</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">3</span>
              <span>Your export will be prepared and emailed to you as a secure download link</span>
            </li>
          </ol>
          <p className="text-sm text-gray-500">
            CommonGround is fully compliant with <strong>GDPR</strong> and <strong>CCPA</strong> data
            portability requirements.
          </p>
        </section>

        {/* Account deletion */}
        <section id="account-deletion" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Account deletion
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            If you decide to leave CommonGround, you can request full account deletion.
          </p>
          <ol className="space-y-2.5 text-gray-700 mb-4">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">1</span>
              <span>Go to <strong>Settings &gt; Account &gt; Delete Account</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">2</span>
              <span>Confirm your identity and acknowledge the deletion</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">3</span>
              <span>All personal data is removed within <strong>90 days</strong></span>
            </li>
          </ol>

          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Good to know</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Some records may be retained beyond 90 days if required by law or an
                  active court order. We will notify you if any data falls into this category.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* No data selling */}
        <section id="no-data-selling" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <HeartHandshake className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              We never sell your data
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            This is a simple, unconditional promise. Your data is <strong>never sold,
            shared with advertisers, or used for marketing purposes</strong> &mdash; period.
          </p>
          <p className="text-gray-600 leading-relaxed">
            CommonGround is funded by subscriptions, not data harvesting. Our business
            model is aligned with your privacy because our only customer is you.
          </p>
        </section>

        {/* Related Guides */}
        <section className="border-t border-gray-200 pt-12 mb-14">
          <h2
            className="text-xl text-foreground mb-6"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Related guides
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {relatedGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="group flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-cg-sage/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cg-sage transition-colors">
                    <Icon className="w-5 h-5 text-cg-sage group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-medium text-foreground text-sm group-hover:text-cg-sage transition-colors">
                    {guide.title}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-cg-sage transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Still need help CTA */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h2
            className="text-xl text-foreground mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Still need help?
          </h2>
          <p className="text-gray-600 text-sm mb-5">
            Our support team is here for you. We typically respond within a few hours.
          </p>
          <Link
            href="/help/contact"
            className="inline-flex items-center gap-2 bg-cg-sage text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-[#2E9A7A] transition-colors"
          >
            Contact Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </article>
  );
}
