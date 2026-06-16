/**
 * Blog Post Data
 *
 * Centralized data for all blog posts. The dynamic [slug] route uses this
 * for static generation and metadata.
 */

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
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
