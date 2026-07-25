"use client";

interface TimePeriodSelectorProps {
  options?: number[];
  selected: number;
  onChange: (days: number) => void;
}

export function TimePeriodSelector({
  options = [7, 14, 30, 60, 90],
  selected,
  onChange,
}: TimePeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-cg-slate-deep/60 border border-cg-slate/20 rounded-lg p-0.5">
      {options.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
            selected === d
              ? "bg-cg-sage/15 text-cg-sage-light"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}
