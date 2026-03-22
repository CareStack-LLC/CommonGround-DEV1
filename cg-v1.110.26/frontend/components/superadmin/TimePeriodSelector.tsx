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
    <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-0.5">
      {options.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
            selected === d
              ? "bg-violet-500/15 text-violet-300"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}
