import Image from 'next/image';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';
import {
  MessageSquare,
  Video,
  FileText,
  Calendar,
  DollarSign,
  Shield,
  Heart,
  Users,
  Scale,
  MapPin,
  Clock,
  Gavel,
  ArrowDown,
  CheckCircle,
  ChevronDown,
  Quote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare,
  Video,
  FileText,
  Calendar,
  DollarSign,
  Shield,
  Heart,
  Users,
  Scale,
  MapPin,
  Clock,
  Gavel,
};

export interface LandingPageTemplateProps {
  slug: string;
  heroLabel: string;
  headline: string;
  headlineAccent?: string;
  subheadline: string;
  ctaText: string;
  heroImageUrl?: string;
  heroImageAlt?: string;

  painPointsHeading: string;
  painPointsSubheading: string;
  painPoints: Array<{ old: string; cg: string }>;

  featuresLabel: string;
  featuresHeading: string;
  featuresSubheading: string;
  features: Array<{
    icon: string;
    name: string;
    tagline: string;
    description: string;
    accent: string;
  }>;

  testimonial: {
    quote: string;
    name: string;
    title: string;
    initial: string;
  };

  earlyAdopterLabel: string;
  earlyAdopterHeading: string;
  earlyAdopterSubheading: string;

  faqHeading: string;
  faqs: Array<{ q: string; a: string }>;
}

function renderHeadline(headline: string, accent?: string) {
  if (!accent || !headline.includes(accent)) {
    return headline;
  }
  const parts = headline.split(accent);
  return (
    <>
      {parts[0]}
      <span className="text-cg-sage">{accent}</span>
      {parts.slice(1).join(accent)}
    </>
  );
}

export function LandingPageTemplate({
  slug,
  heroLabel,
  headline,
  headlineAccent,
  subheadline,
  ctaText,
  heroImageUrl,
  heroImageAlt,
  painPointsHeading,
  painPointsSubheading,
  painPoints,
  featuresLabel,
  featuresHeading,
  featuresSubheading,
  features,
  testimonial,
  earlyAdopterLabel,
  earlyAdopterHeading,
  earlyAdopterSubheading,
  faqHeading,
  faqs,
}: LandingPageTemplateProps) {
  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden" data-section="hero">
        <div className="absolute inset-0 bg-gradient-to-b from-cg-sand via-cg-sand to-white" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-cg-slate/[0.04] blur-3xl -translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className={`grid ${heroImageUrl ? 'lg:grid-cols-2 gap-12 lg:gap-16 items-center' : 'gap-8 max-w-3xl mx-auto text-center'}`}>
            <div className={heroImageUrl ? '' : 'mx-auto'}>
              <p className="text-cg-slate font-medium mb-4 tracking-wide uppercase text-sm">
                {heroLabel}
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.4rem] text-foreground mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                {renderHeadline(headline, headlineAccent)}
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
                {subheadline}
              </p>
              <a
                href="#early-adopter"
                className="inline-flex items-center gap-2 bg-cg-sage text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-cg-sage-dark hover:shadow-lg hover:shadow-cg-sage/20 text-base"
              >
                {ctaText}
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>

            {heroImageUrl && (
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-cg-slate/10">
                  <Image
                    src={heroImageUrl}
                    alt={heroImageAlt || `CommonGround for ${slug}`}
                    width={800}
                    height={533}
                    className="w-full h-auto object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full border-2 border-cg-sage/30 -z-10" />
                <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-cg-amber/10 -z-10" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-20 lg:py-28 bg-white" data-section="pain-points">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              {painPointsHeading}
            </h2>
            <p className="text-gray-600 text-lg">{painPointsSubheading}</p>
          </div>

          <div className="space-y-6">
            {painPoints.map((point, i) => (
              <div
                key={i}
                className="group relative bg-cg-sand rounded-2xl p-6 sm:p-8 border border-transparent hover:border-cg-sage/20 transition-colors duration-300"
              >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                  <div className="flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2 block">
                      The reality
                    </span>
                    <p className="text-gray-600 line-through decoration-[#E85D75]/40 decoration-2">
                      {point.old}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center">
                    <div className="w-8 h-px bg-cg-sage/40" />
                    <CheckCircle className="w-5 h-5 text-cg-sage mx-1 flex-shrink-0" />
                    <div className="w-8 h-px bg-cg-sage/40" />
                  </div>
                  <div className="sm:hidden flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cg-sage" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-cg-sage">
                      With CommonGround
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="hidden sm:block text-xs font-semibold uppercase tracking-wider text-cg-sage mb-2">
                      With CommonGround
                    </span>
                    <p className="text-foreground font-medium">{point.cg}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-cg-sand" data-section="features">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-cg-sage font-medium mb-3 tracking-wide uppercase text-sm">
              {featuresLabel}
            </p>
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              {featuresHeading}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {featuresSubheading}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature) => {
              const Icon = ICON_MAP[feature.icon] || MessageSquare;
              return (
                <div
                  key={feature.name}
                  className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${feature.accent}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: feature.accent }} />
                  </div>
                  <span
                    className="inline-block text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: feature.accent }}
                  >
                    {feature.name}
                  </span>
                  <h3
                    className="text-xl text-foreground mb-3"
                    style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                  >
                    {feature.tagline}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-[15px]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-20 lg:py-24 bg-cg-sand" data-section="testimonial">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100">
            <Quote className="w-10 h-10 text-cg-sage/20 mb-6" />
            <blockquote
              className="text-xl sm:text-2xl text-foreground leading-relaxed mb-8"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              {testimonial.quote}
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cg-slate/10 flex items-center justify-center">
                <span className="text-cg-slate font-semibold text-lg">
                  {testimonial.initial}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-gray-600">{testimonial.title}</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-tr-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full border-2 border-cg-amber/10" />
            </div>
          </div>
        </div>
      </section>

      {/* EARLY ADOPTER CTA */}
      <section id="early-adopter" className="py-20 lg:py-28 bg-white scroll-mt-20" data-section="cta">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-cg-amber font-medium mb-3 tracking-wide uppercase text-sm">
              {earlyAdopterLabel}
            </p>
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              {earlyAdopterHeading}
            </h2>
            <p className="text-gray-600 text-lg">{earlyAdopterSubheading}</p>
          </div>
          <EarlyAdopterForm source={slug.replace(/-/g, '_')} />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-24 bg-cg-sand" data-section="faq">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="text-3xl sm:text-4xl text-foreground mb-12 text-center"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            {faqHeading}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="font-semibold text-foreground text-left">{faq.q}</h3>
                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 -mt-1">
                  <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
          <div className="text-center mt-14">
            <a
              href="#early-adopter"
              className="inline-flex items-center gap-2 text-cg-sage font-semibold hover:text-cg-sage-dark transition-colors"
            >
              <Shield className="w-4 h-4" />
              Claim your early adopter spot
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
