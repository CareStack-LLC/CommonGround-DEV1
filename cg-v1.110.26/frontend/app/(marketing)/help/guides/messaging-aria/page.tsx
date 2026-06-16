import Link from 'next/link';
import {
  Brain,
  Send,
  Shield,
  Search,
  Settings,
  MessageCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Play,
  Lightbulb,
  CheckCircle2,
  BookOpen,
  Calendar,
  MapPin,
  MessageSquare,
} from 'lucide-react';

export const metadata = {
  title: 'Messaging & ARIA | CommonGround Help Center',
  description:
    'Learn how ARIA coaches your messages, shields you from hostility, and helps you communicate constructively with your co-parent.',
};

const tocItems = [
  { id: 'how-aria-works', label: 'How ARIA works' },
  { id: 'first-message', label: 'Sending your first message' },
  { id: 'understanding-suggestions', label: 'Understanding suggestions' },
  { id: 'incoming-shielding', label: 'Incoming message shielding' },
  { id: 'search-history', label: 'Message search and history' },
  { id: 'aria-settings', label: 'Turning ARIA on/off' },
  { id: 'communication-tips', label: 'Tips for productive communication' },
  { id: 'privacy', label: 'What your co-parent sees vs. doesn\'t' },
];

const relatedGuides = [
  { icon: BookOpen, title: 'Getting Started', href: '/help/guides/getting-started', description: 'Create your account, invite your co-parent, and send your first message.' },
  { icon: Calendar, title: 'Calendar & Scheduling', href: '/help/guides/calendar-scheduling', description: 'Set up shared calendars, recurring schedules, and holiday rotations.' },
  { icon: MapPin, title: 'Custody Exchanges', href: '/help/guides/custody-exchanges', description: 'GPS-verified handoffs, QR check-in, and compliance tracking.' },
];

export default function MessagingAriaGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cg-sage/10 mb-6">
          <Brain className="w-8 h-8 text-cg-sage" />
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold text-foreground mb-4"
          style={{ fontFamily: 'DM Serif Display, serif' }}
        >
          Messaging & ARIA
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          ARIA is your AI communication coach. She helps you express yourself clearly, shields you
          from hostile messages, and keeps every conversation documented.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="bg-white rounded-2xl border border-gray-100 p-6 mb-12">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">In this guide</h2>
        <ul className="grid md:grid-cols-2 gap-2">
          {tocItems.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="flex items-center gap-2 text-foreground hover:text-cg-sage transition-colors py-1">
                <ArrowRight className="w-3.5 h-3.5 text-cg-sage" />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content Sections */}
      <div className="space-y-16">
        {/* Section 1: How ARIA Works */}
        <section id="how-aria-works">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Brain className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              How ARIA works
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            ARIA stands for AI Relationship Intelligence Assistant. She sits between you and your
            co-parent, reading every message before it is sent. Her job is to catch language that
            could escalate conflict and suggest a calmer alternative.
          </p>
          <p className="text-gray-600 mb-4">
            The process is simple: you write your message naturally, ARIA analyzes it in under one
            second, and if she detects tension, blame, hostility, or passive-aggressive language,
            she offers a rewritten version. If your message is already constructive, it goes through
            without any interruption.
          </p>
          <p className="text-gray-600 mb-4">
            The key principle is that you always decide. ARIA never sends anything on your behalf.
            She never blocks a message. She suggests, and you choose.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> ARIA uses a three-tier analysis system. Fast pattern matching catches
                obvious issues instantly. For subtler language, she uses advanced AI to understand
                context and nuance. This means she rarely misreads your intent.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Sending Your First Message */}
        <section id="first-message">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Send className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Sending your first message
            </h2>
          </div>
          <ol className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">1</span>
              <span className="text-gray-700">Open the <strong>Messages</strong> tab from your dashboard.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">2</span>
              <span className="text-gray-700">Type your message in the compose field, just like any messaging app.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">3</span>
              <span className="text-gray-700">Tap <strong>Send</strong>. ARIA analyzes your message in under one second.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">4</span>
              <span className="text-gray-700">If ARIA has no suggestions, the message is delivered immediately.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">5</span>
              <span className="text-gray-700">If ARIA flags something, you will see her suggested alternative before the message is sent.</span>
            </li>
          </ol>
        </section>

        {/* Section 3: Understanding Suggestions */}
        <section id="understanding-suggestions">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <MessageCircle className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Understanding suggestions
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            When ARIA flags a message, you see your original text alongside her suggested rewrite.
            The suggestion preserves your core intent while adjusting tone, removing inflammatory
            language, and framing things more collaboratively.
          </p>
          <h3 className="text-lg font-semibold text-foreground mb-3">Your three options</h3>
          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Use suggestion:</strong> Send ARIA&apos;s rewritten version. This is the most
                common choice and typically leads to more productive responses.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Edit yourself:</strong> Modify either your original or ARIA&apos;s version
                to find the wording that feels right to you.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Send as-is:</strong> Send your original message unchanged. ARIA will never
                prevent you from saying what you need to say.
              </div>
            </li>
          </ul>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> Over time, many parents notice that ARIA flags fewer of their
                messages. The coaching effect helps you internalize calmer communication patterns naturally.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Incoming Message Shielding */}
        <section id="incoming-shielding">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Shield className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Incoming message shielding
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            ARIA does not only help with what you send. She also protects you from hostile incoming
            messages. When your co-parent sends a message with aggressive or hurtful language, ARIA
            can summarize it for you so you get the essential information without the emotional impact.
          </p>
          <p className="text-gray-600 mb-4">
            You will see a neutral summary of the message content, including any logistics, requests,
            or action items. The original message is still stored and accessible if you choose to
            view it, but you are not forced to read hostile language just to find out about a
            schedule change or pickup time.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> Incoming shielding is especially valuable on difficult days. You
                can always expand the original message later when you feel ready to read it.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Search and History */}
        <section id="search-history">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Search className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Message search and history
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Every message sent through CommonGround is documented with a precise timestamp. This
            creates a reliable, searchable record of all communication between you and your co-parent.
          </p>
          <p className="text-gray-600 mb-4">
            Use the search bar at the top of the Messages tab to find specific conversations by
            keyword, date, or topic. This is invaluable when you need to reference a past agreement,
            confirm a schedule change, or prepare documentation for court or mediation.
          </p>
        </section>

        {/* Video Placeholder */}
        <div className="bg-gradient-to-br from-foreground to-cg-slate rounded-2xl p-8 text-center text-white">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
            ARIA Messaging Walkthrough
          </h3>
          <p className="text-white/70 text-sm">Video walkthrough coming soon</p>
        </div>

        {/* Section 6: ARIA Settings */}
        <section id="aria-settings">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Settings className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Turning ARIA on or off
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            You can toggle ARIA&apos;s message coaching in your account settings under
            <strong> Communication Preferences</strong>. When ARIA is turned off, your messages are
            sent directly without analysis or suggestions.
          </p>
          <p className="text-gray-600 mb-4">
            Even with coaching turned off, CommonGround still tracks communication metrics like
            response times and message frequency. These metrics are part of the platform&apos;s
            documentation features and remain active regardless of ARIA&apos;s coaching status.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> We recommend keeping ARIA on, especially during the first few
                months. Parents who use ARIA coaching see a measurable decrease in conflict escalation
                over time.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Communication Tips */}
        <section id="communication-tips">
          <h2 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Tips for productive communication
          </h2>
          <p className="text-gray-600 mb-4">
            ARIA is a powerful tool, but the best results come when you combine it with
            intentional communication habits. Here are proven strategies:
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Use I-statements:</strong> Say &quot;I would appreciate a heads-up&quot;
                instead of &quot;You never tell me anything.&quot;
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Focus on logistics:</strong> Keep messages about schedules, expenses, and
                the children&apos;s needs. Save emotional conversations for therapy or trusted friends.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Keep it about the kids:</strong> Before sending, ask yourself whether
                the message directly relates to your children&apos;s wellbeing or needs.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Wait before responding:</strong> If an incoming message triggers a strong
                reaction, take a few minutes before replying. ARIA&apos;s shielding can help you
                process the content calmly.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Be specific:</strong> Instead of vague requests, include dates, times, and
                details so there is no room for misinterpretation.
              </div>
            </li>
          </ul>
        </section>

        {/* Section 8: Privacy */}
        <section id="privacy">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <EyeOff className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              What your co-parent sees vs. does not
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Privacy is fundamental to how CommonGround works. Your co-parent only sees the final
            message you choose to send. Here is a clear breakdown:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-cg-sage" />
                <h3 className="font-semibold text-foreground">They can see</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />The final sent message</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />Message timestamps</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />Read receipts</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />Shared calendar events</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <EyeOff className="w-5 h-5 text-cg-amber" />
                <h3 className="font-semibold text-foreground">They cannot see</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />Your drafts or unsent messages</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />ARIA&apos;s suggestions to you</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />Your original wording if you accepted a rewrite</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />Whether ARIA flagged your message</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />Your ARIA settings or preferences</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Related Guides */}
      <div className="mt-20 pt-12 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-foreground mb-8" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Related guides
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {relatedGuides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-cg-sage/30 hover:shadow-md transition-all"
            >
              <guide.icon className="w-6 h-6 text-cg-sage mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-1">
                {guide.title}
              </h3>
              <p className="text-sm text-gray-500">{guide.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Still Need Help CTA */}
      <div className="mt-12 bg-cg-sage/5 rounded-2xl p-8 text-center">
        <MessageSquare className="w-8 h-8 text-cg-sage mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Still need help?</h3>
        <p className="text-gray-600 text-sm mb-4">
          Our support team is here for you. Reach out and we will get back to you within 24 hours.
        </p>
        <Link
          href="/help/contact"
          className="inline-flex items-center gap-2 bg-cg-sage text-white px-6 py-2.5 rounded-lg font-medium hover:bg-cg-sage-dark transition-colors"
        >
          Contact Support
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
