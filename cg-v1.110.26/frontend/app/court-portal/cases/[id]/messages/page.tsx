"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCourtAuth } from "../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ParentMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  recipient_id: string;
  recipient_name: string;
  content: string;
  sent_at: string;
  was_flagged: boolean;
  original_content: string | null;
  aria_score: number | null;
  aria_categories: string[] | null;
  suggestion_accepted: boolean | null;
}

interface CourtMessage {
  id: string;
  from: string;
  subject: string;
  content: string;
  sent_at: string;
  read_by: string[];
  delivery_confirmed: boolean;
  is_urgent?: boolean;
}

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [courtMessages, setCourtMessages] = useState<CourtMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"parent" | "court">("parent");
  const [showComposeForm, setShowComposeForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // Compose form state
  const [subject, setSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const caseId = params.id as string;

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId) {
      loadAllMessages();
    }
  }, [professional, caseId]);

  const loadAllMessages = async () => {
    try {
      setIsLoadingMessages(true);

      // Load parent-to-parent messages
      const parentResponse = await fetch(`${API_BASE}/court/parent-messages/${caseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (parentResponse.ok) {
        const parentData = await parentResponse.json();
        setMessages(parentData);
      }

      // Load court messages
      const courtResponse = await fetch(`${API_BASE}/court/messages/case/${caseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (courtResponse.ok) {
        const courtData = await courtResponse.json();
        // Transform API response to match our interface
        const transformed = courtData.map((msg: any) => ({
          id: msg.id,
          from: msg.sent_by_name || `Court Official`,
          subject: msg.subject,
          content: msg.content,
          sent_at: msg.sent_at,
          read_by: [
            ...(msg.petitioner_read_at ? ['petitioner'] : []),
            ...(msg.respondent_read_at ? ['respondent'] : []),
          ],
          delivery_confirmed: true,
          is_urgent: msg.is_urgent,
        }));
        setCourtMessages(transformed);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const handleSendCourtMessage = async () => {
    if (!subject || !messageContent) return;

    setIsSending(true);

    try {
      const response = await fetch(`${API_BASE}/court/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          case_id: caseId,
          message_type: "announcement",
          subject,
          content: messageContent,
          to_petitioner: true,
          to_respondent: true,
          is_urgent: isUrgent,
          replies_allowed: false,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        // Transform to our local interface
        const transformedMessage: CourtMessage = {
          id: newMessage.id,
          from: `${professional.full_name} (${professional.role?.toUpperCase() || 'COURT'})`,
          subject: newMessage.subject || subject,
          content: newMessage.content,
          sent_at: newMessage.sent_at,
          read_by: [],
          delivery_confirmed: true,
          is_urgent: newMessage.is_urgent,
        };
        setCourtMessages([transformedMessage, ...courtMessages]);
        setShowComposeForm(false);
        setSubject("");
        setMessageContent("");
        setIsUrgent(false);
      } else {
        console.error("Failed to send court message");
      }
    } catch (err) {
      console.error("Failed to send court message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch = msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          msg.sender_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterFlagged || msg.was_flagged;
    return matchesSearch && matchesFilter;
  });

  const getToxicityColor = (score: number | null) => {
    if (score === null) return "bg-gray-100 text-gray-700";
    if (score < 0.3) return "bg-green-100 text-green-700";
    if (score < 0.6) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  // Sort messages by date (newest first)
  const sortedMessages = [...filteredMessages].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/court-portal/cases/${params.id}`}
              className="text-slate-500 hover:text-slate-700"
            >
              ← Back to Case
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Communication Log</h1>
          <p className="text-slate-600">
            Parent messages and court communications
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("parent")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "parent"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Parent Messages ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab("court")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "court"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Court Messages ({courtMessages.length})
        </button>
      </div>

      {/* Parent Messages View */}
      {activeTab === "parent" && (
        <>
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterFlagged}
                onChange={(e) => setFilterFlagged(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-600">Show flagged only</span>
            </label>
          </div>

          {/* ARIA Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{messages.length}</div>
                <div className="text-xs text-slate-500">Total Messages</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{messages.filter(m => m.was_flagged).length}</div>
                <div className="text-xs text-slate-500">ARIA Flagged</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {messages.filter(m => m.was_flagged && m.suggestion_accepted).length}
                </div>
                <div className="text-xs text-slate-500">Suggestions Accepted</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {messages.filter(m => m.was_flagged && !m.suggestion_accepted).length}
                </div>
                <div className="text-xs text-slate-500">Sent Anyway</div>
              </CardContent>
            </Card>
          </div>

          {/* Message List */}
          <Card>
            <CardHeader>
              <CardTitle>Message Thread</CardTitle>
              <CardDescription>
                Read-only view of parent communications with ARIA analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : sortedMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <span className="text-4xl">💬</span>
                  <p className="mt-4">No messages found</p>
                </div>
              ) : (
              <div className="space-y-4">
                {sortedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`border rounded-lg p-4 ${
                      msg.was_flagged ? "border-red-200 bg-red-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          msg.sender_role === "petitioner"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {msg.sender_role === "petitioner" ? "Petitioner" : "Respondent"}
                        </span>
                        <span className="font-medium text-slate-900">{msg.sender_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {msg.aria_score !== null && (
                          <span className={`px-2 py-0.5 rounded text-xs ${getToxicityColor(msg.aria_score)}`}>
                            ARIA: {(msg.aria_score * 100).toFixed(0)}%
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(msg.sent_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-700">{msg.content}</p>

                    {msg.was_flagged && (
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-red-600 font-medium text-sm">ARIA Intervention</span>
                          {msg.aria_categories && (
                            <div className="flex space-x-1">
                              {msg.aria_categories.map((cat: string) => (
                                <span key={cat} className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="text-slate-500">
                            <span className="font-medium">Original:</span>{" "}
                            <span className="line-through">{msg.original_content}</span>
                          </div>
                          <div className={`${msg.suggestion_accepted ? "text-green-700" : "text-yellow-700"}`}>
                            <span className="font-medium">
                              {msg.suggestion_accepted ? "Accepted suggestion" : "Sent original anyway"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Court Messages View */}
      {activeTab === "court" && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setShowComposeForm(true)}>
              Send Court Message
            </Button>
          </div>

          {/* Compose Form */}
          {showComposeForm && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Send Court Message</CardTitle>
                <CardDescription>
                  One-way communication to both parents (they cannot reply here)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Document Request"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Enter your message to both parents..."
                    className="w-full min-h-[120px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setShowComposeForm(false)} disabled={isSending}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendCourtMessage} disabled={!subject || !messageContent || isSending}>
                    {isSending ? "Sending..." : "Send to Both Parents"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Court Message List */}
          <Card>
            <CardHeader>
              <CardTitle>Court Communications</CardTitle>
              <CardDescription>
                Messages sent to parents from court professionals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {courtMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <span className="text-4xl">📬</span>
                  <p className="mt-4">No court messages sent</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {courtMessages.map((msg) => (
                    <div key={msg.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-slate-900">{msg.subject}</div>
                          <div className="text-sm text-slate-500">From: {msg.from}</div>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(msg.sent_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 mt-2">{msg.content}</p>
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <div className="flex space-x-2 text-xs">
                          <span className="text-slate-500">Read by:</span>
                          {msg.read_by.includes("petitioner") && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Petitioner</span>
                          )}
                          {msg.read_by.includes("respondent") && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Respondent</span>
                          )}
                          {msg.read_by.length === 0 && (
                            <span className="text-slate-400">Not yet read</span>
                          )}
                        </div>
                        {msg.delivery_confirmed && (
                          <span className="text-xs text-green-600">Delivered</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Info */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <span className="text-xl">ℹ️</span>
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700">About Communication Logging</p>
              <p className="mt-1">
                All parent messages are analyzed by ARIA for tone and conflict indicators.
                ARIA scores range from 0% (neutral) to 100% (highly contentious).
                Flagged messages show the original content and whether suggestions were accepted.
                Court messages are one-way and tracked for read receipts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
