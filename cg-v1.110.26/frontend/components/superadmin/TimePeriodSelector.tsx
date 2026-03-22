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
    <div className="flex items-center gap-1 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-lg p-0.5">
      {options.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
            selected === d
              ? "bg-[#3DAA8A]/15 text-[#5BC4A0]"
              : "text-[#6B8A9A] hover:text-white"
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}
