import Link from 'next/link';
import {
  MapPin,
  Navigation,
  QrCode,
  Clock,
  BarChart3,
  ArrowRight,
  Play,
  Lightbulb,
  CheckCircle2,
  BookOpen,
  Brain,
  Calendar,
  MessageSquare,
  Shield,
  MapPinned,
} from 'lucide-react';

export const metadata = {
  title: 'Custody Exchanges | CommonGround Help Center',
  description:
    'Learn about Silent Handoff GPS-verified exchanges, QR code check-in, grace periods, and compliance tracking in CommonGround.',
};

const tocItems = [
  { id: 'silent-handoff', label: 'What is Silent Handoff?' },
  { id: 'exchange-locations', label: 'Setting up exchange locations' },
  { id: 'gps-verification', label: 'GPS verification explained' },
  { id: 'qr-checkin', label: 'QR code check-in' },
  { id: 'grace-periods', label: 'Grace periods and late tracking' },
  { id: 'compliance-metrics', label: 'Exchange compliance metrics' },
  { id: 'exchange-tips', label: 'Tips for stress-free exchanges' },
];

const relatedGuides = [
  { icon: BookOpen, title: 'Getting Started', href: '/help/guides/getting-started', description: 'Create your account, invite your co-parent, and send your first message.' },
  { icon: Brain, title: 'Messaging & ARIA', href: '/help/guides/messaging-aria', description: 'How ARIA coaches your messages and shields you from hostility.' },
  { icon: Calendar, title: 'Calendar & Scheduling', href: '/help/guides/calendar-scheduling', description: 'Shared calendars, recurring schedules, and holiday rotations.' },
];

export default function CustodyExchangesGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cg-sage/10 mb-6">
          <MapPin className="w-8 h-8 text-cg-sage" />
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold text-foreground mb-4"
          style={{ fontFamily: 'DM Serif Display, serif' }}
        >
          Custody Exchanges
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Contactless, GPS-verified custody transfers that document everything automatically.
          No awkward interactions, no disputed handoffs, no he-said-she-said.
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
        {/* Section 1: Silent Handoff */}
        <section id="silent-handoff">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Shield className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              What is Silent Handoff?
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Silent Handoff is CommonGround&apos;s system for contactless, GPS-verified custody
            transfers. It eliminates the need for direct interaction between parents during
            pickups and drop-offs. The app handles all the verification, timing, and documentation
            so you can focus entirely on your child.
          </p>
          <p className="text-gray-600 mb-4">
            Here is how it works at a high level: both parents have the exchange scheduled on
            their shared calendar. When the dropping-off parent arrives at the designated location,
            the app detects their presence via GPS. The receiving parent is notified. When they
            arrive and confirm pickup, the exchange is logged with timestamps, locations, and
            verification data.
          </p>
          <p className="text-gray-600 mb-4">
            The entire exchange is documented automatically. Neither parent needs to speak to,
            text, or interact with the other. The children transition smoothly, and both parents
            have a verified record.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> Silent Handoff is especially valuable in high-conflict
                situations or when a court order requires documented exchanges. The verified
                records are exportable for legal proceedings.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Exchange Locations */}
        <section id="exchange-locations">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <MapPinned className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Setting up exchange locations
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            You can save frequently used exchange locations so you do not have to enter them
            each time. Go to <strong>Exchange Settings</strong> and add your regular handoff spots.
            Each saved location includes a name, address, and the GPS coordinates used for
            verification.
          </p>
          <h3 className="text-lg font-semibold text-foreground mb-3">Recommended location types</h3>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Public places:</strong> Police station parking lots, library entrances, and community center parking areas are ideal. They are neutral, well-lit, and often have security cameras.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>School or daycare:</strong> If both parents do pickup and drop-off at school, the school itself can serve as the exchange point with no direct parent contact needed.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Midpoint locations:</strong> Choose a spot roughly equidistant between both homes to share the travel burden fairly.</span>
            </li>
          </ul>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> Avoid using either parent&apos;s home as the exchange location
                if possible. Neutral public locations reduce tension and provide a safer environment
                for everyone.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: GPS Verification */}
        <section id="gps-verification">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Navigation className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              GPS verification explained
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Each exchange location has a geofence, a virtual boundary around the GPS coordinates.
            When your phone enters this geofence, CommonGround automatically detects that you
            have arrived at the exchange location. This arrival is logged with a timestamp.
          </p>
          <p className="text-gray-600 mb-4">
            The geofence radius is set to accommodate typical parking lot sizes, so you do not
            need to stand at an exact spot. As long as you are within the designated area, your
            presence is verified.
          </p>
          <p className="text-gray-600 mb-4">
            GPS verification creates an objective record of arrival times for both parents. This
            eliminates disputes about who was late, who did not show up, or who left early. The
            data is timestamped, cannot be edited after the fact, and is included in compliance
            reports.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> Make sure location services are enabled for CommonGround on
                your phone. The app only uses your location during exchange windows, not continuously.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: QR Code Check-in */}
        <section id="qr-checkin">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <QrCode className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              QR code check-in
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            For an additional layer of verification, CommonGround offers QR code check-in. The
            dropping-off parent displays a QR code on their phone, and the receiving parent scans
            it to confirm the pickup. This creates a verified, two-party confirmation that the
            exchange occurred.
          </p>
          <ol className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">1</span>
              <span className="text-gray-700">When you arrive at the exchange location, open the exchange details in the app.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">2</span>
              <span className="text-gray-700">The dropping-off parent taps <strong>Show QR Code</strong> to display a unique, time-limited code.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">3</span>
              <span className="text-gray-700">The receiving parent taps <strong>Scan to Confirm</strong> and points their camera at the code.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage text-white text-sm flex items-center justify-center font-semibold">4</span>
              <span className="text-gray-700">The exchange is verified and logged with both parents&apos; confirmation timestamps.</span>
            </li>
          </ol>
          <p className="text-gray-600">
            QR check-in is optional. GPS verification alone is sufficient for most families, but
            the QR code adds a stronger verification record for situations where documented proof
            of transfer is important.
          </p>
        </section>

        {/* Video Placeholder */}
        <div className="bg-gradient-to-br from-foreground to-cg-slate rounded-2xl p-8 text-center text-white">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Silent Handoff Walkthrough
          </h3>
          <p className="text-white/70 text-sm">Video walkthrough coming soon</p>
        </div>

        {/* Section 5: Grace Periods */}
        <section id="grace-periods">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <Clock className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Grace periods and late tracking
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Life is unpredictable. Traffic, weather, and last-minute delays happen. CommonGround
            includes a configurable grace period for each exchange to account for reasonable delays
            without immediately flagging a parent as late.
          </p>
          <p className="text-gray-600 mb-4">
            The default grace period is 15 minutes, but you can adjust it in your exchange
            settings to any duration that works for your situation. During the grace period, the
            other parent sees a status indicator showing that the exchange is in progress.
          </p>
          <p className="text-gray-600 mb-4">
            If a parent has not arrived by the end of the grace period, the exchange is automatically
            marked as late. This is recorded in the compliance data and included in reports. The
            late parent receives a notification, and the waiting parent is informed of the delay.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm">
                <strong>Tip:</strong> Set a grace period that accounts for your typical commute
                variability. A 15-minute grace period works well for most families, but adjust it
                based on your exchange location and traffic patterns.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Compliance Metrics */}
        <section id="compliance-metrics">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cg-sage/10">
              <BarChart3 className="w-5 h-5 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Exchange compliance metrics
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            CommonGround automatically compiles exchange data into compliance metrics that give
            you a clear picture of how well the custody schedule is being followed. These metrics
            include:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>On-time percentage:</strong> The percentage of exchanges where both parents arrived within the grace period.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Per-parent breakdown:</strong> Individual on-time rates for each parent, so the data is fair and specific.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Missed exchanges:</strong> A count of exchanges where one parent did not show up at all.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Average delay time:</strong> When a parent is late, how long the other parent typically waits.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-cg-sage mt-1 flex-shrink-0" />
              <span><strong>Trend over time:</strong> Whether compliance is improving, stable, or declining over weeks and months.</span>
            </li>
          </ul>
          <p className="text-gray-600">
            All compliance data is exportable as a formatted report suitable for court filings,
            mediation sessions, or attorney review. The reports include SHA-256 integrity
            verification to confirm the data has not been tampered with.
          </p>
        </section>

        {/* Section 7: Tips */}
        <section id="exchange-tips">
          <h2 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Tips for stress-free exchanges
          </h2>
          <p className="text-gray-600 mb-4">
            Custody exchanges do not have to be stressful. With the right approach and
            CommonGround&apos;s tools, they can become a smooth, routine part of your week.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Arrive on time:</strong> Consistent punctuality builds trust and sets a
                positive example for your children. Aim to arrive a few minutes early.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Use public locations:</strong> Neutral handoff spots reduce tension and
                provide a safer, more comfortable environment for everyone.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Let the app handle documentation:</strong> You do not need to take notes,
                save texts, or screenshot arrival times. CommonGround records everything automatically.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Keep interactions brief and child-focused:</strong> If you do interact with
                your co-parent at the exchange, keep the conversation short and focused on the
                children&apos;s immediate needs.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Pack ahead of time:</strong> Have your child&apos;s bag ready before you
                leave so the exchange itself takes only a moment.
              </div>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-cg-sage mt-0.5 flex-shrink-0" />
              <div>
                <strong>Stay calm for your kids:</strong> Children are perceptive. When exchanges
                are handled calmly and efficiently, they feel more secure about transitioning
                between homes.
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
