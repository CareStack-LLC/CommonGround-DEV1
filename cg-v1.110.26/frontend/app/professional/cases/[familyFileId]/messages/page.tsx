"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  RefreshCw,
  User,
  Briefcase,
  Clock,
  CheckCheck,
  Check,
  Search,
  Filter,
  MoreVertical,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfessionalAuth } from "../../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MessageThread {
  id: string;
  participant_name: string;
  participant_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type: "professional" | "parent";
  sender_name?: string;
  is_read: boolean;
  read_at?: string;
  sent_at: string;
  thread_id?: string;
}

export default function ClientMessagingPage() {
  const params = useParams();
  const { token, profile } = useProfessionalAuth();
  const familyFileId = params.familyFileId as string;

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThreads();
  }, [familyFileId, token]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread);
    }
  }, [selectedThread, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchThreads = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/messages/threads`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setThreads(data.items || []);
        // Auto-select first thread if none selected
        if (data.items?.length > 0 && !selectedThread) {
          setSelectedThread(data.items[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching threads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    if (!token || !familyFileId) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/messages?thread_id=${threadId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.items || []);
        // Mark messages as read
        markThreadAsRead(threadId);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markThreadAsRead = async (threadId: string) => {
    if (!token || !familyFileId) return;

    try {
      await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/messages/threads/${threadId}/read`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Update local state
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unread_count: 0 } : t))
      );
    } catch (error) {
      console.error("Error marking thread as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!token || !familyFileId || !newMessage.trim() || !selectedThread) return;

    setIsSending(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: newMessage.trim(),
            thread_id: selectedThread,
          }),
        }
      );

      if (response.ok) {
        const sentMessage = await response.json();
        setMessages((prev) => [...prev, sentMessage]);
        setNewMessage("");
        // Update thread preview
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedThread
              ? { ...t, last_message: newMessage.trim(), last_message_at: new Date().toISOString() }
              : t
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const filteredThreads = threads.filter(
    (t) =>
      !searchQuery ||
      t.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedThreadData = threads.find((t) => t.id === selectedThread);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/professional/cases/${familyFileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Case
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
              <MessageSquare className="h-6 w-6" />
            </div>
            Client Messages
          </h1>
          <p className="text-muted-foreground mt-1">
            Secure communication with case participants
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchThreads}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : threads.length > 0 ? (
        <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
          {/* Thread List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {filteredThreads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedThread === thread.id
                          ? "bg-emerald-50 border border-emerald-200"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-cyan-100 text-cyan-600">
                            {thread.participant_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">
                              {thread.participant_name}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatTime(thread.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-muted-foreground truncate pr-2">
                              {thread.last_message}
                            </p>
                            {thread.unread_count > 0 && (
                              <Badge className="h-5 min-w-[20px] shrink-0 bg-emerald-500">
                                {thread.unread_count}
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                            {thread.participant_role.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedThreadData ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-cyan-100 text-cyan-600">
                          {selectedThreadData.participant_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{selectedThreadData.participant_name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {selectedThreadData.participant_role.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>Export Conversation</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                {/* Messages Area */}
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          isOwn={message.sender_type === "professional"}
                          professionalName={
                            profile
                              ? `${profile.user_first_name || ""} ${profile.user_last_name || ""}`.trim()
                              : "You"
                          }
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="min-h-[44px] max-h-32 resize-none"
                      rows={1}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No conversations yet</h3>
            <p className="text-muted-foreground">
              Client messaging will appear here once you start communicating with case participants.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Message Bubble Component
function MessageBubble({
  message,
  isOwn,
  professionalName,
}: {
  message: Message;
  isOwn: boolean;
  professionalName: string;
}) {
  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] ${
          isOwn
            ? "bg-emerald-600 text-white rounded-2xl rounded-br-sm"
            : "bg-muted rounded-2xl rounded-bl-sm"
        } px-4 py-2.5`}
      >
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <User className="h-3 w-3" />
            <span className="text-xs font-medium">
              {message.sender_name || "Client"}
            </span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div
          className={`flex items-center justify-end gap-1 mt-1 ${
            isOwn ? "text-emerald-100" : "text-muted-foreground"
          }`}
        >
          <span className="text-[10px]">{formatMessageTime(message.sent_at)}</span>
          {isOwn && (
            <span className="text-[10px]">
              {message.is_read ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
