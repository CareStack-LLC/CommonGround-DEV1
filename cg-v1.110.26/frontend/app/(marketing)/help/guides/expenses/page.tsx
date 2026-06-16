import Link from 'next/link';
import {
  Wallet,
  Receipt,
  PieChart,
  ArrowRight,
  CreditCard,
  Upload,
  CheckCircle2,
  Scale,
  FileText,
  Play,
  Lightbulb,
  DollarSign,
  BarChart3,
  Shield,
} from 'lucide-react';

export const metadata = {
  title: 'Expenses & ClearFund Guide | CommonGround Help Center',
  description:
    'Learn how to log expenses, upload receipts, split costs, request reimbursements, and track payments with ClearFund.',
};

const tocItems = [
  { id: 'what-is-clearfund', label: 'What is ClearFund?' },
  { id: 'logging-expense', label: 'Logging an expense' },
  { id: 'uploading-receipts', label: 'Uploading receipts' },
  { id: 'how-splits-work', label: 'How splits are calculated' },
  { id: 'requesting-reimbursement', label: 'Requesting reimbursement' },
  { id: 'tracking-payments', label: 'Tracking payments' },
  { id: 'court-ordered-obligations', label: 'Court-ordered obligations' },
  { id: 'financial-compliance', label: 'Financial compliance for court' },
];

export default function ExpensesGuidePage() {
  return (
    <article className="pb-16 lg:pb-24">
      {/* Hero */}
      <section className="pt-10 pb-8 lg:pt-14 lg:pb-10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cg-sage/10 flex items-center justify-center mx-auto mb-5">
            <Wallet className="w-7 h-7 text-cg-sage" />
          </div>
          <h1
            className="text-3xl sm:text-4xl text-foreground mb-3"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Expenses & <span className="text-cg-sage">ClearFund</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Transparent expense tracking, automatic cost splitting, and court-ready financial records for child-related costs.
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

        {/* What is ClearFund? */}
        <section id="what-is-clearfund" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What is ClearFund?
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            ClearFund is CommonGround&apos;s built-in expense management system designed specifically for co-parenting. It gives both parents full transparency into child-related costs, eliminates disputes over who owes what, and creates a documented financial trail that holds up in court.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Every expense is logged with a category, amount, description, and optional receipt. Costs are automatically split based on your agreed-upon percentages, and payments can be processed directly through the platform with zero fees via Stripe.
          </p>
        </section>

        {/* Logging an Expense */}
        <section id="logging-expense" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Receipt className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Logging an expense
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Adding a new expense takes less than a minute. From your ClearFund dashboard, tap the &quot;Add Expense&quot; button and fill in the details.
          </p>
          <ol className="space-y-3 mb-6">
            {[
              'Navigate to ClearFund from your family file dashboard.',
              'Tap "Add Expense" in the top-right corner.',
              'Select a category (medical, education, extracurricular, clothing, childcare, or other).',
              'Enter the amount and a brief description of what the expense was for.',
              'Set the date the expense occurred.',
              'Optionally attach a receipt (see next section).',
              'Tap "Submit" to log the expense and notify your co-parent.',
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
                <strong>Tip:</strong> Be specific in your descriptions. Instead of &quot;doctor,&quot; write &quot;Pediatric checkup with Dr. Martinez on 3/15.&quot; Detailed descriptions prevent misunderstandings and look better in court records.
              </p>
            </div>
          </div>
        </section>

        {/* Uploading Receipts */}
        <section id="uploading-receipts" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Uploading receipts
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Attaching receipts to your expenses adds a layer of verification and makes your records significantly stronger for court purposes. ClearFund accepts photos and PDF documents.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              'Take a photo of the receipt directly from your phone camera, or upload a saved image.',
              'Upload PDF documents for insurance statements, invoices, or digital receipts.',
              'Each expense can have multiple attachments if needed.',
              'Receipts are stored securely and included in financial exports.',
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
                <strong>Tip:</strong> Upload receipts at the time of purchase while they are fresh. Faded or crumpled receipts are harder to photograph later.
              </p>
            </div>
          </div>
        </section>

        {/* How Splits Are Calculated */}
        <section id="how-splits-work" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              How splits are calculated
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            ClearFund automatically calculates each parent&apos;s share of an expense based on the split percentages defined in your custody agreement. Common arrangements include 50/50, 60/40, or 70/30 splits, but any ratio is supported.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            For example, if you have a 60/40 split and log a $200 medical expense, Parent A is responsible for $120 and Parent B for $80. The system handles the math automatically and shows each parent exactly what they owe.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Different expense categories can have different split ratios if your agreement specifies it. Medical expenses might be split 50/50 while extracurricular activities are 70/30.
          </p>
        </section>

        {/* Requesting Reimbursement */}
        <section id="requesting-reimbursement" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <ArrowRight className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Requesting reimbursement
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            When you pay for an expense upfront, you can submit a reimbursement request to your co-parent for their portion.
          </p>
          <ol className="space-y-3 mb-6">
            {[
              'Log the expense with full details and receipt.',
              'The system calculates your co-parent\'s share based on the agreed split.',
              'Your co-parent receives a notification to review the expense.',
              'They can approve, request more information, or dispute the expense.',
              'Once approved, payment can be made directly through the platform.',
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
                <strong>Tip:</strong> Submit reimbursement requests promptly. Timely submissions are easier for your co-parent to verify and demonstrate good-faith financial cooperation.
              </p>
            </div>
          </div>
        </section>

        {/* Tracking Payments */}
        <section id="tracking-payments" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Tracking payments
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            The ClearFund dashboard gives you a real-time view of your financial standing. You can see all outstanding balances, pending reimbursements, and completed payments in one place.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              'View a running balance showing who owes what at any time.',
              'Mark expenses as paid when your co-parent reimburses you outside the platform.',
              'Process zero-fee payments directly through Stripe integration.',
              'Filter by category, date range, or payment status.',
              'Download monthly or custom-range financial summaries.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Court-Ordered Obligations */}
        <section id="court-ordered-obligations" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Court-ordered obligations
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            ClearFund can track recurring court-ordered financial obligations separately from one-time expenses. Child support payments are made directly through your state&rsquo;s State Disbursement Unit (SDU) — CommonGround records the payment for court evidence. Other recurring obligations like medical insurance premiums and education contributions are funded through the platform.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            Set up each obligation with its amount, frequency, and due date. ClearFund sends reminders before payments are due and tracks compliance automatically. Late or missed payments are documented with timestamps for your records.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Even if you make payments outside CommonGround, log them here to maintain a complete financial record for court purposes.
              </p>
            </div>
          </div>
        </section>

        {/* Financial Compliance */}
        <section id="financial-compliance" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Financial compliance for court
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Every transaction in ClearFund is timestamped, attributed, and stored with tamper-proof verification. This creates a comprehensive financial record that attorneys and courts can rely on.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              'All expenses include SHA-256 verification hashes for tamper detection.',
              'Export financial summaries as court-ready PDFs.',
              'Filter exports by date range, category, or payment status.',
              'Include or exclude receipt attachments in your export.',
              'Share exports directly with your attorney through the Professional Portal.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
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
            ClearFund walkthrough
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
              { title: 'Agreement Builder', desc: 'Set up expense split percentages in your custody agreement.', href: '/help/guides/agreements' },
              { title: 'Court Documentation', desc: 'Export financial records for court proceedings.', href: '/help/guides/court-exports' },
              { title: 'Calendar & Scheduling', desc: 'Track custody time that affects expense obligations.', href: '/help/guides/calendar-scheduling' },
              { title: 'For Professionals', desc: 'Attorney access to financial compliance reports.', href: '/help/guides/professional-access' },
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
            Our support team is here to help you with any expense or payment questions.
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
