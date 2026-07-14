import Link from 'next/link';
import {
  Heart,
  ArrowRight,
  CheckCircle2,
  Play,
  Lightbulb,
  Video,
  BookOpen,
  Tv,
  Gamepad2,
  Users,
  Shield,
  Sparkles,
  UserPlus,
  Settings,
} from 'lucide-react';

export const metadata = {
  title: 'KidSpace Guide | CommonGround Help Center',
  description:
    'Learn how to set up KidSpace for your child, use video calls, Read Together, Watch Together, Play Together, and manage My Circle contacts.',
};

const tocItems = [
  { id: 'what-is-kidspace', label: 'What is KidSpace?' },
  { id: 'setting-up', label: 'Setting up for your child' },
  { id: 'video-calls', label: 'Video calls' },
  { id: 'read-together', label: 'Read Together' },
  { id: 'watch-together', label: 'Watch Together' },
  { id: 'play-together', label: 'Play Together' },
  { id: 'my-circle', label: 'My Circle' },
  { id: 'aria-safety', label: 'ARIA safety monitoring' },
  { id: 'plans-pricing', label: 'Plans & availability' },
];

export default function KidSpaceGuidePage() {
  return (
    <article className="pb-16 lg:pb-24">
      {/* Hero */}
      <section className="pt-10 pb-8 lg:pt-14 lg:pb-10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cg-sage/10 flex items-center justify-center mx-auto mb-5">
            <Heart className="w-7 h-7 text-cg-sage" />
          </div>
          <h1
            className="text-3xl sm:text-4xl text-foreground mb-3"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            <span className="text-cg-sage">KidSpace</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            A safe, monitored space for children ages 3 to 12 to connect with their other parent through video calls, stories, movies, and games.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        {/* Table of Contents */}
        <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">In this guide</h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {tocItems.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-foreground hover:text-cg-sage text-sm transition-colors">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* What is KidSpace? */}
        <section id="what-is-kidspace" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What is KidSpace?
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            KidSpace is a child-friendly environment within CommonGround designed for children ages 3 to 12. It gives kids a safe, monitored way to stay connected with their other parent when they are not together, through video calls, shared reading, movies, and cooperative games.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Every interaction in KidSpace is age-appropriate and supervised by ARIA, which provides content filtering, monitors for concerning patterns, and ensures a positive experience. Parents maintain full control over what activities are available, who can interact with their child, and when calls can take place.
          </p>
        </section>

        {/* Setting Up */}
        <section id="setting-up" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Setting up for your child
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Before your child can use KidSpace, you need to create their profile and configure their settings.
          </p>
          <ol className="space-y-3 mb-6">
            {[
              'Navigate to KidSpace from your family file dashboard.',
              'Create a child profile with their name, age, and an optional avatar.',
              'Set age-appropriate content levels based on your child\'s age.',
              'Choose which activities are available (video calls, reading, watching, games).',
              'Configure calling hours to define when video calls are allowed.',
              'Both parents must confirm the settings before KidSpace is activated.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage/10 text-cg-sage text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-gray-600 text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Involve your child in choosing their avatar. It helps them feel ownership over their space and makes them more excited to use it.
              </p>
            </div>
          </div>
        </section>

        {/* Video Calls */}
        <section id="video-calls" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Video className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Video calls
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            KidSpace video calls let your child have face-to-face time with their other parent. Calls are powered by secure video technology and include built-in parental controls.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              'Start a call from the KidSpace dashboard during allowed calling hours.',
              'Set calling windows so calls only happen at agreed-upon times.',
              'Parental controls let you enable or disable camera and microphone access.',
              'All calls are logged with date, time, duration, and participants.',
              'Call history is available to both parents for transparency.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Consistent call schedules help children feel secure. Try to keep video call times predictable, even if the duration varies.
              </p>
            </div>
          </div>
        </section>

        {/* Read Together */}
        <section id="read-together" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Read Together
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Read Together lets parents share bedtime stories with their child, even when they are miles apart. Both parents can take turns reading from a library of illustrated children&apos;s books.
          </p>
          <p className="text-gray-600 leading-relaxed">
            The shared reading experience features visual storybooks that display on both screens simultaneously. A parent can read aloud while the child follows along, turning pages together in real time. It is a meaningful way to maintain the bedtime ritual regardless of which home the child is in.
          </p>
        </section>

        {/* Watch Together */}
        <section id="watch-together" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Tv className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Watch Together
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Watch Together lets a parent and child enjoy age-appropriate movies and episodes at the same time. Content is curated based on the child&apos;s age, and playback is synchronized so both viewers see the same thing.
          </p>
          <p className="text-gray-600 leading-relaxed">
            This feature turns screen time into bonding time. Your child can watch their favorite show with their other parent, talk about it during and after, and feel like they are sharing a couch even when they are in different homes.
          </p>
        </section>

        {/* Play Together */}
        <section id="play-together" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Play Together
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Play Together offers simple, cooperative games that parents and children can play in real time. Activities include classics like tic-tac-toe, puzzles, and other age-appropriate games that encourage interaction and fun.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Games are designed to be collaborative rather than competitive, fostering positive interactions between parent and child. New games are added regularly based on age group and user feedback.
          </p>
        </section>

        {/* My Circle */}
        <section id="my-circle" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              My Circle
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            My Circle lets you add trusted family members, like grandparents, aunts, and uncles, as approved contacts who can interact with your child through KidSpace. Both parents must approve every contact added to the circle.
          </p>
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Circle limits</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Complete plan ($34.99/mo)</span>
                <span className="font-medium text-foreground">Up to 5 trusted contacts</span>
              </div>
              <div className="border-t border-gray-50" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Max call duration</span>
                <span className="font-medium text-foreground">2 hours</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">You stay in full control of My Circle — add or remove any contact at any time.</p>
          </div>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Adding grandparents to My Circle can provide your child with additional emotional support and help maintain important family bonds during the transition.
              </p>
            </div>
          </div>
        </section>

        {/* ARIA Safety Monitoring */}
        <section id="aria-safety" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              ARIA safety monitoring
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            ARIA actively monitors all KidSpace interactions to ensure your child&apos;s safety. This includes content filtering for text-based communication, detection of concerning behavioral patterns, and age-appropriate guidance.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              'Content filtering prevents inappropriate language or topics.',
              'Behavioral pattern analysis alerts parents to potential concerns.',
              'Age-appropriate guidance helps children express their feelings constructively.',
              'All monitoring is transparent. Parents can review ARIA\'s activity logs.',
              'ARIA never records or stores video call content, only metadata like duration and participants.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Plans & Availability */}
        <section id="plans-pricing" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Plans & availability
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            KidSpace is part of the Complete plan. Here is what is included.
          </p>
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Complete &mdash; $34.99/month</h3>
                <p className="text-xs text-gray-500">Video &amp; voice calls, messaging, Read Together, Watch Together, Play Together, up to 5 My Circle contacts, 2-hour call limit, and full ARIA safety monitoring.</p>
              </div>
            </div>
          </div>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> KidSpace shines when the whole village joins — add grandparents, aunts, and uncles to My Circle so your child stays close to everyone who loves them.
              </p>
            </div>
          </div>
        </section>

        {/* Video Placeholder */}
        <div className="bg-gradient-to-br from-foreground to-cg-slate rounded-2xl p-8 text-center text-white mb-12">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Play className="w-7 h-7 text-white" />
          </div>
          <h3
            className="text-xl mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            KidSpace walkthrough
          </h3>
          <p className="text-white/70 text-sm">Video walkthrough coming soon</p>
        </div>

        {/* Related Guides */}
        <section className="mb-12">
          <h2
            className="text-xl text-foreground mb-5"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Related guides
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Messaging & ARIA', desc: 'Learn how ARIA monitors and assists communication.', href: '/help/guides/messaging-aria' },
              { title: 'Privacy & Security', desc: 'Understand how your child\'s data is protected.', href: '/help/guides/privacy-security' },
              { title: 'Account & Billing', desc: 'Manage your plan and upgrade for more KidSpace features.', href: '/help/guides/account-billing' },
              { title: 'Calendar & Scheduling', desc: 'Coordinate KidSpace time with your custody schedule.', href: '/help/guides/calendar-scheduling' },
            ].map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
              >
                <h3 className="text-foreground font-medium text-sm mb-1 group-hover:text-cg-sage transition-colors">
                  {guide.title}
                </h3>
                <p className="text-xs text-gray-500">{guide.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Still Need Help CTA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h2
            className="text-xl text-foreground mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Still need help?
          </h2>
          <p className="text-gray-600 text-sm mb-5">
            Our support team can help you set up KidSpace or troubleshoot any issues.
          </p>
          <Link
            href="/help/contact"
            className="inline-flex items-center gap-2 bg-cg-sage text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-cg-sage-dark transition-colors"
          >
            Contact support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
