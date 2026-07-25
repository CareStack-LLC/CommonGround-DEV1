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
      className={`animate-pulse bg-cg-slate/20 rounded-lg ${variantClass} ${className}`}
    />
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="table-row" className="mb-1" />
      ))}
    </>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </>
  );
}
