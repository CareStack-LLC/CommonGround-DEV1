/**
 * Case study content.
 *
 * Typed data file used by the /case-studies index and dynamic [slug]
 * route. No MDX runtime is installed — this is the intentional
 * lightweight alternative.
 *
 * All three seed studies are marked placeholder on the consuming page.
 * Replace with real customer interviews before publishing.
 */

export interface CaseStudyResult {
  value: string;
  label: string;
}

export interface CaseStudyQuote {
  text: string;
  author: string;
  role: string;
}

export interface CaseStudyCta {
  headline: string;
  subheadline?: string;
}

export interface CaseStudy {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  challenge: string;
  approach: string;
  results: CaseStudyResult[];
  quote: CaseStudyQuote;
  cta: CaseStudyCta;
  publishedAt: string;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'post-decree-litigation-firm',
    title: 'A post-decree litigation firm cuts court motions in half',
    subtitle:
      'How a 12-attorney family law firm replaced three tools with one platform.',
    description:
      'A mid-size post-decree litigation firm replaced three fragmented tools with CommonGround and cut filed court motions by 52% in one year.',
    challenge:
      'The firm juggled a court-messaging app, a separate expense ledger, and email chains for exchange logs. Paralegals spent hours reconciling records before each hearing, and high-conflict clients kept escalating to motion practice.',
    approach:
      'The firm rolled out CommonGround to every post-decree client at intake. ARIA coaching ran on all client messages by default, Silent Handoff replaced in-person exchanges for their highest-conflict cases, and court-ready PDF exports fed directly into their DMS.',
    results: [
      { value: '-52%', label: 'Fewer court motions filed' },
      { value: '4.8', label: 'Average client rating (5-pt scale)' },
      { value: '9.4hr', label: 'Paralegal hours saved per hearing' },
    ],
    quote: {
      text: 'We used to reconcile three tools for every hearing. Now the court export is one click, and motions are down across the whole practice.',
      author: 'Casey R.',
      role: 'Managing partner, family law firm',
    },
    cta: {
      headline: 'Bring CommonGround to your firm',
      subheadline:
        'Book a 15-minute walkthrough tailored to your practice area.',
    },
    publishedAt: '2026-02-14',
  },
  {
    slug: 'high-conflict-mediator',
    title: 'A mediator shortens high-conflict parenting plans by weeks',
    subtitle:
      'ARIA and the KidSpace app changed how one parenting coordinator runs sessions.',
    description:
      'A parenting coordinator used ARIA coaching and KidSpace to shorten high-conflict parenting plan sessions by an average of three weeks.',
    challenge:
      'Clients arrived at mediation sessions fresh off hostile text exchanges. The coordinator spent the first 20 minutes of every session de-escalating before any substantive work could happen, stretching plans over months.',
    approach:
      'Every client was onboarded to CommonGround before the first session. ARIA auto-rewrote toxic messages between sessions, and KidSpace gave children direct video access to both parents — lowering the emotional temperature before mediation.',
    results: [
      { value: '-3.2wk', label: 'Shorter parenting plan timelines' },
      { value: '87%', label: 'Agreements reached without court' },
      { value: '4.9', label: 'Client satisfaction (5-pt scale)' },
    ],
    quote: {
      text: 'Clients arrive calmer because ARIA handled the hard conversations all week. We finish plans weeks earlier than before.',
      author: 'Dr. Sage H.',
      role: 'Parenting coordinator',
    },
    cta: {
      headline: 'See CommonGround for mediators',
      subheadline:
        'Book a 15-minute demo and see ARIA coaching in action.',
    },
    publishedAt: '2026-03-05',
  },
  {
    slug: 'pro-se-family',
    title: 'A pro se family stays out of court with a shared calendar',
    subtitle:
      'How two parents used the free tier to build a working co-parenting system after their divorce.',
    description:
      'Two pro se parents used the CommonGround free tier to rebuild communication and stay out of court for over a year without an attorney.',
    challenge:
      'Neither parent could afford ongoing legal representation after their divorce. Missed school pickups and conflicting expense records kept threatening to escalate back to court, and their kids were caught in the middle.',
    approach:
      'The parents signed up for the free tier and used the shared calendar, ClearFund expense ledger, and ARIA-coached messaging. KidSpace gave their two children direct access to both parents between visits.',
    results: [
      { value: '0', label: 'Court appearances in 12 months' },
      { value: '4.7', label: 'Kid-reported happiness (5-pt scale)' },
      { value: '100%', label: 'Expense reimbursements on time' },
    ],
    quote: {
      text: 'We could not afford another lawyer fight. The shared calendar and expense ledger gave us a neutral referee we both trust.',
      author: 'Taylor & Jamie',
      role: 'Pro se co-parents, two kids',
    },
    cta: {
      headline: 'Start free',
      subheadline:
        'The Web Starter plan covers both parents and every child — no credit card.',
    },
    publishedAt: '2026-03-22',
  },
];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((cs) => cs.slug === slug);
}
