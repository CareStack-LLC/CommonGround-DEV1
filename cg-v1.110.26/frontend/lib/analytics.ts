/**
 * Google Analytics event tracking for CommonGround.
 *
 * Tracks key conversion and engagement events to understand
 * how leads become paying users.
 *
 * GA Property: G-Y3BC0JNN56
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function gtag(...args: any[]) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

// ─── Registration & Auth ───────────────────────────────────────

/** User started the registration form */
export function trackSignupStarted(method: 'email' | 'google' = 'email') {
  gtag('event', 'sign_up_started', { method });
}

/** User completed registration */
export function trackSignupCompleted(method: 'email' | 'google' = 'email') {
  gtag('event', 'sign_up', { method });
}

/** User logged in */
export function trackLogin(method: 'email' | 'google' = 'email') {
  gtag('event', 'login', { method });
}

// ─── Subscription & Payment ────────────────────────────────────

/** User viewed pricing page */
export function trackViewPricing() {
  gtag('event', 'view_pricing', { content_type: 'pricing_page' });
}

/** User clicked a plan's CTA (start of checkout) */
export function trackBeginCheckout(plan: string, value?: number) {
  gtag('event', 'begin_checkout', {
    currency: 'USD',
    value: value || 0,
    items: [{ item_name: plan }],
  });
}

/** User completed subscription purchase */
export function trackPurchase(plan: string, value: number) {
  gtag('event', 'purchase', {
    currency: 'USD',
    value,
    items: [{ item_name: plan }],
  });
}

// ─── Lead Capture ──────────────────────────────────────────────

/** Newsletter signup */
export function trackNewsletterSignup(source: string) {
  gtag('event', 'generate_lead', {
    currency: 'USD',
    value: 1,
    lead_type: 'newsletter',
    source,
  });
}

/** Early adopter signup */
export function trackEarlyAdopterSignup(source: string) {
  gtag('event', 'generate_lead', {
    currency: 'USD',
    value: 5,
    lead_type: 'early_adopter',
    source,
  });
}

/** Professional demo request */
export function trackDemoRequest(role: string, source: string) {
  gtag('event', 'generate_lead', {
    currency: 'USD',
    value: 25,
    lead_type: 'professional_demo',
    role,
    source,
  });
}

/** Contact form submission */
export function trackContactForm(inquiryType: string) {
  gtag('event', 'generate_lead', {
    currency: 'USD',
    value: 5,
    lead_type: 'contact_form',
    inquiry_type: inquiryType,
  });
}

/** Partnership inquiry from grant-partnership page */
export function trackPartnershipInquiry(orgType: string, source: string) {
  gtag('event', 'generate_lead', {
    currency: 'USD',
    value: 50,
    lead_type: 'partnership_inquiry',
    org_type: orgType,
    source,
  });
}

// ─── Feature Engagement (shows product stickiness) ─────────────

/** User invited co-parent */
export function trackInviteCoParent() {
  gtag('event', 'invite_coparent', { engagement_type: 'activation' });
}

/** User sent first message */
export function trackFirstMessage() {
  gtag('event', 'first_message', { engagement_type: 'activation' });
}

/** User created first agreement */
export function trackAgreementCreated() {
  gtag('event', 'agreement_created', { engagement_type: 'activation' });
}

/** User scheduled custody exchange */
export function trackExchangeScheduled() {
  gtag('event', 'exchange_scheduled', { engagement_type: 'activation' });
}

/** User submitted an expense */
export function trackExpenseSubmitted() {
  gtag('event', 'expense_submitted', { engagement_type: 'activation' });
}

// ─── Content Engagement ────────────────────────────────────────

/** User read a blog post */
export function trackBlogRead(slug: string, category: string, source?: string, medium?: string, campaign?: string) {
  gtag('event', 'view_item', {
    content_type: 'blog_post',
    item_id: slug,
    item_category: category,
    ...(source && { traffic_source: source }),
    ...(medium && { traffic_medium: medium }),
    ...(campaign && { traffic_campaign: campaign }),
  });
}

/** Track blog page view with full attribution */
export function trackBlogPageView(slug: string) {
  gtag('event', 'page_view', {
    page_title: `Blog: ${slug}`,
    page_location: window.location.href,
    content_group: 'blog',
  });
}

/** User shared content */
export function trackShare(contentType: string, itemId: string) {
  gtag('event', 'share', { content_type: contentType, item_id: itemId });
}

// ─── Page-level tracking ───────────────────────────────────────

/** Generic CTA click */
export function trackCTAClick(ctaName: string, location: string) {
  gtag('event', 'cta_click', { cta_name: ctaName, location });
}

/** Track which marketing page sections users scroll to */
export function trackSectionView(pageName: string, sectionName: string) {
  gtag('event', 'section_view', { page: pageName, section: sectionName });
}

/** Professional onboarding signup */
export function trackProfessionalSignup(role: string) {
  gtag('event', 'professional_signup', {
    engagement_type: 'activation',
    role,
  });
}

// ─── Section Tracking Helper ──────────────────────────────────

const trackedSections = new Set<string>();

/**
 * Set up IntersectionObserver for marketing page sections.
 * Call once on mount, returns cleanup function.
 *
 * Usage:
 *   useEffect(() => setupSectionTracking('homepage'), []);
 *
 * Tracks any element with data-section="sectionName" attribute.
 */
export function setupSectionTracking(pageName: string): () => void {
  if (typeof window === 'undefined') return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const section = (entry.target as HTMLElement).dataset.section;
          if (section) {
            const key = `${pageName}:${section}`;
            if (!trackedSections.has(key)) {
              trackedSections.add(key);
              trackSectionView(pageName, section);
            }
          }
        }
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll('[data-section]').forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}
