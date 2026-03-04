"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ShieldAlert, Shield, ShieldCheck, ShieldOff } from "lucide-react";

export type SensitivityLevel = "strict" | "moderate" | "relaxed" | "off";

interface SensitivityOption {
  value: SensitivityLevel;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const sensitivityOptions: SensitivityOption[] = [
  {
    value: "strict",
    label: "Strict",
    description: "Flags minor issues. Best for high-conflict situations.",
    icon: ShieldAlert,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Balanced detection. Recommended for most situations.",
    icon: Shield,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    value: "relaxed",
    label: "Relaxed",
    description: "Only flags severe violations like threats.",
    icon: ShieldCheck,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    value: "off",
    label: "Off",
    description: "No ARIA monitoring during the call.",
    icon: ShieldOff,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
];

interface ARIASensitivitySliderProps {
  value: SensitivityLevel;
  onChange: (value: SensitivityLevel) => void;
  disabled?: boolean;
  className?: string;
}

export function ARIASensitivitySlider({
  value,
  onChange,
  disabled = false,
  className,
}: ARIASensitivitySliderProps) {
  const [hoveredOption, setHoveredOption] = useState<SensitivityLevel | null>(null);

  const selectedOption = sensitivityOptions.find((opt) => opt.value === value) || sensitivityOptions[1];
  const displayOption = hoveredOption
    ? sensitivityOptions.find((opt) => opt.value === hoveredOption) || selectedOption
    : selectedOption;

  const selectedIndex = sensitivityOptions.findIndex((opt) => opt.value === value);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <displayOption.icon className={cn("w-5 h-5", displayOption.color)} />
          <span className="font-medium text-gray-900">ARIA Sensitivity</span>
        </div>
        <span className={cn("text-sm font-medium", displayOption.color)}>
          {displayOption.label}
        </span>
      </div>

      {/* Slider Track */}
      <div className="relative">
        {/* Background track */}
        <div className="h-2 bg-gray-100 rounded-full">
          {/* Colored fill - extends to the selected option position */}
          {/* Calculate fill width: each option at 0, 33, 66, 100% with 8% minimum */}
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              selectedOption.color.replace("text-", "bg-")
            )}
            style={{
              width: selectedIndex === 0
                ? '8%'
                : `${(selectedIndex / (sensitivityOptions.length - 1)) * 100}%`
            }}
          />
        </div>

        {/* Option buttons */}
        <div className="absolute inset-0 flex items-center justify-between -mx-2">
          {sensitivityOptions.map((option, index) => {
            const Icon = option.icon;
            const isSelected = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(option.value)}
                onMouseEnter={() => setHoveredOption(option.value)}
                onMouseLeave={() => setHoveredOption(null)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                  "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
                  isSelected
                    ? cn(option.bgColor, option.borderColor, option.color, "scale-110")
                    : "bg-white border-gray-200 text-gray-400 hover:border-gray-300",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`Set ARIA sensitivity to ${option.label}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 -mx-1">
        {sensitivityOptions.map((option) => (
          <span
            key={option.value}
            className={cn(
              "transition-colors duration-200",
              value === option.value && option.color
            )}
          >
            {option.label}
          </span>
        ))}
      </div>

      {/* Description */}
      <div
        className={cn(
          "p-3 rounded-lg border transition-all duration-200",
          displayOption.bgColor,
          displayOption.borderColor
        )}
      >
        <p className="text-sm text-gray-700">{displayOption.description}</p>
        {displayOption.value === "off" && (
          <p className="text-xs text-gray-500 mt-1">
            Calls without ARIA monitoring will not have sentiment analysis or intervention capabilities.
          </p>
        )}
      </div>
    </div>
  );
}
