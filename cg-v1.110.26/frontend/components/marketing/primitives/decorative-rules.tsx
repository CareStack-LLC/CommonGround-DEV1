/**
 * DecorativeRules
 *
 * The subtle hairline-rule background treatment from the home and about
 * heroes, extracted so every major marketing page can share it. Renders
 * 2–3 horizontal rules at 3% opacity inside an absolutely-positioned
 * layer — the parent section must be `relative overflow-hidden`, and
 * sibling content should be `relative` so it stacks above.
 *
 * Server component, zero JS.
 */

export interface DecorativeRulesProps {
  /** hero = 2 rules near the top; section = 3 rules spread vertically */
  variant?: 'hero' | 'section';
}

export function DecorativeRules({ variant = 'hero' }: DecorativeRulesProps) {
  return (
    <div aria-hidden="true" className="absolute inset-0 opacity-[0.03]">
      {variant === 'hero' ? (
        <>
          <div className="absolute top-32 left-0 w-full h-px bg-cg-amber" />
          <div className="absolute top-64 right-0 w-3/4 h-px bg-cg-sage" />
        </>
      ) : (
        <>
          <div className="absolute top-20 left-0 w-full h-px bg-cg-amber" />
          <div className="absolute top-40 right-0 w-2/3 h-px bg-cg-sage" />
          <div className="absolute bottom-40 left-0 w-1/2 h-px bg-cg-amber" />
        </>
      )}
    </div>
  );
}
