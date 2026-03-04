"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  User,
  Download,
  Search,
  RefreshCw,
  Clock,
  MessageSquare,
  Copy,
  ChevronDown,
  ChevronUp,
  Filter,
  Printer,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfessionalAuth } from "../../../layout";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IntakeSession {
  id: string;
  client_name: string;
  client_email: string;
  status: string;
  intake_type: string;
  created_at: string;
  completed_at?: string;
  message_count: number;
}

interface IntakeMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
  metadata?: {
    intent?: string;
    entities?: string[];
    confidence?: number;
  };
}

export default function IntakeTranscriptPage() {
  const params = useParams();
  const { token } = useProfessionalAuth();
  const { toast } = useToast();
  const sessionId = params.sessionId as string;
  const transcriptRef = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<IntakeSession | null>(null);
  const [messages, setMessages] = useState<IntakeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "assistant" | "user">("all");
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [sessionId, token]);

  const fetchData = async () => {
    if (!token || !sessionId) return;

    setIsLoading(true);
    try {
      // Fetch session details
      const sessionResponse = await fetch(
        `${API_BASE}/api/v1/professional/intake/sessions/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (sessionResponse.ok) {
        const data = await sessionResponse.json();
        setSession(data);
      }

      // Fetch transcript
      const transcriptResponse = await fetch(
        `${API_BASE}/api/v1/professional/intake/sessions/${sessionId}/transcript`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (transcriptResponse.ok) {
        const transcriptData = await transcriptResponse.json();
        setMessages(transcriptData.messages || []);
      }
    } catch (error) {
      console.error("Error fetching transcript:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyTranscript = () => {
    const text = messages
      .map((m) => `[${m.role === "assistant" ? "ARIA" : "Client"}] ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Transcript copied to clipboard",
    });
  };

  const exportTranscript = () => {
    const text = [
      `ARIA Pro Intake Transcript`,
      `Client: ${session?.client_name}`,
      `Date: ${new Date(session?.created_at || "").toLocaleString()}`,
      `Status: ${session?.status}`,
      `---`,
      "",
      ...messages.map(
        (m) =>
          `[${new Date(m.created_at).toLocaleTimeString()}] ${
            m.role === "assistant" ? "ARIA" : "Client"
          }:\n${m.content}`
      ),
    ].join("\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intake-transcript-${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printTranscript = () => {
    window.print();
  };

  const filteredMessages = messages.filter((msg) => {
    if (filterRole !== "all" && msg.role !== filterRole) return false;
    if (searchQuery && !msg.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleMessageExpand = (id: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Back Link - hidden on print */}
      <Link
        href={`/professional/intake/${sessionId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Session
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:block">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl print:hidden">
            <MessageSquare className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conversation Transcript</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <span>{session?.client_name}</span>
              <span>|</span>
              <span>{formatDate(session?.created_at || "")}</span>
              <span>|</span>
              <span>{messages.length} messages</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyTranscript}>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportTranscript}>
                <Download className="h-4 w-4 mr-2" />
                Download as Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={printTranscript}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search and Filters - hidden on print */}
      <Card className="print:hidden">
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={filterRole === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRole("all")}
              >
                All
              </Button>
              <Button
                variant={filterRole === "assistant" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRole("assistant")}
              >
                <Bot className="h-4 w-4 mr-1" />
                ARIA
              </Button>
              <Button
                variant={filterRole === "user" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRole("user")}
              >
                <User className="h-4 w-4 mr-1" />
                Client
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 print:hidden">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Messages</p>
            <p className="text-2xl font-bold">{messages.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">ARIA Messages</p>
            <p className="text-2xl font-bold text-purple-600">
              {messages.filter((m) => m.role === "assistant").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Client Responses</p>
            <p className="text-2xl font-bold text-blue-600">
              {messages.filter((m) => m.role === "user").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transcript */}
      <Card ref={transcriptRef}>
        <CardHeader className="print:pb-2">
          <CardTitle className="text-base">Full Transcript</CardTitle>
          <CardDescription className="print:hidden">
            Complete conversation between ARIA and the client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMessages.length > 0 ? (
            <div className="space-y-4 print:space-y-2">
              {filteredMessages.map((message, index) => {
                const isLongMessage = message.content.length > 500;
                const isExpanded = expandedMessages.has(message.id);
                const displayContent =
                  isLongMessage && !isExpanded
                    ? message.content.slice(0, 500) + "..."
                    : message.content;

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 print:block ${
                      message.role === "assistant" ? "" : "flex-row-reverse print:flex-row"
                    }`}
                  >
                    <Avatar className="h-8 w-8 shrink-0 print:hidden">
                      <AvatarFallback
                        className={
                          message.role === "assistant"
                            ? "bg-purple-100 text-purple-600"
                            : "bg-blue-100 text-blue-600"
                        }
                      >
                        {message.role === "assistant" ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`flex-1 ${
                        message.role === "assistant" ? "pr-12 print:pr-0" : "pl-12 print:pl-0"
                      }`}
                    >
                      {/* Print-only header */}
                      <div className="hidden print:block font-medium mb-1">
                        [{formatTime(message.created_at)}]{" "}
                        {message.role === "assistant" ? "ARIA" : "Client"}:
                      </div>
                      <div
                        className={`p-3 rounded-lg print:p-0 print:bg-transparent ${
                          message.role === "assistant" ? "bg-muted" : "bg-blue-50"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                        {isLongMessage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs print:hidden"
                            onClick={() => toggleMessageExpand(message.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Show Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Show More
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1 print:hidden">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(message.created_at)}
                        </p>
                        {message.metadata?.intent && (
                          <Badge variant="outline" className="text-xs">
                            {message.metadata.intent}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground print:hidden">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>
                {searchQuery || filterRole !== "all"
                  ? "No messages match your search"
                  : "No messages yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline View - hidden on print */}
      {messages.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Conversation Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex flex-col items-center ${
                    index < messages.length - 1 ? "flex-1" : ""
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      message.role === "assistant" ? "bg-purple-500" : "bg-blue-500"
                    }`}
                  />
                  {index < messages.length - 1 && (
                    <div className="w-full h-0.5 bg-muted mt-1.5" />
                  )}
                  {index % 5 === 0 && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {formatTime(message.created_at)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Start: {formatTime(messages[0]?.created_at || "")}</span>
              <span>End: {formatTime(messages[messages.length - 1]?.created_at || "")}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
