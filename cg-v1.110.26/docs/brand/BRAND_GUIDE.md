# CommonGround — Brand Guide

**Version 1.0 · June 2026 · Living source of truth**

> **Design philosophy:** *Quietly modern. Emotionally safe. Court-credible.*

CommonGround is an AI-powered co-parenting operating system. Our users arrive
stressed, often mid-conflict, and sometimes afraid. Every visual decision exists
to lower the temperature: warm over cold, calm over loud, human over corporate.
Nothing decorative — every color, every image, every icon has a job.

This document is the canonical reference. The values here are mirrored in code:

| Concern | Source of truth in the app |
|---|---|
| Colors (light + dark) | `frontend/app/globals.css` `:root` / `.dark` |
| Design tokens (TS) | `frontend/lib/design-tokens.ts` |
| Fonts | `frontend/app/layout.tsx` (`next/font/google`) |
| Logo | `frontend/app/icon.svg` |
| Custom icon set | `frontend/public/brand/icons/` + `index.json` |
| Live style guide | `/brand` route (in-app) |
| Report / email brand CSS | `backend/app/templates/reports/base/_brand.css` |

If this guide and the code ever disagree, **the code wins** — then fix this guide.

---

## 1. The Logo

Our mark is a family, told in three moves:

- **Two parents** — a teal head (left) and an ocean-blue head (right), each with
  a soft smile curve. Different colors, equal weight. Neither parent is primary.
- **A golden arch** — rising between them. It is the bridge, the shared roof, the
  thing they build together. Gold is always the child's color, so the arch is the
  child held up by both.
- **The child** — a gold circle with its own smile, centered and below, supported
  by everything above it.

The mark reads as *two people, held together by what they're raising*. It is the
seed of the entire visual language: **rounded heads, smile curves, and the gold
arch recur throughout the icon set.**

### Files

| Asset | Path | Use |
|---|---|---|
| Primary app icon (SVG) | `frontend/app/icon.svg` | Favicon, PWA, source of truth |
| iOS home-screen icon | `frontend/app/apple-icon.png` (180×180) | Apple touch icon |
| Mono glyph (icon set) | `frontend/public/brand/icons/logo-glyph.svg` | Inline UI, loaders, badges |
| Email header (light) | `backend/scripts/email-assets/logo-header.svg` | Transactional email |
| Email logo (navy) | `backend/scripts/email-assets/logo-email-navy.svg` | Dark email headers |

### Clear space & minimum size

- **Clear space:** keep padding of at least the height of one parent-head (≈ ¼ of
  the mark) on all sides. Nothing crowds the family.
- **Minimum size:** 24 px for the glyph, 32 px for the full rounded-square icon.
  Below that the arch and smiles stop reading — use `logo-glyph` (heavier strokes).
- **Rounded-square container:** the app icon sits on soft white `#F4F8F7` in a
  `rx=120/512` (≈ 23%) rounded square. Never place the icon on a busy photo without
  this container.

### Don'ts

- ❌ Don't recolor the parents to the same hue — the two-tone *is* the meaning.
- ❌ Don't make the arch or child anything but gold `#F5A623`.
- ❌ Don't add gradients, bevels, drop shadows, or glassmorphism. (The dark/glass
  redesign was explicitly rejected — we are a **light** brand.)
- ❌ Don't rotate, skew, or outline the mark.
- ❌ Don't stretch — scale uniformly only.

---

## 2. Color

Colors are **semantic, not decorative**. Every hue means something. Warm
off-white backgrounds (never pure white) reduce glare for tired, anxious readers.

### 2.1 Core palette

| Token | Hex | Name | Meaning / use |
|---|---|---|---|
| `--primary` / `--cg-sage` | `#3DAA8A` | **Calm Teal** | Trust, primary brand, primary actions, Parent A |
| `--cg-sage-dark` | `#2D8A70` | Teal (hover/active) | Pressed/hover primary |
| `--cg-sage-light` | `#5BC4A0` | Soft Teal | Light accents, highlights |
| `--secondary` / `--cg-slate` | `#2D6A8F` | **Ocean Blue** | Stability, depth, Parent B, professional |
| `--cg-slate-light` | `#4BA8C8` | Sky Blue | Secondary highlight, charts |
| `--accent (portal)` / `--cg-amber` | `#F5A623` | **Child Gold** | The child, warmth, attention, the arch |
| `--foreground` | `#1E3A4A` | **Deep Navy** | Headings, authority, body ink |
| `--background` / `--cg-sand` | `#F4F8F7` | **Soft White** | App background |
| `--card` / `--cg-cream` | `#FFFFFF` | Pure White | Cards, elevated surfaces |

### 2.2 Tints & supporting

| Token | Hex | Use |
|---|---|---|
| `--cg-sage-subtle` | `#E8F4F0` | Teal wash, success backgrounds |
| `--cg-slate-subtle` | `#E0EFF8` | Blue wash |
| `--cg-amber-subtle` | `#FEF7ED` | Gold wash, warning backgrounds |
| `--muted` / `--input` | `#E8F4F8` | Muted fills, inputs |
| `--border` | `#D6ECE8` | Soft teal-tinted borders |
| `--muted-foreground` | `#6B8A9A` | Meta text, timestamps |

### 2.3 Status colors

Status color is **earned**, never used for emotion. Red means *missed / failed /
overdue* — a fact — not *bad person*.

| Token | Hex | Subtle | Meaning |
|---|---|---|---|
| `--cg-success` | `#3DAA8A` | `#E8F4F0` | Verified, compliant, done |
| `--cg-warning` | `#F5A623` | `#FEF7ED` | Attention needed (amber, not alarm) |
| `--cg-error` / `--destructive` | `#C53030` | `#FEE2E2` | Missed, failed, overdue only |
| info | `#0284C7` | `#E0F2FE` | Neutral system message |

### 2.4 ARIA Sentinel (message-heat) colors

ARIA's tone analysis uses a calm, non-punitive scale:

| Token | Hex | Signal |
|---|---|---|
| `--cg-heat` | `#F5A623` | Elevated tone |
| `--cg-heat-high` | `#C53030` | High-conflict language |
| `--cg-coaching` | `#2D6A8F` | Suggested rewrite / coaching |
| `--cg-legal` | `#C53030` | Legal-risk flag |

### 2.5 Portal accents

The app themes itself per audience (`.parent-portal`, `.professional-portal`,
`.child-portal`, `.court-portal`, `.superadmin-portal`). Same palette, reordered
emphasis:

| Portal | Primary | Character |
|---|---|---|
| **Parent** ("Calm Haven") | Teal `#3DAA8A` | Soft, warm, safe |
| **Professional** ("Corporate Authority") | Ocean Blue `#2D6A8F` | Structured, credible |
| **Child** ("Modern app") | Teal + gold play accents | Playful, inclusive |
| **Court** ("Legal Authority") | Deep Navy `#1E3A4A` | Formal, precise |

### 2.6 Dark mode

Dark mode is supported but is **not** the brand's default face (marketing is
light-locked via `.marketing-light`). Key overrides (`.dark`):

| Token | Light | Dark |
|---|---|---|
| Background | `#F4F8F7` | `#0D1B24` |
| Card | `#FFFFFF` | `#162530` |
| Primary | `#3DAA8A` | `#5BC4A0` |
| Secondary | `#2D6A8F` | `#4BA8C8` |
| Text | `#1E3A4A` | `#CBD8E0` |

### 2.7 Accessibility

- Body text (`#1E3A4A`) on soft white / white passes WCAG AA (>7:1).
- Never use Child Gold `#F5A623` for text on white (fails contrast) — use it for
  fills, arcs, icons, and large display only. For gold text use Deep Navy or the
  warning `#D97706` ramp.
- Don't rely on color alone for status — always pair with an icon or label.

---

## 3. Typography

Larger-than-typical sizes and generous line height, because our readers are often
stressed. Base body is **17px**, line-height **1.6**.

| Role | Family | Weights | CSS var |
|---|---|---|---|
| **Body / UI** | **DM Sans** | 400 · 500 · 600 · 700 | `--font-sans` |
| **Display / headings** | **DM Serif Display** | 400 | `--font-serif` |
| Child portal body | Inter | 400–700 | `--font-kid-body` |
| Child portal headings | Space Grotesk | 400–700 | `--font-kid-heading` |
| Numerals / money / code | DM Mono | 400 · 500 | `--font-mono` |

DM Serif Display is reserved for emotional and authoritative moments — hero
headlines, agreement titles, legal document headers. Everything functional is DM
Sans.

### Type scale

| Token | px | rem | Use |
|---|---|---|---|
| xs | 13 | 0.8125 | Captions, meta |
| sm | 15 | 0.9375 | Secondary text |
| **base** | **17** | **1.0625** | **Body** |
| lg | 19 | 1.1875 | Lead paragraphs |
| xl | 22 | 1.375 | Subheads |
| 2xl | 26 | 1.625 | Section headings |
| 3xl | 32 | 2 | Page headings |
| 4xl | 40 | 2.5 | Hero |

Line heights: `tight 1.25` · `normal 1.6` · `relaxed 1.75`.
Heading letter-spacing: `-0.02em`. Weights: normal 400 · medium 500 ·
semibold 600 · bold 700.

---

## 4. Iconography

Two tiers:

1. **Lucide React** — generic UI (chevrons, close, search, etc.). Keep as-is,
   stroke-based, inherits `currentColor`. Don't recolor into the brand palette.
2. **CommonGround brand icons** — our custom duotone feature set in
   `frontend/public/brand/icons/`, catalogued in `index.json` and rendered via
   `<BrandIcon name="…" />` (`components/brand/brand-icon.tsx`). Use these for
   **features, portals, and hero moments** — anywhere the icon should feel like
   *us*.

### Brand-icon construction rules

- **Grid:** `viewBox="0 0 32 32"`, ~4px padding (24px live area).
- **Stroke:** 2px (1.6–1.9 for accents), `round` caps and joins — echoes the logo.
- **Duotone:** teal `#3DAA8A` structure, gold `#F5A623` for the meaningful accent
  (the "child"/focus element), ocean blue `#2D6A8F` for the second party.
- **Motifs:** reuse the logo DNA — rounded heads, smile curves, and the **gold
  arch** (see `timebridge`, `exchange`, `parents`).
- **Self-contained hex** so icons render identically as `<img>`, inline, in email,
  and as favicons — no dependence on CSS variables.

### The set (30 icons)

- **Brand:** logo-glyph · parents · child · mycircle · heart · handshake
- **Features:** aria · timebridge · clearfund · kidcoms · kidspace · safespace ·
  freshstart · agreement · exchange · familyfile · schedule · custody · wallet
- **Portals:** professional · court · compliance · export
- **UI:** messages · video-call · checkin · notifications · settings · security ·
  privacy

---

## 5. Imagery

Photography is how we prove the promise: *real, diverse families, actually okay.*

### Principles

- **Real & multicultural.** Diverse ages, ethnicities, and family shapes across
  the set — dads, moms, grandparents, blended families. Representation is
  deliberate, never tokenized.
- **Warm natural light.** Soft daylight, golden-hour warmth. Film-like grading
  that leans into teal-green shadows and warm highlights — matches the palette.
- **Candid, not stock-posed.** Genuine moments — a laugh, a piggyback, a quiet
  relieved exhale. Avoid staring-at-camera handshake-stock energy.
- **Hopeful & calm.** We show the *after*: coordination handled, energy back on
  the kids. No conflict imagery, no courtroom drama, no crying.
- **Light-locked.** Bright and airy. No dark, moody, or glassmorphic treatments.
- **Clean.** No text baked into photos, no logos, no UI screenshots faked by AI.

### Production — Higgsfield

Marketing imagery is generated with **Higgsfield (GPT Image 2)**. Keep the shared
style suffix for cohesion:

> *Natural candid lifestyle photography, warm soft natural daylight, gentle
> film-like color grading with calm teal-green and warm golden tones, shallow
> depth of field, authentic and emotionally warm, hopeful reassuring mood, real
> diverse multicultural people, clean and airy, no text, no watermark, no logos,
> photorealistic.*

Aspect ratios: 16:9 for heroes/steps, 4:3 for feature/portrait cards. Export ~1600px
wide JPG (~250–350 KB) to match the existing `cg_*` set. Store marketing photos in
`frontend/public/images/marketing/` and blog in `frontend/public/images/blog/`.

### Do / Don't

| ✅ Do | ❌ Don't |
|---|---|
| Diverse real families, candid warmth | Generic smiling-stock, all one demographic |
| Soft daylight, teal/gold grade | Cold blue, harsh flash, heavy vignettes |
| Show the calm "after" | Show conflict, tears, courtrooms |
| Fill empty states with a hopeful image | Fake a product UI screenshot with AI (gibberish text) |

---

## 6. Voice (visual copy)

From ARIA's brand voice, applied to all UI copy:

- **Child-first** — every decision framed around the child's wellbeing.
- **Neutral** — no sides, no blame. "Parent A / Parent B", "you / the other parent".
- **Empathetic** — acknowledge difficulty, point to the next small step.
- **Plain language** — ~8th-grade reading level. Short sentences.
- **Gender-neutral** — never assume mom/dad roles.

---

## 7. Motion

- Purposeful, never playful-for-its-own-sake. Motion *explains a state change*.
- Durations: fast `150ms` · normal `200ms` · slow `300ms`.
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Slow the user down on sensitive/irreversible actions.
- Always honor `prefers-reduced-motion`.

---

## 8. Radius, elevation, spacing

- **Radius:** cards & primary surfaces `1rem` (`--radius`); pills `9999px`. Soft,
  never sharp.
- **Shadows:** whisper-soft only — `card: 0 1px 3px rgb(0 0 0 / 0.04)`. No hard or
  colored drop shadows.
- **Spacing:** 4px base scale (4·8·12·16·24·32·48·64·80). Be generous — whitespace
  is calming.

---

*Maintained alongside the code. Update this file whenever `globals.css`,
`design-tokens.ts`, the logo, or the icon set change.*
