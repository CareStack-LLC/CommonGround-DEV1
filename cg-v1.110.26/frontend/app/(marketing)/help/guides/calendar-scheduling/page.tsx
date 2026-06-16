import Link from 'next/link';
import {
  Calendar,
  CalendarPlus,
  Repeat,
  Snowflake,
  Bell,
  Handshake,
  ArrowRight,
  Play,
  Lightbulb,
  CheckCircle2,
  BookOpen,
  Brain,
  MapPin,
  MessageSquare,
  Clock,
  Star,
} from 'lucide-react';

export const metadata = {
  title: 'Calendar & Scheduling | CommonGround Help Center',
  description:
    'Set up your shared custody calendar, recurring schedules, holiday rotations, and automatic reminders in CommonGround.',
};

const tocItems = [
  { id: 'shared-calendar', label: 'Viewing the shared calendar' },
  { id: 'adding-events', label: 'Adding events and custody time' },
  { id: 'recurring-schedules', label: 'Setting up recurring schedules' },
  { id: 'holiday-rotation', label: 'Holiday rotation management' },
  { id: 'reminders', label: 'Automatic reminders' },
  { id: 'quick-accords', label: 'Quick Accords for schedule changes' },
  { id: 'calendar-tips', label: 'Tips for using the calendar' },
];

const relatedGuides = [
  { icon: BookOpen, title: 'Getting Started', href: '/help/guides/getting-started', description: 'Create your account, invite your co-parent, and send your first message.' },
  { icon: Brain, title: 'Messaging & ARIA', href: '/help/guides/messaging-aria', description: 'How ARIA coaches your messages and shields you from hostility.' },
  { icon: MapPin, title: 'Custody Exchanges', href: '/help/guides/custody-exchanges', description: 'GPS-verified handoffs, QR check-in, and compliance tracking.' },
];

export default function CalendarSchedulingGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cg-sage/10 mb-6">
          <Calendar className="w-8 h-8 text-cg-sage" />
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold text-foreground mb-4"
          style={{ fontFamily: 'DM Serif Display, serif' }}
        >
          Calendar & Scheduling
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          One shared calendar that both parents trust. Color-coded custody time, automatic reminders,
          and a built-in system for proposing schedule changes.
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
        {/* Section 1: Shared Calendar */}
        <section id="shared-calendar">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Calendar className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Viewing the shared calendar
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            The CommonGround calendar is a single, shared view that both parents see. There is no
            discrepancy between what one parent sees and what the other sees. This eliminates
            the back-and-forth about whose weekend it is or when an event was scheduled.
          </p>
          <p className="text-gray-600 mb-4">
            Custody time is color-coded by parent. Your time appears in one color and your
            co-parent&apos;s time appears in another, making it easy to see the custody split
            at a glance. Events like appointments, school activities, and extracurriculars
            are displayed alongside custody blocks.
          </p>
          <p className="text-gray-600 mb-4">
            You can switch between month, week, and day views depending on how much detail you
            need. The calendar syncs in real time, so any changes either parent makes appear
            instantly for both.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> Use the month view to get a big-picture overview of the custody
                schedule, and switch to the week view when planning specific days or coordinating
                pickups and drop-offs.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Adding Events */}
        <section id="adding-events">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <CalendarPlus className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Adding events and custody time
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Adding an event to the shared calendar is straightforward. Tap any day to open the
            event creation form. Fill in the details like title, time, location, and which
            children are involved. Both parents are automatically notified when a new event is added.
          </p>
          <ol className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">1</span>
              <span className="text-gray-700">Navigate to the <strong>Calendar</strong> tab and tap the day you want to add an event to.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">2</span>
              <span className="text-gray-700">Choose the event type: custody time, appointment, school event, or custom.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">3</span>
              <span className="text-gray-700">Add the event details including title, start and end time, and location.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">4</span>
              <span className="text-gray-700">Save the event. Your co-parent receives a notification immediately.</span>
            </li>
          </ol>
        </section>

        {/* Section 3: Recurring Schedules */}
        <section id="recurring-schedules">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Repeat className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Setting up recurring schedules
            </h2>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-cg-amber/10 text-cg-amber text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <Star className="w-3.5 h-3.5" />
            Plus plan feature
          </div>
          <p className="text-gray-600 mb-4">
            Most custody arrangements follow a regular pattern, such as alternating weeks, a
            2-2-3 schedule, or every other weekend. On the Plus plan, you can define these recurring
            patterns once and the calendar auto-populates months into the future.
          </p>
          <p className="text-gray-600 mb-4">
            Go to <strong>Calendar Settings</strong> and select <strong>Recurring Schedule</strong>.
            Choose from common custody templates or create a custom pattern. Set the start date,
            and CommonGround fills in the calendar automatically. You can always override individual
            days when exceptions come up.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> If your court order specifies a particular schedule pattern,
                set it up as a recurring schedule first. Then use one-off overrides for holidays
                and special occasions rather than manually entering every week.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Holiday Rotation */}
        <section id="holiday-rotation">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Snowflake className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Holiday rotation management
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Holidays are often the most contentious part of a custody schedule. CommonGround
            simplifies this with built-in holiday rotation management. You define which holidays
            matter to your family, and the system alternates them year by year automatically.
          </p>
          <p className="text-gray-600 mb-4">
            For example, if Parent A has Thanksgiving in even years, Parent B automatically gets
            it in odd years. The same rotation applies to any holiday you configure, including
            winter break, spring break, birthdays, and cultural or religious observances.
          </p>
          <p className="text-gray-600 mb-4">
            Holiday assignments override the regular recurring schedule for the designated dates.
            Both parents can see the full holiday calendar projected years into the future, so
            there are no surprises.
          </p>
        </section>

        {/* Video Placeholder */}
        <div className="bg-gradient-to-br from-foreground to-cg-slate rounded-2xl p-8 text-center text-white">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Calendar Setup Walkthrough
          </h3>
          <p className="text-white/70 text-sm">Video walkthrough coming soon</p>
        </div>

        {/* Section 5: Automatic Reminders */}
        <section id="reminders">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Bell className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Automatic reminders
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            CommonGround sends automatic reminders for important schedule events so nothing falls
            through the cracks. You receive notifications for:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Upcoming exchanges:</strong> A reminder the day before and the morning of each custody exchange.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Schedule changes:</strong> Instant notification when your co-parent proposes or modifies an event.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Upcoming events:</strong> Reminders for appointments, school events, and activities you have added.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Holiday transitions:</strong> Advance notice when the regular schedule shifts for a holiday period.</span>
            </li>
          </ul>
          <p className="text-gray-600">
            Reminders are sent via push notification and email. You can customize which reminders
            you receive and how far in advance in your notification settings.
          </p>
        </section>

        {/* Section 6: Quick Accords */}
        <section id="quick-accords">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Handshake className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Quick Accords for schedule modifications
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Life happens, and schedules need to change. Quick Accords are CommonGround&apos;s way
            of handling schedule modifications with a clear approval trail. Instead of a text
            message that might be forgotten or disputed later, you propose a change through the
            calendar and the other parent approves or declines.
          </p>
          <ol className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">1</span>
              <span className="text-gray-700">Tap the day you want to modify and select <strong>Propose Change</strong>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">2</span>
              <span className="text-gray-700">Describe the change, such as swapping a weekend or moving a pickup time.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">3</span>
              <span className="text-gray-700">Your co-parent receives a notification and can approve or decline.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">4</span>
              <span className="text-gray-700">Once approved, the calendar updates and the agreement is documented with timestamps.</span>
            </li>
          </ol>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> Quick Accords create a documented record of every schedule
                modification both parents agreed to. This is invaluable if there is ever a dispute
                about what was agreed upon.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Calendar Tips */}
        <section id="calendar-tips">
          <h2 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Tips for using the calendar effectively
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Make it the single source of truth:</strong> Both parents should agree
                that the CommonGround calendar is the definitive schedule. If it is not on the
                calendar, it is not confirmed.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Add events as soon as you know about them:</strong> School conferences,
                doctor appointments, and activities should go on the calendar the moment they are
                scheduled so your co-parent is always informed.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Include details in event notes:</strong> Add the address, time, and any
                special instructions so both parents have all the information they need.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Use Quick Accords for changes:</strong> Even if your co-parent agrees
                verbally, document the change through a Quick Accord so there is a written record.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Review the upcoming week together:</strong> Make it a habit to glance at
                the next seven days each Sunday evening to catch any scheduling overlaps early.
              </div>
            </li>
          </ul>
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
