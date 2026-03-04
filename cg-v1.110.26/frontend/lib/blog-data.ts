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
    excerpt: 'Practical strategies for building a healthy co-parenting relationship, from communication tips to boundary setting.',
    category: 'Co-Parenting Tips',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2025-01-06',
    readTime: '8 min read',
    featured: true,
    image: '/images/blog/image1.png',
    metaDescription: 'Practical strategies for building a healthy co-parenting relationship, from communication tips to boundary setting.',
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
    excerpt: 'Learn how intentional communication strategies can transform your co-parenting relationship and benefit your children.',
    category: 'Communication',
    categoryColor: 'amber',
    author: 'CommonGround Team',
    date: '2025-01-04',
    readTime: '10 min read',
    featured: true,
    image: '/images/blog/image2.png',
    metaDescription: 'Learn how intentional communication strategies can transform your co-parenting relationship and benefit your children.',
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
    excerpt: 'Discover how clear, documented agreements prevent misunderstandings and create stability for your children.',
    category: 'Agreements',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2025-01-02',
    readTime: '7 min read',
    featured: true,
    image: '/images/blog/image3.png',
    metaDescription: 'Discover how clear, documented agreements prevent misunderstandings and create stability for your children.',
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
    excerpt: 'Strategies for protecting yourself and your children when co-parenting with a difficult ex-partner.',
    category: 'High-Conflict',
    categoryColor: 'red',
    author: 'CommonGround Team',
    date: '2024-12-28',
    readTime: '12 min read',
    featured: false,
    image: '/images/blog/image4.png',
    metaDescription: 'Strategies for protecting yourself and your children when co-parenting with a difficult ex-partner.',
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
    excerpt: "Moving beyond the phrase to practical actions that genuinely prioritize your children's wellbeing.",
    category: 'Parenting',
    categoryColor: 'amber',
    author: 'CommonGround Team',
    date: '2024-12-24',
    readTime: '9 min read',
    featured: false,
    image: '/images/blog/image5.png',
    metaDescription: "Moving beyond the phrase to practical actions that genuinely prioritize your children's wellbeing during and after separation.",
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
    excerpt: 'Tips for navigating holiday schedules, managing expectations, and making celebrations special for everyone.',
    category: 'Scheduling',
    categoryColor: 'sage',
    author: 'CommonGround Team',
    date: '2024-12-20',
    readTime: '8 min read',
    featured: false,
    image: '/images/blog/image6.png',
    metaDescription: 'Tips for navigating holiday schedules, managing expectations, and making celebrations special for everyone.',
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
