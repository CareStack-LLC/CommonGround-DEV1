"use client";

import { X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatbotMessageList, type ChatMessage } from "./chatbot-message-list";
import { ChatbotInput } from "./chatbot-input";
import { ChatbotVisitorForm } from "./chatbot-visitor-form";

interface ChatbotWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  showVisitorForm: boolean;
  sessionEnded: boolean;
  onSend: (message: string) => void;
  onClose: () => void;
  onVisitorSubmit: (info: { name: string; email: string; phone?: string }) => void;
  onVisitorSkip: () => void;
  onEscalate: () => void;
}

export function ChatbotWindow({
  messages,
  isLoading,
  showVisitorForm,
  sessionEnded,
  onSend,
  onClose,
  onVisitorSubmit,
  onVisitorSkip,
  onEscalate,
}: ChatbotWindowProps) {
  return (
    <div className="fixed z-[40] flex flex-col bottom-24 left-3 right-3 h-[70vh] max-h-[520px] sm:right-auto sm:left-5 sm:w-[380px] sm:h-[520px] rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#3DAA8A] to-[#2D6A8F] px-4 py-3 text-white shrink-0 rounded-t-2xl">
        <div>
          <h3 className="font-semibold text-sm">Aria</h3>
          <p className="text-xs text-white/80">CommonGround Assistant</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEscalate}
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            title="Talk to a human"
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button aria-label="Close"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ChatbotMessageList messages={messages} isLoading={isLoading} />

      {/* Visitor form (inline) */}
      {showVisitorForm && (
        <ChatbotVisitorForm onSubmit={onVisitorSubmit} onSkip={onVisitorSkip} />
      )}

      {/* Input */}
      {sessionEnded ? (
        <div className="border-t border-gray-200 px-4 py-3 text-center bg-white">
          <p className="text-xs text-gray-500">
            This chat has been sent to our team. They&apos;ll follow up via email.
          </p>
        </div>
      ) : (
        <ChatbotInput onSend={onSend} disabled={isLoading} />
      )}
    </div>
  );
}
