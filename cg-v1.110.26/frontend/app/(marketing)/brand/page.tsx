import type { Metadata } from 'next';
import { BrandIcon } from '@/components/brand/brand-icon';

export const metadata: Metadata = {
  title: 'Brand Guide | CommonGround',
  description:
    "CommonGround's living brand guide — logo, color, typography, the custom icon set, and imagery. Quietly modern. Emotionally safe. Court-credible.",
  alternates: { canonical: '/brand' },
  robots: { index: false, follow: false },
};

const CORE = [
  { hex: 'var(--cg-sage)', name: 'Calm Teal', token: '--primary', note: 'Trust · primary · Parent A', ink: '#FFFFFF' },
  { hex: 'var(--cg-slate)', name: 'Ocean Blue', token: '--secondary', note: 'Stability · Parent B · pro', ink: '#FFFFFF' },
  { hex: 'var(--cg-amber)', name: 'Child Gold', token: '--cg-amber', note: 'The child · warmth · the arch', ink: 'var(--foreground)' },
  { hex: 'var(--foreground)', name: 'Deep Navy', token: '--foreground', note: 'Headings · authority · ink', ink: '#FFFFFF' },
  { hex: 'var(--background)', name: 'Soft White', token: '--background', note: 'App background', ink: 'var(--foreground)' },
  { hex: '#FFFFFF', name: 'Pure White', token: '--card', note: 'Cards · surfaces', ink: 'var(--foreground)' },
];

const SUPPORT = [
  { hex: 'var(--cg-sage-light)', name: 'Soft Teal', ink: 'var(--foreground)' },
  { hex: 'var(--cg-slate-light)', name: 'Sky Blue', ink: 'var(--foreground)' },
  { hex: 'var(--cg-sage-subtle)', name: 'Teal wash', ink: 'var(--foreground)' },
  { hex: 'var(--cg-slate-subtle)', name: 'Blue wash', ink: 'var(--foreground)' },
  { hex: 'var(--cg-amber-subtle)', name: 'Gold wash', ink: 'var(--foreground)' },
  { hex: 'var(--border)', name: 'Border', ink: 'var(--foreground)' },
];

const STATUS = [
  { hex: 'var(--cg-sage)', name: 'Success', ink: '#FFFFFF' },
  { hex: 'var(--cg-amber)', name: 'Warning', ink: 'var(--foreground)' },
  { hex: 'var(--cg-error)', name: 'Error', ink: '#FFFFFF' },
  { hex: '#0284C7', name: 'Info', ink: '#FFFFFF' },
];

const ICON_GROUPS: { title: string; icons: { name: string; label: string }[] }[] = [
  {
    title: 'Brand',
    icons: [
      { name: 'logo-glyph', label: 'Mark' },
      { name: 'parents', label: 'Parents' },
      { name: 'child', label: 'Child' },
      { name: 'mycircle', label: 'My Circle' },
      { name: 'heart', label: 'Care' },
      { name: 'handshake', label: 'Collaboration' },
    ],
  },
  {
    title: 'Features',
    icons: [
      { name: 'aria', label: 'ARIA' },
      { name: 'timebridge', label: 'TimeBridge' },
      { name: 'clearfund', label: 'ClearFund' },
      { name: 'kidcoms', label: 'KidComs' },
      { name: 'kidspace', label: 'KidSpace' },
      { name: 'safespace', label: 'SafeSpace' },
      { name: 'freshstart', label: 'FreshStart' },
      { name: 'agreement', label: 'Agreement' },
      { name: 'exchange', label: 'Exchange' },
      { name: 'familyfile', label: 'Family Files' },
      { name: 'schedule', label: 'Schedule' },
      { name: 'custody', label: 'Custody' },
      { name: 'wallet', label: 'Child Wallet' },
    ],
  },
  {
    title: 'Portals',
    icons: [
      { name: 'professional', label: 'Professional' },
      { name: 'court', label: 'Court' },
      { name: 'compliance', label: 'Compliance' },
      { name: 'export', label: 'Court Export' },
    ],
  },
  {
    title: 'UI',
    icons: [
      { name: 'messages', label: 'Messages' },
      { name: 'video-call', label: 'Video Call' },
      { name: 'checkin', label: 'GPS Check-in' },
      { name: 'notifications', label: 'Notifications' },
      { name: 'settings', label: 'Settings' },
      { name: 'security', label: 'Security' },
      { name: 'privacy', label: 'Privacy' },
    ],
  },
];

const serif = { fontFamily: 'var(--font-serif)' } as const;

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14 border-t border-border">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cg-sage">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl md:text-4xl text-foreground" style={serif}>
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function BrandPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero */}
      <header className="mx-auto max-w-6xl px-6 pt-16 pb-10 text-center">
        <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-[26px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="CommonGround logo" width={92} height={92} />
        </div>
        <h1 className="text-4xl md:text-6xl leading-[1.05] tracking-[-0.02em]" style={serif}>
          CommonGround Brand Guide
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#4A4A47]">
          Quietly modern. Emotionally safe. Court-credible. Every color, image,
          and icon exists to lower the temperature for families in conflict.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="rounded-full bg-cg-sage-subtle px-4 py-1.5 font-medium text-cg-sage-dark">
            Version 1.0
          </span>
          <span className="rounded-full bg-cg-slate-subtle px-4 py-1.5 font-medium text-cg-slate">
            Light-locked
          </span>
          <span className="rounded-full bg-cg-amber-subtle px-4 py-1.5 font-medium text-cg-amber-deep">
            30 brand icons
          </span>
        </div>
      </header>

      {/* Logo */}
      <Section eyebrow="Identity" title="The logo is a family">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white p-8">
            <div className="flex h-40 items-center justify-center rounded-xl bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="Primary mark" width={120} height={120} />
            </div>
            <p className="mt-4 text-sm text-[#4A4A47]">
              Two parents — <span className="font-semibold text-cg-sage">teal</span> and{' '}
              <span className="font-semibold text-cg-slate">ocean blue</span> — held together by a{' '}
              <span className="font-semibold text-[#C98A12]">gold arch</span> above their{' '}
              <span className="font-semibold text-[#C98A12]">child</span>.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-8">
            <div className="flex h-40 items-center justify-center gap-6 rounded-xl bg-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/icons/logo-glyph.svg" alt="Glyph on navy" width={64} height={64} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="Icon small" width={40} height={40} />
            </div>
            <p className="mt-4 text-sm text-[#4A4A47]">
              The <code className="rounded bg-background px-1">logo-glyph</code> works inline and on
              dark. Min 24px glyph / 32px full icon. Keep ¼-mark clear space.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-8">
            <p className="text-sm font-semibold text-cg-error">Don't</p>
            <ul className="mt-3 space-y-2 text-sm text-[#4A4A47]">
              <li>· Recolor the two parents to one hue</li>
              <li>· Make the arch or child anything but gold</li>
              <li>· Add gradients, bevels, or glassmorphism</li>
              <li>· Rotate, skew, or stretch the mark</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Color */}
      <Section eyebrow="Color" title="Semantic, never decorative">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CORE.map((c) => (
            <div key={c.hex} className="overflow-hidden rounded-2xl border border-border bg-white">
              <div
                className="flex h-24 items-end p-3"
                style={{ backgroundColor: c.hex, color: c.ink }}
              >
                <span className="text-xs font-mono">{c.hex}</span>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{c.token}</p>
                <p className="mt-1 text-xs text-[#4A4A47]">{c.note}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Supporting & tints
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {SUPPORT.map((c) => (
                <div key={c.hex} className="rounded-xl border border-border bg-white p-2">
                  <div className="h-12 rounded-lg" style={{ backgroundColor: c.hex }} />
                  <p className="mt-2 text-xs font-medium">{c.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{c.hex}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Status — earned, never emotional
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {STATUS.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ backgroundColor: c.hex, color: c.ink }}
                >
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="font-mono text-xs">{c.hex}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#4A4A47]">
              Red means <em>missed / failed / overdue</em> — a fact, never a judgment.
            </p>
          </div>
        </div>
      </Section>

      {/* Typography */}
      <Section eyebrow="Typography" title="Readable under stress">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              DM Serif Display · headings
            </p>
            <p className="mt-3 text-5xl leading-tight" style={serif}>
              A calmer way to co-parent
            </p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              DM Sans · body — 17px base, 1.6 line-height
            </p>
            <p className="mt-3 text-[17px] leading-[1.6] text-[#4A4A47]">
              We use larger sizes and generous spacing because our readers are
              often tired and anxious. Short sentences. Plain language. Warmth
              over cleverness.
            </p>
            <p className="mt-6 font-mono text-sm text-cg-slate">
              DM Mono · $1,240.00 · custody 57% / 43%
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Type scale
            </p>
            <div className="mt-4 space-y-2">
              {[
                ['4xl', '40', 'Hero'],
                ['3xl', '32', 'Page heading'],
                ['2xl', '26', 'Section'],
                ['xl', '22', 'Subhead'],
                ['lg', '19', 'Lead'],
                ['base', '17', 'Body'],
                ['sm', '15', 'Secondary'],
                ['xs', '13', 'Caption'],
              ].map(([tok, px, use]) => (
                <div key={tok} className="flex items-baseline gap-4 border-b border-[#EEF6F4] pb-1">
                  <span className="w-12 font-mono text-xs text-muted-foreground">{tok}</span>
                  <span className="w-10 font-mono text-xs text-muted-foreground">{px}px</span>
                  <span
                    className="truncate text-foreground"
                    style={{ fontSize: `${px}px`, lineHeight: 1.2 }}
                  >
                    {use}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Icons */}
      <Section eyebrow="Iconography" title="A custom set drawn from the mark">
        <p className="-mt-4 mb-8 max-w-2xl text-[15px] leading-relaxed text-[#4A4A47]">
          Duotone, brand-colored icons in the logo's rounded-line + gold-arch
          language. Use these for features, portals, and hero moments; keep Lucide
          for generic UI. Rendered via{' '}
          <code className="rounded bg-white px-1 py-0.5 text-cg-slate">&lt;BrandIcon /&gt;</code>.
        </p>
        <div className="space-y-8">
          {ICON_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
                {group.icons.map((icon) => (
                  <div
                    key={icon.name}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                  >
                    <BrandIcon name={icon.name as never} size={34} />
                    <span className="text-center text-[11px] leading-tight text-[#4A4A47]">
                      {icon.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Imagery */}
      <Section eyebrow="Imagery" title="Real, diverse families — actually okay">
        <div className="grid gap-6 md:grid-cols-2">
          <ul className="space-y-3 text-[15px] leading-relaxed text-[#4A4A47]">
            <li>
              <span className="font-semibold text-foreground">Real &amp; multicultural.</span> Diverse
              ages, ethnicities, and family shapes — deliberate, never tokenized.
            </li>
            <li>
              <span className="font-semibold text-foreground">Warm natural light.</span> Soft daylight,
              golden hour, teal-green shadows and warm highlights.
            </li>
            <li>
              <span className="font-semibold text-foreground">Candid, not stock-posed.</span> Genuine
              moments — a laugh, a piggyback, a relieved exhale.
            </li>
            <li>
              <span className="font-semibold text-foreground">Show the calm after.</span> No conflict,
              no courtrooms, no tears. Hopeful and bright.
            </li>
            <li>
              <span className="font-semibold text-foreground">Light-locked &amp; clean.</span> No dark or
              glass treatments, no baked-in text, no logos.
            </li>
          </ul>
          <div className="rounded-2xl border border-border bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Higgsfield style suffix
            </p>
            <p className="mt-3 rounded-xl bg-background p-4 text-[13px] italic leading-relaxed text-[#4A4A47]">
              Natural candid lifestyle photography, warm soft natural daylight,
              gentle film-like color grading with calm teal-green and warm golden
              tones, shallow depth of field, authentic and emotionally warm,
              hopeful reassuring mood, real diverse multicultural people, clean and
              airy, no text, no watermark, no logos, photorealistic.
            </p>
          </div>
        </div>
      </Section>

      <footer className="mx-auto max-w-6xl px-6 py-12 border-t border-border text-sm text-muted-foreground">
        Living document · maintained alongside{' '}
        <code className="text-cg-slate">globals.css</code>,{' '}
        <code className="text-cg-slate">design-tokens.ts</code>, and{' '}
        <code className="text-cg-slate">public/brand/icons</code>. See{' '}
        <code className="text-cg-slate">docs/brand/BRAND_GUIDE.md</code> for the full reference.
      </footer>
    </div>
  );
}
