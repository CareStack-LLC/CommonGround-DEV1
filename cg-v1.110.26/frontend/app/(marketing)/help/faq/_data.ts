/**
 * FAQ data (no `'use client'` here) — imported by both the server wrapper
 * `page.tsx` (for FAQ JSON-LD) and the client component `_content.tsx`
 * (for rendering).
 *
 * The server page cannot import non-component values from a client module
 * (Next.js/Turbopack production build turns the array into a reference
 * object, causing `TypeError: faqCategories.flatMap is not a function`
 * during page-data collection). Plain TS modules serialize fine across
 * the boundary.
 *
 * Lucide icons are universal React components and work in both server
 * and client rendering — no `'use client'` directive needed here.
 */

import {
  BookOpen,
  Calendar,
  CreditCard,
  Gavel,
  Heart,
  HelpCircle,
  MessageSquare,
  Scale,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  faqs: FaqItem[];
}

export const faqCategories: FaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: HelpCircle,
    faqs: [
      {
        question: 'What is CommonGround?',
        answer:
          'CommonGround is a co-parenting platform that helps separated parents communicate effectively, manage custody schedules, track expenses, and create agreements. Our AI assistant ARIA supports peaceful communication by suggesting calmer ways to express yourself.',
      },
      {
        question: 'How do I get started?',
        answer:
          'Sign up for a free account at find-commonground.com/register. Once registered, you can invite your co-parent to join. No credit card is required for the free tier.',
      },
      {
        question: 'Do both parents need to sign up?',
        answer:
          'CommonGround works best when both parents are on the platform. Your co-parent needs an account to receive messages, view shared calendars, and approve agreements. You can start using many features solo while waiting for them to join.',
      },
      {
        question: 'What if my co-parent won\'t join?',
        answer:
          'You can still use the calendar, expense tracking, agreement builder, and court documentation on your own. Everything syncs automatically when they join later. Many parents find that demonstrating the platform\'s benefits helps convince the other parent.',
      },
      {
        question: 'How do I invite my co-parent?',
        answer:
          'From your dashboard, click "Invite Co-Parent." CommonGround sends a secure invitation link via email. Your co-parent creates their own separate account — they never see your login credentials or private activity.',
      },
      {
        question: 'Can I use CommonGround on my phone?',
        answer:
          'Yes! CommonGround works in any mobile browser. Native iOS and Android apps are coming soon. The web app is fully responsive and optimized for mobile use.',
      },
    ],
  },
  {
    id: 'aria',
    title: 'ARIA & Messaging',
    icon: Sparkles,
    faqs: [
      {
        question: 'What is ARIA?',
        answer:
          'ARIA (AI Relationship Intelligence Assistant) analyzes messages before they\'re sent. If ARIA detects language that could be misread or escalate tension, she suggests calmer alternatives while preserving your intended meaning. Think of her as a supportive coach for every message.',
      },
      {
        question: 'How does ARIA analyze messages?',
        answer:
          'ARIA uses a 3-tier system: quick pattern matching for common issues, AI-powered analysis for nuanced understanding, and a fallback system for reliability. Analysis happens in under one second as you compose your message.',
      },
      {
        question: 'Does ARIA read all my messages?',
        answer:
          'ARIA only analyzes messages within CommonGround, not your other communications. Analysis happens in real-time when you compose a message. Your drafts and ARIA\'s suggestions are never shared with your co-parent.',
      },
      {
        question: 'Can I turn ARIA off?',
        answer:
          'Yes, you can disable ARIA suggestions in your settings. Communication metrics like response times will still be tracked for compliance purposes.',
      },
      {
        question: 'Will my co-parent see my original message?',
        answer:
          'No. If you accept an ARIA suggestion, only the revised message is sent. Your original wording is never shared. Your co-parent sees the final message you chose to send.',
      },
      {
        question: 'Does ARIA shield me from hostile messages?',
        answer:
          'Yes. ARIA can review incoming messages and summarize hostile content so you get the important information without the emotional impact. This helps you respond calmly instead of reactively.',
      },
      {
        question: 'Does ARIA work for incoming messages too?',
        answer:
          'ARIA analyzes messages you receive and can flag concerning patterns. If an incoming message contains hostility, ARIA can provide a neutral summary so you can process the logistics without the emotional weight.',
      },
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling & Exchanges',
    icon: Calendar,
    faqs: [
      {
        question: 'How does the shared calendar work?',
        answer:
          'The shared calendar shows custody schedules, events, and exchanges. Both parents see the same calendar with custody time color-coded. Changes sync in real-time so there\'s never confusion about who has the kids when.',
      },
      {
        question: 'Can I set up recurring schedules?',
        answer:
          'Yes! With the Plus plan ($17.99/mo), you can automate weekly or biweekly custody patterns, holiday rotation, and recurring events. The calendar fills in automatically so you don\'t have to enter each week manually.',
      },
      {
        question: 'What is exchange check-in?',
        answer:
          'Exchange check-in records when custody transfers happen. You can check in manually or use GPS verification with Silent Handoff. This creates documented, timestamped records for compliance tracking.',
      },
      {
        question: 'What is Silent Handoff?',
        answer:
          'Silent Handoff is GPS-verified custody exchange. When you arrive at the exchange location, the app confirms your arrival via geofence. You scan a QR code to confirm the transfer. Zero in-person interaction needed — the app handles all documentation.',
      },
      {
        question: 'How is compliance tracked?',
        answer:
          'CommonGround tracks on-time exchanges, schedule adherence, and grace period usage. Each parent has a compliance score showing their on-time percentage. These metrics can be included in court exports.',
      },
      {
        question: 'What if I need to change the schedule?',
        answer:
          'Use Quick Accords to propose a one-time schedule modification. Your co-parent reviews and approves or declines. The change and response are documented for your records.',
      },
    ],
  },
  {
    id: 'expenses',
    title: 'Expenses & ClearFund',
    icon: Wallet,
    faqs: [
      {
        question: 'How does ClearFund expense tracking work?',
        answer:
          'Log any child-related expense with a description, amount, and category. Upload a receipt photo or PDF. CommonGround calculates each parent\'s share based on your agreed split percentages.',
      },
      {
        question: 'Can I upload receipts?',
        answer:
          'Yes. Attach photos or PDFs of receipts to any expense. This documentation is stored securely and can be included in court exports.',
      },
      {
        question: 'How are expenses split?',
        answer:
          'Split percentages are defined in your custody agreement (e.g., 50/50 or 60/40). CommonGround automatically calculates each parent\'s share. You can set different split ratios for different expense categories.',
      },
      {
        question: 'How do I request reimbursement?',
        answer:
          'When you log an expense, your co-parent receives a notification to review it. They can approve, question, or dispute the expense. Once approved, payments can be tracked through the platform.',
      },
      {
        question: 'Can I track child support payments?',
        answer:
          'Yes — CommonGround tracks child support, it doesn\u2019t process it. You pay through your state\u2019s official State Disbursement Unit (SDU), then log the payment in CommonGround so both parents and the court see the record. Other obligations like medical copays and education expenses can be funded through the platform with a virtual card.',
      },
    ],
  },
  {
    id: 'kidspace',
    title: 'KidSpace',
    icon: Heart,
    faqs: [
      {
        question: 'What is KidSpace?',
        answer:
          'KidSpace is a safe, monitored space for children ages 3-12 to connect with their other parent. It includes video calls, shared reading, watching movies together, and cooperative games — all with ARIA safety monitoring.',
      },
      {
        question: 'Is KidSpace safe for my child?',
        answer:
          'Yes. ARIA monitors all KidSpace activity for inappropriate content. Parents approve every contact in the child\'s circle. You can set calling hours and end calls instantly. All activity is logged.',
      },
      {
        question: 'What activities are available?',
        answer:
          'Read Together (shared bedtime stories with visual books), Watch Together (age-appropriate movies and shows), Play Together (cooperative games like puzzles and tic-tac-toe), and video/voice calls.',
      },
      {
        question: 'What is My Circle?',
        answer:
          'My Circle lets parents add trusted contacts — like grandparents, aunts, or uncles — who can connect with the child through KidSpace. The Complete plan includes up to 5 approved contacts, and parents stay in full control of who is in the circle at all times.',
      },
      {
        question: 'Which plans include KidSpace?',
        answer:
          'KidSpace is part of the Complete plan ($34.99/mo). It includes video and voice calls, messaging, all activities, up to 5 My Circle contacts, and a 2-hour maximum call duration. The free and Plus plans do not include KidSpace.',
      },
    ],
  },
  {
    id: 'court',
    title: 'Court & Legal',
    icon: Gavel,
    faqs: [
      {
        question: 'Are CommonGround records court-admissible?',
        answer:
          'CommonGround exports include SHA-256 integrity verification — a digital fingerprint that proves records haven\'t been altered. Our records are timestamped and include chain of custody documentation. Accepted in courts across all 50 states, though always discuss specifics with your attorney.',
      },
      {
        question: 'What can I export for court?',
        answer:
          'Five export types: Full Case Package (everything), Communication Log (messages with ARIA interventions), Custody Schedule Report (exchanges and compliance), Financial Summary (ClearFund transactions), and ARIA Assessment (good-faith scoring). All verified with SHA-256.',
      },
      {
        question: 'Can my attorney access my case?',
        answer:
          'Yes. Grant time-limited, read-only access to attorneys, GALs, mediators, and evaluators. They see case timelines, compliance metrics, and can generate their own reports. All professional activity is logged.',
      },
      {
        question: 'Can I use CommonGround if there\'s a restraining order?',
        answer:
          'Yes. CommonGround can serve as the court-ordered communication channel. Messages are documented, timestamped, and ARIA ensures all communication stays appropriate and focused on the children. Many courts specifically recommend structured communication platforms in these situations.',
      },
      {
        question: 'What is SHA-256 verification?',
        answer:
          'SHA-256 creates a unique digital fingerprint of each record. If even one character of the document is changed after creation, the verification fails — proving the record hasn\'t been tampered with. This is the same technology used in banking and government systems.',
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing & Billing',
    icon: CreditCard,
    faqs: [
      {
        question: 'How much does CommonGround cost?',
        answer:
          'CommonGround offers three plans: Web Starter (free forever — includes ARIA messaging, shared calendar, and expense tracking), Plus ($17.99/month or $199.99/year — adds automated schedules, Quick Accords, holiday rotation, and PDF exports), and Complete ($34.99/month or $349.99/year — adds KidSpace for kids, Silent Handoff GPS, custody analytics, court-ready exports, and priority support).',
      },
      {
        question: 'Do both parents need to pay?',
        answer:
          'Each parent manages their own subscription independently. Both can use the free tier, or each can upgrade separately. You don\'t need matching plans to communicate — a parent on the free plan can message a parent on Complete.',
      },
      {
        question: 'Is there a free trial?',
        answer:
          'The Web Starter plan is free forever with no credit card required. For paid plans, you can upgrade and downgrade at any time with no long-term commitment.',
      },
      {
        question: 'Can I cancel anytime?',
        answer:
          'Absolutely. No contracts or commitments. Cancel from your account settings and your plan stays active until the end of your billing period. No cancellation fees.',
      },
      {
        question: 'Do you offer hardship pricing?',
        answer:
          'Yes. We believe every family deserves access to better co-parenting tools regardless of financial situation. Contact support@find-commonground.com to discuss hardship options — we review each case individually.',
      },
      {
        question: 'Is there a discount for annual billing?',
        answer:
          'Yes. Annual billing saves you money: Plus is $199.99/year (saves ~$16 vs monthly) and Complete is $349.99/year (saves ~$70 vs monthly).',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    faqs: [
      {
        question: 'Is my data secure?',
        answer:
          'Yes. We use bank-level encryption (AES-256 at rest, TLS 1.3 in transit), role-based access controls, and comprehensive audit logging. Your data is stored on encrypted servers with redundant backups.',
      },
      {
        question: 'What can my co-parent see?',
        answer:
          'Your co-parent can see: sent messages, the shared calendar, approved agreements, expenses they\'re part of, and exchange logs. They cannot see: your drafts, ARIA suggestions, your original message before rewrites, your private notes, or your login activity.',
      },
      {
        question: 'Do you sell my data?',
        answer:
          'Absolutely not. We never sell, share, or use your data for advertising. Your family\'s information is never used for AI training or shared with third parties. Period.',
      },
      {
        question: 'Can I delete my account?',
        answer:
          'Yes. Request account deletion from your settings. Your data will be removed within 90 days, except where legally required (e.g., active court orders referencing your records).',
      },
      {
        question: 'What happens if there\'s a data breach?',
        answer:
          'We follow industry-standard incident response procedures. In the unlikely event of a breach, we will notify affected users within 72 hours, explain what happened, and provide steps to protect your accounts.',
      },
      {
        question: 'Can I export all my data?',
        answer:
          'Yes. You can request a full data export from your account settings at any time. We support GDPR and CCPA data portability requests.',
      },
      {
        question: 'Are ARIA suggestions private?',
        answer:
          'Yes. Your drafts, ARIA\'s analysis, and suggested rewrites are completely private. Only the final message you choose to send is visible to your co-parent. If you accept a suggestion, your original wording is never shared.',
      },
    ],
  },
  {
    id: 'professionals',
    title: 'For Professionals',
    icon: Scale,
    faqs: [
      {
        question: 'How do professionals access client cases?',
        answer:
          'Parents invite professionals by email. Once both parents consent (configurable), the professional gets scoped, read-only access to the case. All professional activity is logged in the audit trail.',
      },
      {
        question: 'Is the professional portal free?',
        answer:
          'Yes. The professional portal is free for all attorneys, mediators, GALs, evaluators, therapists, and paralegals. Clients choose and manage their own subscription plans.',
      },
      {
        question: 'What reports can professionals generate?',
        answer:
          'Five report types: Full Compliance Report, Communication Analysis (ARIA intervention history), Exchange Compliance (on-time rates, GPS data), Financial Compliance (payment tracking), and ARIA Assessment (good-faith scoring per parent).',
      },
      {
        question: 'What is the AI-assisted intake?',
        answer:
          'Professionals can send a link to prospective clients. The AI conducts a structured intake interview, automatically extracting key information (parties, children, custody preferences, finances). The professional reviews the summary and can convert it to a full case with one click.',
      },
      {
        question: 'Can I manage a team or firm?',
        answer:
          'Yes. Create a firm profile, invite team members, and assign roles (attorney, paralegal, intake coordinator, administrator). Each team member gets appropriate access to assigned cases.',
      },
    ],
  },
];
