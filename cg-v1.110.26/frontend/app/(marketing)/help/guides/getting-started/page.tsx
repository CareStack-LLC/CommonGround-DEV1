import Link from 'next/link';
import {
  BookOpen,
  UserPlus,
  Camera,
  Send,
  LinkIcon,
  CalendarPlus,
  CheckCircle2,
  ArrowRight,
  Play,
  Lightbulb,
  MessageSquare,
  Brain,
  Calendar,
  MapPin,
} from 'lucide-react';

export const metadata = {
  title: 'Getting Started | CommonGround Help Center',
  description:
    'Create your account, invite your co-parent, and start using CommonGround in minutes. Step-by-step setup guide.',
};

const tocItems = [
  { id: 'create-account', label: 'Creating your account' },
  { id: 'setup-profile', label: 'Setting up your profile' },
  { id: 'invite-coparent', label: 'Inviting your co-parent' },
  { id: 'coparent-wont-join', label: 'If your co-parent won\'t join' },
  { id: 'first-message', label: 'Sending your first message' },
  { id: 'custody-calendar', label: 'Setting up your calendar' },
  { id: 'quick-checklist', label: 'Quick setup checklist' },
];

const relatedGuides = [
  { icon: Brain, title: 'Messaging & ARIA', href: '/help/guides/messaging-aria', description: 'Learn how ARIA coaches your messages and shields you from hostility.' },
  { icon: Calendar, title: 'Calendar & Scheduling', href: '/help/guides/calendar-scheduling', description: 'Set up shared calendars, recurring schedules, and holiday rotations.' },
  { icon: MapPin, title: 'Custody Exchanges', href: '/help/guides/custody-exchanges', description: 'GPS-verified handoffs, QR check-in, and compliance tracking.' },
];

export default function GettingStartedGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#3DAA8A]/10 mb-6">
          <BookOpen className="w-8 h-8 text-[#3DAA8A]" />
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold text-[#1E3A4A] mb-4"
          style={{ fontFamily: 'DM Serif Display, serif' }}
        >
          Getting Started
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          From signup to your first message in under 10 minutes. This guide walks you through
          every step of setting up CommonGround for your family.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="bg-white rounded-2xl border border-gray-100 p-6 mb-12">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">In this guide</h2>
        <ul className="grid md:grid-cols-2 gap-2">
          {tocItems.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="flex items-center gap-2 text-[#1E3A4A] hover:text-[#3DAA8A] transition-colors py-1">
                <ArrowRight className="w-3.5 h-3.5 text-[#3DAA8A]" />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content Sections */}
      <div className="space-y-16">
        {/* Section 1: Create Account */}
        <section id="create-account">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#3DAA8A]/10">
              <UserPlus className="w-5 h-5 text-[#3DAA8A]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Creating your account
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Signing up for CommonGround takes less than two minutes. No credit card is required, and the free
            Essential plan gives you full access to messaging with ARIA, a shared calendar, and expense tracking.
          </p>
          <ol className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3DAA8A] text-white text-sm flex items-center justify-center font-semibold">1</span>
              <span className="text-gray-700">Visit <strong>commonground.app/signup</strong> and enter your email address.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3DAA8A] text-white text-sm flex items-center justify-center font-semibold">2</span>
              <span className="text-gray-700">Create a secure password (at least 8 characters).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3DAA8A] text-white text-sm flex items-center justify-center font-semibold">3</span>
              <span className="text-gray-700">Check your inbox for a verification email and click the confirmation link.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3DAA8A] text-white text-sm flex items-center justify-center font-semibold">4</span>
              <span className="text-gray-700">You are in. CommonGround will walk you through the rest from your dashboard.</span>
            </li>
          </ol>
          <div className="bg-[#F5A623]/5 border-l-4 border-[#F5A623] rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-[#F5A623] flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> Use the email address you check most often. All notifications
                about messages, schedule changes, and exchange reminders are sent there.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Setup Profile */}
        <section id="setup-profile">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#3DAA8A]/10">
              <Camera className="w-5 h-5 text-[#3DAA8A]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Setting up your profile
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            After signing in for the first time, you will be prompted to complete your profile.
            This helps your co-parent identify you and ensures notifications reach you reliably.
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#3DAA8A] mt-1 flex-shrink-0" />
              <span><strong>Display name:</strong> Your first name or the name your co-parent will recognize.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#3DAA8A] mt-1 flex-shrink-0" />
              <span><strong>Profile photo:</strong> Optional, but helpful for a friendlier experience.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#3DAA8A] mt-1 flex-shrink-0" />
              <span><strong>Phone number:</strong> Optional. Enables SMS reminders for exchanges and schedule changes.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#3DAA8A] mt-1 flex-shrink-0" />
              <span><strong>Time zone:</strong> Automatically detected, but you can adjust it manually if needed.</span>
            </li>
          </ul>
        </section>

        {/* Section 3: Invite Co-parent */}
        <section id="invite-coparent">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#3DAA8A]/10">
              <LinkIcon className="w-5 h-5 text-[#3DAA8A]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Inviting your co-parent
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            CommonGround works best when both parents are on the platform. From your Family File
            dashboard, tap <strong>Invite Co-Parent</strong> to generate a secure invitation link.
          </p>
          <h3 className="text-lg font-semibold text-[#1E3A4A] mb-3">How the secure link works</h3>
          <p className="text-gray-600 mb-4">
            The invitation link is unique and single-use. It expires after 7 days and can only be
            used by one person. When your co-parent clicks it, they are taken to a signup page
            pre-connected to your Family File. They create their own account and are immediately
            linked to the shared space.
          </p>
          <h3 className="text-lg font-semibold text-[#1E3A4A] mb-3">What they see when they receive it</h3>
          <p className="text-gray-600 mb-4">
            Your co-parent receives an email explaining that you have invited them to coordinate
            parenting through CommonGround. The email includes your display name and a brief
            description of the platform. They never see any of your private data, messages, or
            notes before they join.
          </p>
          <div className="bg-[#F5A623]/5 border-l-4 border-[#F5A623] rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-[#F5A623] flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> If you prefer, you can copy the invite link and send it yourself via
                text message or any other channel. The link works the same way regardless of how it is delivered.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Co-parent won't join */}
        <section id="coparent-wont-join">
          <h2 className="text-2xl font-bold text-[#1E3A4A] mb-4" style={{ fontFamily: 'DM Serif Display, serif' }}>
            What if your co-parent will not join?
          </h2>
          <p className="text-gray-600 mb-4">
            CommonGround is still valuable as a solo tool. Even without your co-parent on the
            platform, you can use these features on your own:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#3DAA8A] mt-1 flex-shrink-0" />
              <span><strong>Calendar:</strong> Track your custody schedule, add events, and set reminders for yourself.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#3DAA8A] mt-1 flex-shrink-0" />
              <span><strong>Expenses:</strong> Log child-related expenses and receipts for your own records.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#3DAA8A] mt-1 flex-shrink-0" />
              <span><strong>Documentation:</strong> Everything you log is timestamped and exportable for court or mediation.</span>
            </li>
          </ul>
          <p className="text-gray-600">
            Many parents start solo and invite their co-parent later, sometimes at the suggestion
            of a mediator or family law attorney. You can send the invitation at any time.
          </p>
        </section>

        {/* Section 5: First Message */}
        <section id="first-message">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#3DAA8A]/10">
              <Send className="w-5 h-5 text-[#3DAA8A]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Sending your first message with ARIA
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Navigate to <strong>Messages</strong> in your dashboard and compose a message. Before your
            message is sent, ARIA reads it and checks the tone. If everything looks constructive,
            the message goes through instantly.
          </p>
          <p className="text-gray-600 mb-4">
            If ARIA detects language that could escalate conflict, she will suggest an alternative
            version. You always have three choices: accept the suggestion, edit it yourself, or send
            your original message as-is. ARIA never blocks you from communicating.
          </p>
          <div className="bg-[#F5A623]/5 border-l-4 border-[#F5A623] rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-[#F5A623] flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> ARIA analysis happens in under one second. Most messages
                go through without any suggestion. When you do get a suggestion, it preserves your
                intent while softening the tone.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Custody Calendar */}
        <section id="custody-calendar">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#3DAA8A]/10">
              <CalendarPlus className="w-5 h-5 text-[#3DAA8A]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Setting up your custody calendar
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Head to the <strong>Calendar</strong> tab and start adding your custody schedule. Tap any
            day to assign custody time to either parent. Both parents see the same calendar, so there
            is never confusion about whose day it is.
          </p>
          <p className="text-gray-600 mb-4">
            You can add individual events like doctor appointments, school plays, and extracurriculars.
            On the Plus plan, you can set up recurring weekly or biweekly patterns that auto-populate
            months in advance.
          </p>
        </section>

        {/* Video Placeholder */}
        <div className="bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] rounded-2xl p-8 text-center text-white">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Getting Started Walkthrough
          </h3>
          <p className="text-white/70 text-sm">Video walkthrough coming soon</p>
        </div>

        {/* Section 7: Quick Checklist */}
        <section id="quick-checklist">
          <h2 className="text-2xl font-bold text-[#1E3A4A] mb-6" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Quick setup checklist
          </h2>
          <p className="text-gray-600 mb-6">
            Follow these seven steps and you will be fully set up in about 10 minutes.
          </p>
          <ol className="space-y-4">
            {[
              'Create your account with your email address.',
              'Verify your email by clicking the confirmation link.',
              'Complete your profile with your name and optional photo.',
              'Create a Family File and add your children.',
              'Invite your co-parent using the secure invitation link.',
              'Add your custody schedule to the shared calendar.',
              'Send your first message through ARIA-assisted messaging.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3DAA8A] text-white font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-gray-700 pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Related Guides */}
      <div className="mt-20 pt-12 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-[#1E3A4A] mb-8" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Related guides
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {relatedGuides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-[#3DAA8A]/30 hover:shadow-md transition-all"
            >
              <guide.icon className="w-6 h-6 text-[#3DAA8A] mb-3" />
              <h3 className="font-semibold text-[#1E3A4A] group-hover:text-[#3DAA8A] transition-colors mb-1">
                {guide.title}
              </h3>
              <p className="text-sm text-gray-500">{guide.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Still Need Help CTA */}
      <div className="mt-12 bg-[#3DAA8A]/5 rounded-2xl p-8 text-center">
        <MessageSquare className="w-8 h-8 text-[#3DAA8A] mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-[#1E3A4A] mb-2">Still need help?</h3>
        <p className="text-gray-600 text-sm mb-4">
          Our support team is here for you. Reach out and we will get back to you within 24 hours.
        </p>
        <Link
          href="/help/contact"
          className="inline-flex items-center gap-2 bg-[#3DAA8A] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#2E9578] transition-colors"
        >
          Contact Support
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
