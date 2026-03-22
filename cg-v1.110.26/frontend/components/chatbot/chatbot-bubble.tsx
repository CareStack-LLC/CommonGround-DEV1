"use client";

import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatbotBubbleProps {
  isOpen: boolean;
  onClick: () => void;
}

export function ChatbotBubble({ isOpen, onClick }: ChatbotBubbleProps) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? "Close chat" : "Open chat"}
      className={cn(
        "fixed bottom-5 left-5 z-[40] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95",
        "bg-[#3DAA8A] text-white hover:bg-[#35977a]",
        !isOpen && "animate-[pulse_3s_ease-in-out_1]"
      )}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </button>
  );
}
