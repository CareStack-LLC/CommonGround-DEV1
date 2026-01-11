"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCourtAuth } from "../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Suggested queries
const SUGGESTED_QUERIES = [
  {
    category: "Schedule",
    icon: "📅",
    queries: [
      "What is the current custody schedule?",
      "When was the last exchange?",
      "How many exchanges in the last 90 days?",
    ],
  },
  {
    category: "Compliance",
    icon: "✅",
    queries: [
      "Have there been missed pickups?",
      "What is the on-time rate for exchanges?",
      "How many court events had no-shows?",
    ],
  },
  {
    category: "Settings",
    icon: "⚙️",
    queries: [
      "What settings are court-locked?",
      "Is investigation mode enabled?",
      "Is GPS required for check-ins?",
    ],
  },
  {
    category: "Communication",
    icon: "💬",
    queries: [
      "How many messages in the last 30 days?",
      "What is the ARIA flag rate?",
      "Which parent has more flags?",
    ],
  },
];

// Fallback responses for when API is unavailable
const FALLBACK_RESPONSES: Record<string, { response: string; data?: any }> = {
  "what is the current custody schedule?": {
    response: "The current custody schedule is a 2-2-3 rotation. Parent A has custody Monday-Tuesday, Parent B has Wednesday-Thursday, and weekends alternate.",
    data: { schedule_type: "2-2-3" },
  },
  "have there been missed pickups?": {
    response: "Please select a specific case to view exchange compliance data.",
  },
  "what settings are court-locked?": {
    response: "Please select a specific case to view court-controlled settings.",
  },
};

interface Message {
  id: string;
  type: "user" | "aria";
  content: string;
  data?: any;
  timestamp: Date;
}

export default function ARIAAssistantPage() {
  const router = useRouter();
  const { professional, token, activeGrant, isLoading } = useCourtAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedQueries, setSuggestedQueries] = useState(SUGGESTED_QUERIES);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load suggested queries from API
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await fetch(`${API_BASE}/court/aria/suggestions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          if (data.suggestions && data.suggestions.length > 0) {
            // Transform API response to match our format
            const transformed = data.suggestions.map((s: { category: string; queries: string[] }, idx: number) => ({
              category: s.category,
              icon: ["📅", "✅", "⚙️", "💬"][idx % 4],
              queries: s.queries,
            }));
            setSuggestedQueries(transformed);
          }
        }
      } catch (err) {
        console.error("Failed to load ARIA suggestions:", err);
      }
    };

    if (professional) {
      loadSuggestions();
    }
  }, [professional, token]);

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (query: string) => {
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      // Get case_id from activeGrant or use a placeholder
      const caseId = activeGrant?.case_id || "";

      if (!caseId) {
        // No case selected, use fallback
        const normalizedQuery = query.toLowerCase().trim().replace(/\?$/, "");
        const fallback = Object.entries(FALLBACK_RESPONSES).find(([key]) =>
          normalizedQuery.includes(key.replace(/\?$/, ""))
        );

        const ariaMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "aria",
          content: fallback
            ? fallback[1].response
            : "Please select a case from the dashboard first to query case-specific information.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, ariaMessage]);
        setIsProcessing(false);
        return;
      }

      const response = await fetch(`${API_BASE}/court/aria/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          case_id: caseId,
          query: query,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const ariaMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "aria",
          content: data.response,
          data: data.data,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, ariaMessage]);
      } else {
        // API error, use fallback
        const ariaMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "aria",
          content: "I'm having trouble connecting to the case data. Please try again or select a different case.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, ariaMessage]);
      }
    } catch (err) {
      console.error("ARIA query error:", err);
      const ariaMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "aria",
        content: "I'm having trouble processing your request. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, ariaMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestedQuery = (query: string) => {
    handleSubmit(query);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ARIA Assistant</h1>
        <p className="text-slate-600">
          Ask factual questions about case data
        </p>
      </div>

      {/* Disclaimer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <span className="text-xl">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium">ARIA provides facts, not recommendations</p>
              <p className="mt-1">
                ARIA can answer questions about schedules, compliance, and communication patterns.
                It cannot recommend custody changes, label parents, or suggest sanctions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="md:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b flex-shrink-0">
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>🤖</span>
                <span>ARIA Court Assistant</span>
              </CardTitle>
              {activeGrant && (
                <CardDescription>
                  Querying: {activeGrant.case_name || "Select a case"}
                </CardDescription>
              )}
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 py-12">
                  <span className="text-4xl">🤖</span>
                  <p className="mt-4 font-medium">Ask me about case facts</p>
                  <p className="text-sm mt-2">
                    Try a suggested query or type your own question
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === "user"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.data && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-xs font-mono">
                          {JSON.stringify(message.data, null, 2)}
                        </div>
                      )}
                      {message.type === "aria" && (
                        <p className="text-xs mt-2 opacity-60">
                          Facts only. No recommendations provided.
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="border-t p-4 flex-shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(input);
                }}
                className="flex space-x-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about case facts..."
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button type="submit" disabled={isProcessing || !input.trim()}>
                  Ask
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Suggested Queries */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Suggested Queries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestedQueries.map((category) => (
                <div key={category.category}>
                  <div className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
                    <span>{category.icon}</span>
                    <span>{category.category}</span>
                  </div>
                  <div className="space-y-1">
                    {category.queries.map((query) => (
                      <button
                        key={query}
                        onClick={() => handleSuggestedQuery(query)}
                        disabled={isProcessing}
                        className="w-full text-left text-xs p-2 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 transition disabled:opacity-50"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="text-sm text-orange-800">
                <p className="font-medium">What ARIA Cannot Do</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>❌ Recommend custody changes</li>
                  <li>❌ Label or characterize parents</li>
                  <li>❌ Suggest sanctions or outcomes</li>
                  <li>❌ Make predictions</li>
                  <li>❌ Interpret intent or motive</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
