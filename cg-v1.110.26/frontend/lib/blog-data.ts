/**
 * Blog Post Data
 *
 * Centralized data for all blog posts. The dynamic [slug] route uses this
 * for static generation and metadata.
 */

/**
 * Slugs hidden from the blog. These are CMS-published posts we don't want to
 * surface on the site — filtered out of the listing and treated as not-found
 * on the detail route. (They still exist in the CMS until deleted by an admin.)
 */
export const HIDDEN_BLOG_SLUGS = new Set<string>([
  'starting-your-co-parenting-journey-a-guide-for-new-beginnings',
  'managing-co-parenting-stress-tips-for-stress-awareness-month',
]);

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categoryColor: 'sage' | 'amber' | 'slate' | 'red';
  author: string;
  date: string;
  readTime: string;
  featured: boolean;
  image: string;
  metaDescription: string;
  relatedPosts: string[];
  ctaTitle: string;
  ctaDescription: string;
  ctaLink: string;
  ctaLinkText: string;
  ctaGradient: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'long-distance-coparenting',
    title: 'Long-Distance Co-Parenting: Staying Close From Miles Away',
    excerpt: 'Distance changes the logistics of parenting, but it does not have to change the relationship. How to stay a constant, everyday presence in your child’s life when you live hours — or time zones — apart.',
    category: 'Communication',
    categoryColor: 'amber',
    author: 'CommonGround Team',
    date: '2026-07-14',
    readTime: '9 min read',
    featured: true,
    image: '/images/blog/blog_longdistance.jpg',
    metaDescription: 'A practical guide to long-distance co-parenting: building a virtual visitation routine, making video calls kids actually enjoy, handling travel and school-year logistics, and staying an everyday parent from far away.',
    relatedPosts: ['helping-kids-thrive-two-homes', 'communication-tool-for-progress'],
    ctaTitle: 'Stay close from any distance',
    ctaDescription: 'KidSpace gives your child a safe, simple way to video-call you during the other parent’s time — no borrowed phones, no gatekeeping, just a reliable line to both parents.',
    ctaLink: '/kidspace',
    ctaLinkText: 'Explore KidSpace',
    ctaGradient: 'from-cg-amber-subtle to-cg-sage-subtle',
  },
  {
    slug: 'different-rules-two-homes',
    title: 'Different Rules in Two Homes: What to Do When Co-Parents Disagree',
    excerpt: 'Bedtime at 8 in one house, 10 in the other. Screens all weekend there, one hour here. When parenting styles clash across two homes, here’s what actually matters — and how to stop relitigating it.',
    category: 'Parenting',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2026-07-08',
    readTime: '8 min read',
    featured: false,
    image: '/images/blog/blog_tworules.jpg',
    metaDescription: 'What to do when co-parents have different rules: which differences are fine, which need alignment, how to negotiate the big four (sleep, screens, safety, school), and how to keep kids from working the gap.',
    relatedPosts: ['helping-kids-thrive-two-homes', 'why-written-agreements-matter'],
    ctaTitle: 'Put the big rules in writing — together',
    ctaDescription: 'CommonGround’s Agreement Builder helps you document the handful of rules that must match across both homes, with both parents contributing and approving — so the debate happens once, not every week.',
    ctaLink: '/features',
    ctaLinkText: 'Learn About Agreement Builder',
    ctaGradient: 'from-cg-sage-subtle to-cg-amber-subtle',
  },
  {
    slug: 'summer-break-coparenting-guide',
    title: 'Summer Break Co-Parenting: A Sanity-Saving Guide for Two Homes',
    excerpt: 'No school, camp sign-ups, vacation requests, and ten open weeks to fill across two homes. How to plan a summer your kids will remember for the right reasons — without a single scheduling standoff.',
    category: 'Scheduling',
    categoryColor: 'amber',
    author: 'CommonGround Team',
    date: '2026-07-03',
    readTime: '8 min read',
    featured: true,
    image: '/images/blog/blog_summerbreak.jpg',
    metaDescription: 'A practical summer co-parenting guide: switching to a summer custody schedule, dividing vacation weeks fairly, travel notice and itineraries, splitting camp costs, and keeping routines steady across two homes.',
    relatedPosts: ['holiday-custody-planning', 'custody-schedule-types-guide'],
    ctaTitle: 'Make this summer run itself',
    ctaDescription: 'CommonGround puts the whole summer — vacation blocks, camp weeks, exchanges, and reminders — on one shared calendar both parents see, so the plan you agreed to is the plan that happens.',
    ctaLink: '/features',
    ctaLinkText: 'See How TimeBridge Works',
    ctaGradient: 'from-cg-amber-subtle to-cg-sage-subtle',
  },
  {
    slug: '10-coparenting-best-practices',
    title: '10 Co-Parenting Best Practices That Actually Work',
    excerpt: 'The difference between co-parenting that drains you and co-parenting that works often comes down to a handful of habits. Here are 10 that actually hold up under pressure.',
    category: 'Co-Parenting Tips',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2026-03-10',
    readTime: '8 min read',
    featured: true,
    image: '/images/blog/blog_bestpractices.jpg',
    metaDescription: '10 proven co-parenting strategies that reduce conflict and put children first. Practical tips for communication, boundaries, and cooperation after separation.',
    relatedPosts: ['communication-tool-for-progress', 'why-written-agreements-matter'],
    ctaTitle: 'Ready to improve your co-parenting communication?',
    ctaDescription: 'CommonGround helps you put these practices into action with structured messaging, shared calendars, and AI-powered communication assistance.',
    ctaLink: '/register',
    ctaLinkText: 'Get Started Free',
    ctaGradient: 'from-cg-sage-subtle to-cg-amber-subtle',
  },
  {
    slug: 'communication-tool-for-progress',
    title: 'Using Communication as a Tool for Progress, Not Conflict',
    excerpt: 'Most co-parenting fights start with a single text. Learn the communication shifts that turn loaded messages into steady progress — and keep your kids out of the middle.',
    category: 'Communication',
    categoryColor: 'amber',
    author: 'CommonGround Team',
    date: '2026-03-04',
    readTime: '10 min read',
    featured: true,
    image: '/images/blog/blog_communication.jpg',
    metaDescription: 'Transform your co-parenting communication from conflict to cooperation. Learn intentional messaging strategies that protect your children and reduce stress.',
    relatedPosts: ['10-coparenting-best-practices', 'managing-high-conflict-coparenting'],
    ctaTitle: 'Need help with difficult conversations?',
    ctaDescription: 'ARIA, our AI communication assistant, helps you phrase messages in ways that reduce conflict while keeping your meaning intact.',
    ctaLink: '/aria',
    ctaLinkText: 'Learn About ARIA',
    ctaGradient: 'from-cg-amber-subtle to-cg-sage-subtle',
  },
  {
    slug: 'why-written-agreements-matter',
    title: 'Why Written Agreements Matter in Co-Parenting',
    excerpt: 'A handshake deal falls apart the moment two memories differ. See why a clear written agreement is the quiet secret to fewer disputes and a calmer household.',
    category: 'Agreements',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2026-02-24',
    readTime: '7 min read',
    featured: true,
    image: '/images/blog/blog_agreements.jpg',
    metaDescription: 'Why documented co-parenting agreements prevent misunderstandings, reduce court disputes, and create stability. Learn how to build a comprehensive parenting plan.',
    relatedPosts: ['10-coparenting-best-practices', 'putting-children-first'],
    ctaTitle: 'Ready to create your comprehensive agreement?',
    ctaDescription: "CommonGround's 18-section Agreement Builder walks you through everything you need to cover, with both parents contributing and approving.",
    ctaLink: '/features',
    ctaLinkText: 'Learn About Agreement Builder',
    ctaGradient: 'from-cg-sage-subtle to-cg-slate-subtle',
  },
  {
    slug: 'managing-high-conflict-coparenting',
    title: 'Managing High-Conflict Co-Parenting: A Survival Guide',
    excerpt: 'When every exchange feels like a battle, strategy matters more than willpower. A practical playbook for protecting your peace — and your kids — without escalating.',
    category: 'High-Conflict',
    categoryColor: 'red',
    author: 'CommonGround Team',
    date: '2026-02-16',
    readTime: '12 min read',
    featured: false,
    image: '/images/blog/blog_highconflict.jpg',
    metaDescription: 'A practical survival guide for co-parenting with a difficult ex. Strategies for protecting yourself and your children while maintaining court-ready documentation.',
    relatedPosts: ['communication-tool-for-progress', 'why-written-agreements-matter'],
    ctaTitle: 'Need better documentation for your situation?',
    ctaDescription: 'CommonGround provides court-ready documentation of all communications, schedules, and agreements. ARIA helps you maintain composure under pressure.',
    ctaLink: '/register',
    ctaLinkText: 'Get Started Free',
    ctaGradient: 'from-cg-slate-subtle to-cg-sage-subtle',
  },
  {
    slug: 'putting-children-first',
    title: 'Putting Children First: What It Really Means',
    excerpt: '"Put the kids first" is easy to say and hard to live. Here is what it actually looks like in the daily decisions that quietly shape your child\'s world.',
    category: 'Parenting',
    categoryColor: 'amber',
    author: 'CommonGround Team',
    date: '2026-02-06',
    readTime: '9 min read',
    featured: false,
    image: '/images/blog/blog_childrenfirst.jpg',
    metaDescription: "What 'putting children first' actually means in co-parenting — beyond the phrase. Practical actions that prioritize your child's wellbeing during and after separation.",
    relatedPosts: ['10-coparenting-best-practices', 'managing-high-conflict-coparenting'],
    ctaTitle: 'Ready to put your children first?',
    ctaDescription: "CommonGround helps you maintain focus on what matters most—your children's wellbeing—with tools designed to reduce conflict and improve cooperation.",
    ctaLink: '/register',
    ctaLinkText: 'Get Started Free',
    ctaGradient: 'from-cg-amber-subtle to-cg-sage-subtle',
  },
  {
    slug: 'holiday-custody-planning',
    title: 'Holiday Custody Planning: Creating Joy Instead of Stress',
    excerpt: "Two homes don't have to mean half a holiday. Plan ahead the right way and turn custody schedules into traditions your kids actually look forward to.",
    category: 'Scheduling',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2026-01-28',
    readTime: '8 min read',
    featured: false,
    image: '/images/blog/blog_holiday.jpg',
    metaDescription: 'Navigate holiday custody schedules without stress. Tips for fair planning, managing expectations, and creating joyful celebrations across two homes.',
    relatedPosts: ['why-written-agreements-matter', 'putting-children-first'],
    ctaTitle: 'Need help with holiday scheduling?',
    ctaDescription: "CommonGround's shared calendar and Agreement Builder help you create clear holiday plans that both parents can reference year after year.",
    ctaLink: '/register',
    ctaLinkText: 'Get Started Free',
    ctaGradient: 'from-cg-sage-subtle to-cg-amber-subtle',
  },
  {
    slug: 'custody-schedule-types-guide',
    title: 'Custody Schedule Types: How to Choose the Right One',
    excerpt: 'Week-on/week-off, 2-2-3, every-other-weekend — the options blur together fast. Here is a plain-language guide to the most common custody schedules and how to pick the one that fits your child.',
    category: 'Scheduling',
    categoryColor: 'amber',
    author: 'CommonGround Team',
    date: '2026-06-16',
    readTime: '8 min read',
    featured: true,
    image: '/images/blog/blog_schedule.jpg',
    metaDescription: 'A plain-language guide to custody schedule types — week-on/week-off, 2-2-3, 2-2-5-5, 3-4-4-3, every-other-weekend, and 80/20 — plus how to choose the right one for your child.',
    relatedPosts: ['holiday-custody-planning', 'helping-kids-thrive-two-homes'],
    ctaTitle: 'Ready to set a schedule that sticks?',
    ctaDescription: 'CommonGround turns your custody schedule into shared calendars and automatic pickup and drop-off reminders, so neither parent can forget whose day it is.',
    ctaLink: '/features',
    ctaLinkText: 'See How TimeBridge Works',
    ctaGradient: 'from-cg-amber-subtle to-cg-sage-subtle',
  },
  {
    slug: 'splitting-child-expenses-fairly',
    title: 'How to Split Child Expenses Without Starting a Fight',
    excerpt: 'Money is the number-one flashpoint in co-parenting — but it does not have to be. Here is how to share costs fairly, document them cleanly, and stop the reimbursement battles for good.',
    category: 'Agreements',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2026-06-11',
    readTime: '8 min read',
    featured: true,
    image: '/images/blog/blog_expenses.jpg',
    metaDescription: 'Learn how to split child expenses fairly: base support vs shared costs, 50/50 vs income-proportional splits, pre-approval rules, documentation, and what to do when the other parent will not pay.',
    relatedPosts: ['why-written-agreements-matter', '10-coparenting-best-practices'],
    ctaTitle: 'Stop chasing reimbursements',
    ctaDescription: 'ClearFund logs every shared expense, splits it by your agreed percentages, sends the reminders, and keeps a clean record — so money never becomes the fight.',
    ctaLink: '/features',
    ctaLinkText: 'Learn About ClearFund',
    ctaGradient: 'from-cg-sage-subtle to-cg-amber-subtle',
  },
  {
    slug: 'coparenting-with-a-difficult-ex',
    title: 'Co-Parenting With a Difficult Ex: A Practical Playbook',
    excerpt: 'When every text feels like a trap, strategy beats willpower. Grey rock, parallel parenting, BIFF replies, and boundaries that actually hold — a calm playbook for the hardest co-parenting situations.',
    category: 'High-Conflict',
    categoryColor: 'red',
    author: 'CommonGround Team',
    date: '2026-06-05',
    readTime: '9 min read',
    featured: false,
    image: '/images/blog/blog_difficultex.jpg',
    metaDescription: 'A practical playbook for co-parenting with a difficult or high-conflict ex: the grey rock method, parallel parenting, BIFF responses, boundaries, documentation, and when to bring in professionals.',
    relatedPosts: ['managing-high-conflict-coparenting', 'communication-tool-for-progress'],
    ctaTitle: 'Keep every message calm and on the record',
    ctaDescription: 'ARIA flags hostile or manipulative messages, suggests a calmer rewrite, and keeps a timestamped record — so you can stay composed and protected under pressure.',
    ctaLink: '/aria',
    ctaLinkText: 'Learn About ARIA',
    ctaGradient: 'from-cg-sage-subtle to-cg-slate-subtle',
  },
  {
    slug: 'helping-kids-thrive-two-homes',
    title: 'Helping Kids Thrive Across Two Homes',
    excerpt: 'Kids do not need two identical houses to feel safe — they need to feel loved and secure in each one. Practical, reassuring ways to ease transitions and help your child thrive in both homes.',
    category: 'Parenting',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2026-05-28',
    readTime: '8 min read',
    featured: false,
    image: '/images/blog/blog_twohomes.jpg',
    metaDescription: 'How to help children thrive across two homes: easing transition days, aligning the big rules, keeping kids out of adult conflict, staying connected, age-by-age tips, and signs to seek support.',
    relatedPosts: ['putting-children-first', 'custody-schedule-types-guide'],
    ctaTitle: 'Help your kids stay connected to both homes',
    ctaDescription: 'KidSpace lets children safely video-call the other parent — and approved grandparents — during the other household&apos;s time, so connection never has to wait for the calendar.',
    ctaLink: '/kidspace',
    ctaLinkText: 'Explore KidSpace',
    ctaGradient: 'from-cg-sage-subtle to-cg-amber-subtle',
  },
  {
    slug: 'fathers-mental-health-awareness-month',
    title: "Men's Mental Health Awareness Month: Why a Father's Mental Health Matters",
    excerpt: 'June is Men’s Mental Health Awareness Month, and fathers are often the last to ask for help. The signs that get missed, why your mental health shapes your kids, and how to take the first step.',
    category: 'Family Wellness',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2026-06-06',
    readTime: '8 min read',
    featured: false,
    image: '/images/blog/blog_fathers_mentalhealth.jpg',
    metaDescription: 'For Men’s Mental Health Awareness Month: how depression, anxiety, and burnout show up in fathers, why a dad’s mental health shapes his kids, the weight separated dads carry, and how to ask for help.',
    relatedPosts: ['fathers-mental-health-self-care', 'coparenting-with-a-difficult-ex'],
    ctaTitle: 'Less conflict means more headspace',
    ctaDescription: 'A huge share of a separated dad’s daily stress is co-parenting friction. CommonGround keeps messages calm, automates the schedule, and takes the fight out of expenses — freeing up bandwidth for your wellbeing and your kids.',
    ctaLink: '/features',
    ctaLinkText: 'See How CommonGround Helps',
    ctaGradient: 'from-cg-sage-subtle to-cg-amber-subtle',
  },
  {
    slug: 'fathers-mental-health-self-care',
    title: 'Ways to Take Care of Your Mental Health as a Father',
    excerpt: 'A practical, no-nonsense guide for dads: the basics that move the needle, protecting your own time without guilt, beating isolation, and lifting the daily co-parenting load that wears you down.',
    category: 'Family Wellness',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2026-06-18',
    readTime: '8 min read',
    featured: true,
    image: '/images/blog/blog_father_selfcare.jpg',
    metaDescription: 'Practical mental-health self-care for fathers: sleep, movement, protecting your time, staying connected, managing stress, talking about it, setting boundaries with a co-parent, and being present with your kids.',
    relatedPosts: ['fathers-mental-health-awareness-month', 'coparenting-with-a-difficult-ex'],
    ctaTitle: 'Take some weight off your plate',
    ctaDescription: 'Fewer co-parenting fires means more energy for your health and your kids. CommonGround keeps communication calm, handles the schedule, and keeps you connected to your children — so a single text never wrecks your day.',
    ctaLink: '/register',
    ctaLinkText: 'Get Started Free',
    ctaGradient: 'from-cg-amber-subtle to-cg-sage-subtle',
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}

export function getRelatedPosts(slugs: string[]): BlogPost[] {
  return slugs
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is BlogPost => post !== undefined);
}

export function formatDate(dateString: string): string {
  // Date-only strings parse as UTC midnight; format in UTC so the displayed
  // day matches the stored date instead of shifting back in western timezones.
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function getCategoryStyles(color: BlogPost['categoryColor']): string {
  const styles: Record<BlogPost['categoryColor'], string> = {
    sage: 'bg-cg-sage-subtle text-cg-sage',
    amber: 'bg-cg-amber-subtle text-cg-amber',
    slate: 'bg-cg-slate-subtle text-cg-slate',
    red: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400',
  };
  return styles[color];
}
