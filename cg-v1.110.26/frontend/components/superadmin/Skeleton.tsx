"use client";

interface SkeletonProps {
  className?: string;
  variant?: "card" | "table-row" | "chart" | "metric";
}

export function Skeleton({ className = "", variant }: SkeletonProps) {
  const variantClass = {
    card: "h-28",
    "table-row": "h-12",
    chart: "h-64",
    metric: "h-20",
  }[variant || "card"];

  return (
    <div
      className={`animate-pulse bg-zinc-800/60 rounded-lg ${variantClass} ${className}`}
    />
  );
}

/** Render N skeleton rows for a table */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="table-row" className="mb-1" />
      ))}
    </>
  );
}

/** Render N skeleton cards in a grid */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </>
  );
}
