/**
 * BrandIcon — CommonGround's custom feature-icon set.
 *
 * These are duotone, brand-colored SVGs (teal / ocean blue / child gold) drawn
 * in the logo's rounded-line + gold-arch language. Unlike Lucide (which we keep
 * for generic UI), these carry brand meaning — use them for features, portals,
 * and hero moments.
 *
 * Icons live in /public/brand/icons/<name>.svg and are catalogued in
 * /public/brand/icons/index.json.
 *
 * Usage:
 *   <BrandIcon name="aria" size={28} />
 *   <BrandIcon name="timebridge" className="h-6 w-6" />
 */

export const BRAND_ICONS = [
  // brand
  "logo-glyph",
  "parents",
  "child",
  "mycircle",
  "heart",
  "handshake",
  // features
  "aria",
  "timebridge",
  "clearfund",
  "kidcoms",
  "kidspace",
  "safespace",
  "freshstart",
  "agreement",
  "exchange",
  "familyfile",
  "schedule",
  "custody",
  "wallet",
  // portals
  "professional",
  "court",
  "compliance",
  "export",
  // ui
  "messages",
  "video-call",
  "checkin",
  "notifications",
  "settings",
  "security",
  "privacy",
] as const;

export type BrandIconName = (typeof BRAND_ICONS)[number];

interface BrandIconProps {
  name: BrandIconName;
  /** Pixel size for a square icon. Ignored when className sets width/height. */
  size?: number;
  className?: string;
  /** Accessible label. Omit for decorative icons (defaults to empty alt). */
  title?: string;
}

export function BrandIcon({ name, size = 24, className, title }: BrandIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/icons/${name}.svg`}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      width={size}
      height={size}
      className={className}
      style={className ? undefined : { width: size, height: size }}
      draggable={false}
    />
  );
}

export default BrandIcon;
