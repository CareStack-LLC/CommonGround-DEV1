/**
 * Shared CTA class strings for the marketing surface.
 *
 * Plain string constants (server-safe, zero runtime) so every primary CTA
 * uses the SAME teal + hover shade — before this, five different "darker
 * teal" hover values were in circulation (#2F8C70, var(--cg-sage-dark), #2E9577,
 * #34967a, #35957A) and the header hovered LIGHTER. Canonical pair:
 * bg-cg-sage / hover:bg-cg-sage-dark (var(--cg-sage) → var(--cg-sage-dark)).
 *
 * The hover lift (`motion-safe:hover:-translate-y-0.5`) is suppressed for
 * users who prefer reduced motion.
 */

const ctaBaseClasses =
  'inline-flex items-center justify-center rounded-full px-6 py-3 ' +
  'text-sm sm:text-base font-semibold transition-all duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

/** Solid teal primary CTA — the default conversion button everywhere. */
export const ctaPrimaryClasses =
  `${ctaBaseClasses} bg-cg-sage text-white shadow-sm ` +
  'hover:bg-cg-sage-dark hover:shadow-md motion-safe:hover:-translate-y-0.5 ' +
  'focus-visible:ring-cg-sage';

/** White pill with subtle border — the standard secondary CTA. */
export const ctaSecondaryClasses =
  `${ctaBaseClasses} border-2 border-foreground/10 bg-white text-foreground ` +
  'hover:border-cg-sage hover:text-cg-sage focus-visible:ring-cg-sage';
