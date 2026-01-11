"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, CheckCircle, AlertCircle, MessageSquare, FileText } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IntakeAccess {
  session_id: string;
  session_number: string;
  professional_name: string;
  professional_role: string;
  target_forms: string[];
  status: string;
  is_accessible: boolean;
  case_name?: string;
  children_names?: string[];
  message?: string;
}

interface Message {
  role: "assistant" | "user";
  content: string;
  timestamp: string;
}

export default function IntakePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessInfo, setAccessInfo] = useState<IntakeAccess | null>(null);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    validateAccess();
  }, [token]);

  const validateAccess = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/intake/access/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Invalid intake link");
        return;
      }

      setAccessInfo(data);

      if (!data.is_accessible) {
        setError(data.message || "This intake is not available");
      }
    } catch (err) {
      setError("Failed to validate intake link");
    } finally {
      setLoading(false);
    }
  };

  const startIntake = async () => {
    if (!accessInfo) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/intake/access/${token}/start`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Failed to start intake");
        return;
      }

      setMessages([{
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString()
      }]);
      setStarted(true);
    } catch (err) {
      setError("Failed to start intake conversation");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !accessInfo || sending) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setSending(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/intake/access/${token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Failed to send message");
        return;
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString()
      }]);

      if (data.is_complete) {
        setIsComplete(true);
      }
    } catch (err) {
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const viewSummary = async () => {
    if (!accessInfo) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/intake/access/${token}/summary`);
      const data = await response.json();

      if (response.ok) {
        setSummary(data.aria_summary);
      }
    } catch (err) {
      console.error("Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  const confirmIntake = async () => {
    if (!accessInfo) return;

    setConfirming(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/intake/access/${token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        setConfirmed(true);
      } else {
        setError(data.detail || "Failed to confirm intake");
      }
    } catch (err) {
      setError("Failed to confirm intake");
    } finally {
      setConfirming(false);
    }
  };

  if (loading && !started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading intake...</p>
        </div>
      </div>
    );
  }

  if (error && !accessInfo?.is_accessible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Intake Not Available</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Intake Complete!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for completing your intake. Your information has been sent to {accessInfo?.professional_name} for review.
            </p>
            <p className="text-sm text-gray-500">
              You can close this window now.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!started && accessInfo?.is_accessible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Legal Intake</CardTitle>
            <CardDescription>
              {accessInfo.professional_name} has requested your information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">From:</span>
                <span className="font-medium">{accessInfo.professional_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span>{accessInfo.professional_role}</span>
              </div>
              {accessInfo.case_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Case:</span>
                  <span>{accessInfo.case_name}</span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Forms:</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {accessInfo.target_forms.map((form) => (
                    <Badge key={form} variant="outline">{form}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">How This Works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• You&apos;ll have a conversation with ARIA, an AI assistant</li>
                <li>• Answer questions in your own words - no forms to fill out</li>
                <li>• Your answers will be organized for {accessInfo.professional_name}</li>
                <li>• You&apos;ll review a summary before submitting</li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> ARIA is an AI assistant that gathers information. It cannot and will not give legal advice. All your answers go directly to {accessInfo.professional_name}.
              </p>
            </div>

            <Button onClick={startIntake} className="w-full" size="lg">
              Begin Intake
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Summary view
  if (summary !== null) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Review Your Information
              </CardTitle>
              <CardDescription>
                Please review this summary of your intake conversation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {summary || "Summary being generated..."}
              </div>

              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  By confirming, you attest that the information above is accurate to the best of your knowledge.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSummary(null)}
                  className="flex-1"
                >
                  Go Back
                </Button>
                <Button
                  onClick={confirmIntake}
                  disabled={confirming}
                  className="flex-1"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    "Confirm & Submit"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">ARIA Paralegal</h1>
            <p className="text-sm text-gray-500">
              Intake for {accessInfo?.professional_name}
            </p>
          </div>
          <Badge variant="outline">{accessInfo?.session_number}</Badge>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-lg px-4 py-3 shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Completion banner */}
      {isComplete && (
        <div className="bg-green-50 border-t border-green-200 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-green-800">
              <CheckCircle className="inline h-4 w-4 mr-1" />
              It looks like we&apos;ve covered everything. Ready to review?
            </p>
            <Button size="sm" onClick={viewSummary}>
              Review Summary
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response..."
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={sending || !inputValue.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="max-w-3xl mx-auto text-xs text-gray-500 mt-2 text-center">
          ARIA is an AI assistant. It does not provide legal advice.
        </p>
      </div>
    </div>
  );
}
