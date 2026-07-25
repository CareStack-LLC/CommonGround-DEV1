"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle className="w-3.5 h-3.5 text-cg-sage-light/50 hover:text-cg-sage-light cursor-help transition-colors" />
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-cg-slate-tint bg-foreground border border-cg-slate/40 rounded-lg shadow-xl whitespace-normal w-56 text-center leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-cg-slate/40" />
        </span>
      )}
    </span>
  );
}
