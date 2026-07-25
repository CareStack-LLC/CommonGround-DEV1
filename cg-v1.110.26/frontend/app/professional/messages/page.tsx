"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  ChevronRight,
  User,
  RefreshCw,
  MoreVertical,
  Eye,
  Reply,
  Archive,
  Mail,
  MailOpen,
  Inbox,
  Send,
  Scale,
  Plus,
  Loader2,
  X,
  Briefcase,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useProfessionalAuth } from "../layout";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_type: "professional" | "parent";
  sender_email?: string;
  recipient_id: string;
  recipient_name: string;
  case_id?: string;
  case_name?: string;
  family_file_id?: string;
  case_assignment_id?: string;
  subject?: string;
  content: string;
  is_read: boolean;
  is_archived?: boolean;
  sent_at?: string;
  created_at: string;
  updated_at?: string;
  thread_id?: string;
  message_count?: number;
}

export default function MessagesPage() {
  const { token, profile, activeFirm } = useProfessionalAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [readFilter, setReadFilter] = useState("all");
  const [showCompose, setShowCompose] = useState(false);
  const [cases, setCases] = useState<{ id: string; title: string; family_file_id: string }[]>([]);

  useEffect(() => {
    if (token) {
      fetchMessages();
      fetchCases();
    }
  }, [token, activeFirm, readFilter]);

  const fetchMessages = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (readFilter === "unread") params.append("is_read", "false");
      if (readFilter === "read") params.append("is_read", "true");
      if (activeFirm) params.append("firm_id", activeFirm.id);
      const response = await fetch(`${API_BASE}/api/v1/professional/messages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.items || data || []);
      }
    } catch (error) {
      console.error("[Messages] Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCases = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/v1/professional/cases?status=active&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCases(data.items || data || []);
      }
    } catch (err) {
      console.error("[Messages] Error fetching cases:", err);
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/v1/professional/messages/${messageId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_read: true } : m));
    } catch (err) {
      console.error("[Messages] Mark as read failed:", err);
    }
  };

  const archiveMessage = async (messageId: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/v1/professional/messages/${messageId}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_archived: true } : m));
    } catch (err) {
      console.error("[Messages] Archive failed:", err);
    }
  };

  const unarchiveMessage = async (messageId: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/v1/professional/messages/${messageId}/unarchive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_archived: false } : m));
    } catch (err) {
      console.error("[Messages] Unarchive failed:", err);
    }
  };

  const filteredMessages = messages.filter(
    (message) =>
      !searchQuery ||
      message.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.case_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 7) return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const stats = {
    total: messages.length,
    unread: messages.filter((m) => !m.is_read).length,
    read: messages.filter((m) => m.is_read).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Messages</h1>
          <p className="text-sm text-slate-500 mt-1">Secure client communications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchMessages} className="border-slate-200 text-slate-700 hover:bg-background rounded-xl h-9">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCompose(true)} className="bg-cg-sage hover:bg-[#2D8A6E] text-white rounded-xl h-9 shadow-sm font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "all", label: "All Messages", value: stats.total, icon: Inbox },
          { key: "unread", label: "Unread", value: stats.unread, icon: Mail },
          { key: "read", label: "Read", value: stats.read, icon: MailOpen },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setReadFilter(stat.key)}
            className={`p-4 rounded-2xl text-left transition-all ${
              readFilter === stat.key
                ? "bg-white border-2 border-cg-sage/30 shadow-sm"
                : "bg-white border border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide mt-1">{stat.label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${readFilter === stat.key ? "bg-cg-sage/10 text-cg-sage" : "bg-slate-100 text-slate-400"}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
        <CardContent className="py-3 flex items-center">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200 focus:border-cg-sage focus:ring-cg-sage/20"
              />
            </div>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-full sm:w-40 border-slate-200">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Message List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredMessages.length > 0 ? (
        <div className="space-y-2">
          {filteredMessages.map((message) => {
            const isSentByMe = message.sender_type === "professional";
            const contactName = isSentByMe ? message.recipient_name : message.sender_name;
            const contactInitials = contactName ? contactName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";

            return (
              <div
                key={message.id}
                className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                  !message.is_read && !isSentByMe
                    ? "bg-background/50 border-cg-sage/20 hover:border-cg-sage/40 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
                onClick={() => message.family_file_id && router.push(`/professional/cases/${message.family_file_id}/messages`)}
              >
                <Avatar className={`h-10 w-10 shrink-0 ${!message.is_read && !isSentByMe ? "ring-2 ring-cg-sage/20" : ""}`}>
                  <AvatarFallback className={`text-xs font-semibold ${!message.is_read && !isSentByMe ? "bg-foreground text-white" : "bg-slate-100 text-slate-600"}`}>
                    {contactInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className={`text-sm truncate ${!message.is_read && !isSentByMe ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                        {contactName || "Unknown"}
                      </h3>
                      {isSentByMe && (
                        <Badge className="bg-background text-cg-sage border border-cg-sage/20 shrink-0 text-[10px] font-semibold">
                          <Send className="h-2.5 w-2.5 mr-1" />
                          Sent
                        </Badge>
                      )}
                      {!message.is_read && !isSentByMe && (
                        <span className="w-2 h-2 rounded-full bg-cg-sage shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatRelativeTime(message.sent_at || message.created_at)}
                    </span>
                  </div>

                  {message.subject && (
                    <p className={`text-sm mt-0.5 truncate ${!message.is_read && !isSentByMe ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                      {message.subject}
                    </p>
                  )}

                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                    {isSentByMe && <span className="text-slate-400">You: </span>}
                    {message.content}
                  </p>

                  {message.case_name && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Briefcase className="h-3 w-3 text-slate-400" />
                      <span className="text-[11px] text-slate-500 font-medium">{message.case_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button aria-label="More options" variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); message.family_file_id && router.push(`/professional/cases/${message.family_file_id}/messages`); }}>
                        <Eye className="h-4 w-4 mr-2" /> View Thread
                      </DropdownMenuItem>
                      {!message.is_read && !isSentByMe && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markAsRead(message.id); }}>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Read
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); message.is_archived ? unarchiveMessage(message.id) : archiveMessage(message.id); }}>
                        <Archive className="h-4 w-4 mr-2" /> {message.is_archived ? "Unarchive" : "Archive"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="border border-dashed border-slate-200 bg-white rounded-2xl">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-background rounded-2xl mb-5">
              <MessageSquare className="h-10 w-10 text-cg-sage" />
            </div>
            <p className="text-lg font-semibold text-slate-900 mb-1.5">No Messages</p>
            <p className="text-sm text-slate-500 max-w-sm">
              {searchQuery || readFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Messages from your cases will appear here. Start a conversation with a client below."}
            </p>
            {!searchQuery && readFilter === "all" && (
              <Button onClick={() => setShowCompose(true)} className="mt-5 bg-cg-sage hover:bg-[#2D8A6E] text-white rounded-xl shadow-sm font-semibold">
                <Plus className="h-4 w-4 mr-2" /> New Message
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compose Dialog */}
      <ComposeDialog
        open={showCompose}
        onClose={() => setShowCompose(false)}
        cases={cases}
        token={token || ""}
        onSent={() => { setShowCompose(false); fetchMessages(); toast({ title: "Message sent" }); }}
      />
    </div>
  );
}

// ─── Compose Dialog ──────────────────────────────────────────────────────────

function ComposeDialog({
  open,
  onClose,
  cases,
  token,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  cases: { id: string; title: string; family_file_id: string }[];
  token: string;
  onSent: () => void;
}) {
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!token || !content.trim()) return;
    setIsSending(true);
    try {
      const caseItem = cases.find((c) => c.id === selectedCaseId || c.family_file_id === selectedCaseId);
      const response = await fetch(`${API_BASE}/api/v1/professional/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          family_file_id: caseItem?.family_file_id || selectedCaseId,
          subject: subject.trim() || undefined,
          content: content.trim(),
        }),
      });
      if (response.ok) {
        setSubject("");
        setContent("");
        setSelectedCaseId("");
        onSent();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border border-slate-200 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-cg-sage/10 flex items-center justify-center">
              <Send className="h-4 w-4 text-cg-sage" />
            </div>
            New Message
          </DialogTitle>
          <DialogDescription>
            Send a secure message to a client on one of your active cases
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Case</Label>
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger className="border-slate-200 focus:border-cg-sage">
                <SelectValue placeholder="Select a case..." />
              </SelectTrigger>
              <SelectContent>
                {cases.length === 0 ? (
                  <SelectItem value="_none" disabled>No active cases</SelectItem>
                ) : (
                  cases.map((c) => (
                    <SelectItem key={c.id} value={c.family_file_id || c.id}>
                      {c.title || `Case ${c.id.slice(0, 8)}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Subject <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject..."
              className="border-slate-200 focus:border-cg-sage focus:ring-cg-sage/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Message</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[140px] border-slate-200 focus:border-cg-sage focus:ring-cg-sage/20 text-sm leading-relaxed resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200">
            Cancel
          </Button>
          <Button aria-label="Send message"
            onClick={handleSend}
            disabled={!content.trim() || !selectedCaseId || isSending}
            className="bg-cg-sage hover:bg-[#2D8A6E] text-white rounded-xl shadow-sm font-semibold"
          >
            {isSending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Send Message</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
