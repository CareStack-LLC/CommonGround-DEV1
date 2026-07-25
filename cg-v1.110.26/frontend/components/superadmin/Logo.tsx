"use client";

export function AdminLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sa-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8F4F8" />
          <stop offset="100%" stopColor="var(--border)" />
        </linearGradient>
        <linearGradient id="sa-lf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--cg-sage-light)" />
          <stop offset="100%" stopColor="var(--cg-sage)" />
        </linearGradient>
        <linearGradient id="sa-rf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--cg-slate-light)" />
          <stop offset="100%" stopColor="var(--cg-slate)" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#sa-bg)" />
      <circle cx="168" cy="148" r="48" fill="url(#sa-lf)" />
      <path d="M118 218 Q168 258 218 218" stroke="url(#sa-lf)" strokeWidth="16" strokeLinecap="round" fill="none" />
      <circle cx="344" cy="148" r="48" fill="url(#sa-rf)" />
      <path d="M294 218 Q344 258 394 218" stroke="url(#sa-rf)" strokeWidth="16" strokeLinecap="round" fill="none" />
      <path d="M218 168 Q256 104 294 168" stroke="var(--cg-amber)" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.95" />
      <circle cx="256" cy="330" r="38" fill="var(--cg-amber)" />
      <path d="M218 382 Q256 414 294 382" stroke="var(--cg-amber)" strokeWidth="12" strokeLinecap="round" fill="none" />
    </svg>
  );
}
