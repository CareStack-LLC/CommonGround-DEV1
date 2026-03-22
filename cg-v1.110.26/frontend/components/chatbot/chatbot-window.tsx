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
    <div className="fixed bottom-24 left-5 z-[40] flex flex-col w-[380px] h-[520px] sm:rounded-2xl rounded-none inset-0 sm:inset-auto sm:bottom-24 sm:left-5 sm:w-[380px] sm:h-[520px] w-full h-full bg-background border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#3DAA8A] to-[#2D6A8F] px-4 py-3 max-sm:py-4 text-white shrink-0">
        <div>
          <h3 className="font-semibold text-sm">Aria</h3>
          <p className="text-xs text-white/80">CommonGround Assistant</p>
        </div>
        <div className="flex items-center gap-1 max-sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEscalate}
            className="h-8 w-8 max-sm:h-10 max-sm:w-10 text-white/80 hover:text-white hover:bg-white/20"
            title="Talk to a human"
          >
            <Mail className="h-4 w-4 max-sm:h-5 max-sm:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 max-sm:h-10 max-sm:w-10 text-white hover:text-white hover:bg-white/20 max-sm:bg-white/20 max-sm:rounded-full"
          >
            <X className="h-4 w-4 max-sm:h-5 max-sm:w-5" />
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
        <div className="border-t px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            This chat has been sent to our team. They&apos;ll follow up via email.
          </p>
        </div>
      ) : (
        <ChatbotInput onSend={onSend} disabled={isLoading} />
      )}
    </div>
  );
}
