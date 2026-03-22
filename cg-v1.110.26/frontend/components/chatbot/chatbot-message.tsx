"use client";

import { cn } from "@/lib/utils";

interface ChatbotMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ChatbotMessage({ role, content }: ChatbotMessageProps) {
  if (role === "system") {
    return (
      <div className="flex justify-center px-4 py-2">
        <p className="text-xs text-gray-500 text-center max-w-[280px]">
          {content}
        </p>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div className={cn("flex px-4 py-1.5", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-[#3DAA8A] text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        )}
      >
        {content}
      </div>
    </div>
  );
}
