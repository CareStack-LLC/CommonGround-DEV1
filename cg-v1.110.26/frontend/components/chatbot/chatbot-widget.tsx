"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChatbotBubble } from "./chatbot-bubble";
import { ChatbotWindow } from "./chatbot-window";
import { type ChatMessage } from "./chatbot-message-list";
import {
  startChatSession,
  sendChatMessage,
  updateChatVisitor,
  escalateChat,
} from "./chatbot-api";

/** Paths where the chatbot should NOT appear */
const HIDDEN_PATH_PREFIXES = [
  "/dashboard",
  "/superadmin",
  "/professional",
  "/court-portal",
  "/messages",
  "/schedule",
  "/agreements",
  "/family-files",
  "/cases",
  "/custody",
  "/kidcoms",
  "/my-circle",
  "/wallet",
  "/payments",
  "/activities",
  "/settings",
];

const SESSION_KEY = "cg_chatbot_session_id";

const DEFAULT_GREETING =
  "Hi there! I'm Aria, CommonGround's customer success assistant. " +
  "I can help you learn about our co-parenting platform, answer questions about features and pricing, " +
  "or connect you with our support team. How can I help you today?";

export default function ChatbotWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCollectedInfo, setHasCollectedInfo] = useState(false);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [assistantMsgCount, setAssistantMsgCount] = useState(0);

  // Don't render on app pages
  const isHidden = HIDDEN_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Restore session from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      setSessionId(saved);
    }
  }, []);

  const initSession = useCallback(async () => {
    if (sessionId) return;
    // Show greeting immediately so the chat isn't empty
    setMessages([
      { id: "greeting", role: "assistant", content: DEFAULT_GREETING },
    ]);
    setAssistantMsgCount(1);
    try {
      const { session_id, greeting } = await startChatSession(
        window.location.pathname
      );
      setSessionId(session_id);
      sessionStorage.setItem(SESSION_KEY, session_id);
      // Update with server greeting if different
      if (greeting && greeting !== DEFAULT_GREETING) {
        setMessages([
          { id: "greeting", role: "assistant", content: greeting },
        ]);
      }
    } catch (err) {
      console.error("Failed to start chat session:", err);
      // Session failed but greeting is already showing — user can still see it
    }
  }, [sessionId]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (!sessionId && messages.length === 0) {
      initSession();
    }
  }, [sessionId, messages.length, initSession]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // If no session yet, try to create one first
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        try {
          const { session_id } = await startChatSession(
            window.location.pathname
          );
          currentSessionId = session_id;
          setSessionId(session_id);
          sessionStorage.setItem(SESSION_KEY, session_id);
        } catch {
          // Still no session — show fallback
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: "assistant",
              content:
                "I'm having trouble connecting right now. Please reach out to our team at hello@find-commonground.com and they'll be happy to help!",
            },
          ]);
          setIsLoading(false);
          return;
        }
      }

      try {
        const { message_id, reply } = await sendChatMessage(currentSessionId, content);
        const newCount = assistantMsgCount + 1;
        setAssistantMsgCount(newCount);
        setMessages((prev) => [
          ...prev,
          { id: message_id, role: "assistant", content: reply },
        ]);

        // Show visitor form after 2nd assistant response if info not collected
        if (newCount >= 2 && !hasCollectedInfo) {
          setShowVisitorForm(true);
        }
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content:
              err.message ||
              "Sorry, something went wrong. Please try again or email hello@find-commonground.com.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading, assistantMsgCount, hasCollectedInfo]
  );

  const handleVisitorSubmit = useCallback(
    async (info: { name: string; email: string; phone?: string }) => {
      if (!sessionId) return;
      setShowVisitorForm(false);
      setHasCollectedInfo(true);
      try {
        await updateChatVisitor(sessionId, info);
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            role: "system",
            content: `Thanks, ${info.name}! Our team can now follow up if needed.`,
          },
        ]);
      } catch {
        // Silently fail — visitor info is nice-to-have
      }
    },
    [sessionId]
  );

  const handleVisitorSkip = useCallback(() => {
    setShowVisitorForm(false);
    setHasCollectedInfo(true);
  }, []);

  const handleEscalate = useCallback(async () => {
    if (!sessionId || sessionEnded) return;
    try {
      const { message: msg } = await escalateChat(
        sessionId,
        "Visitor requested human support"
      );
      setMessages((prev) => [
        ...prev,
        { id: `escalate-${Date.now()}`, role: "assistant", content: msg },
      ]);
      setSessionEnded(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `escalate-err-${Date.now()}`,
          role: "assistant",
          content:
            "You can reach our team directly at hello@find-commonground.com.",
        },
      ]);
    }
  }, [sessionId, sessionEnded]);

  if (isHidden) return null;

  return (
    <>
      <ChatbotBubble isOpen={isOpen} onClick={isOpen ? handleClose : handleOpen} />
      {isOpen && (
        <ChatbotWindow
          messages={messages}
          isLoading={isLoading}
          showVisitorForm={showVisitorForm}
          sessionEnded={sessionEnded}
          onSend={handleSend}
          onClose={handleClose}
          onVisitorSubmit={handleVisitorSubmit}
          onVisitorSkip={handleVisitorSkip}
          onEscalate={handleEscalate}
        />
      )}
    </>
  );
}
