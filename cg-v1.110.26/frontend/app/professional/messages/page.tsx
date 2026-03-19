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
  AlertCircle,
  ChevronRight,
  Calendar,
  User,
  RefreshCw,
  MoreVertical,
  Eye,
  Reply,
  Archive,
  Mail,
  MailOpen,
  Users,
  Inbox,
  Send,
  FileText,
  Scale,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfessionalAuth } from "../layout";

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

interface MessageThread {
  id: string;
  participant_name: string;
  participant_email?: string;
  family_file_id?: string;
  case_name?: string;
  last_message_preview: string;
  last_message_at: string;
  unread_count: number;
  total_messages: number;
}

export default function MessagesPage() {
  const { token, profile, activeFirm } = useProfessionalAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [readFilter, setReadFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (token) {
      fetchMessages();
      fetchUnreadCount();
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

      const response = await fetch(
        `${API_BASE}/api/v1/professional/messages?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.items || data || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/messages/unread-count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!token) return;

    try {
      await fetch(
        `${API_BASE}/api/v1/professional/messages/${messageId}/read`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, is_read: true } : m)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const archiveMessage = async (messageId: string) => {
    if (!token) return;

    try {
      await fetch(
        `${API_BASE}/api/v1/professional/messages/${messageId}/archive`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, is_archived: true } : m)
      );
    } catch (error) {
      console.error("Error archiving message:", error);
    }
  };

  const unarchiveMessage = async (messageId: string) => {
    if (!token) return;

    try {
      await fetch(
        `${API_BASE}/api/v1/professional/messages/${messageId}/unarchive`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, is_archived: false } : m)
      );
    } catch (error) {
      console.error("Error unarchiving message:", error);
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

    if (days > 7) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  // Stats
  const stats = {
    total: messages.length,
    unread: messages.filter((m) => !m.is_read).length,
    read: messages.filter((m) => m.is_read).length,
  };

  return (
    <div className="space-y-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        .serif { font-family: 'Crimson Pro', serif; }
        .sans { font-family: 'Outfit', sans-serif; }
      `}</style>

      {/* Header */}
      <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-[#1E3A4A] via-[#2D6A8F] to-[#1E3A4A] px-8 py-8 shadow-2xl border-2 border-[#1E3A4A]/40">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3DAA8A] via-[#D4A853] to-[#3DAA8A]" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-5">
            <div className="p-4 bg-[#F4F8F7] border-2 border-[#1E3A4A]/20 rounded-sm shadow-xl shrink-0">
              <FileText className="h-8 w-8 text-[#1E3A4A]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="serif text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
                Correspondence
              </h1>
              <p className="sans text-[#E8F4F0] mt-2 text-sm tracking-wide leading-relaxed">
                Secure Client Communications & Case Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchMessages} className="border-2 border-white/20 hover:bg-white/10 text-white sans">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="All Messages"
          value={stats.total}
          icon={<Inbox className="h-5 w-5" />}
          active={readFilter === "all"}
          onClick={() => setReadFilter("all")}
        />
        <StatCard
          label="Unread"
          value={stats.unread}
          icon={<Mail className="h-5 w-5" />}
          color="amber"
          active={readFilter === "unread"}
          onClick={() => setReadFilter("unread")}
        />
        <StatCard
          label="Read"
          value={stats.read}
          icon={<MailOpen className="h-5 w-5" />}
          color="teal"
          active={readFilter === "read"}
          onClick={() => setReadFilter("read")}
        />
      </div>

      {/* Search and Filters */}
      <Card className="border-2 border-[#1E3A4A]/30 bg-gradient-to-br from-white via-[#F4F8F7]/30 to-white shadow-lg">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1E3A4A]/60" />
              <Input
                placeholder="Search correspondence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-2 border-slate-300 focus:border-[#1E3A4A] focus:ring-[#1E3A4A] sans"
              />
            </div>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-full sm:w-40 border-2 border-slate-300 sans">
                <Filter className="h-4 w-4 mr-2 text-[#1E3A4A]/60" />
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A4A]" />
        </div>
      ) : filteredMessages.length > 0 ? (
        <div className="space-y-3">
          {filteredMessages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onMarkRead={() => markAsRead(message.id)}
              onArchive={() => archiveMessage(message.id)}
              onUnarchive={() => unarchiveMessage(message.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-2 border-dashed border-[#1E3A4A]/30 bg-gradient-to-br from-white via-[#F4F8F7]/30 to-white shadow-lg">
          <CardContent className="py-16 text-center">
            <div className="p-4 bg-[#1E3A4A]/10 border-2 border-[#1E3A4A]/20 rounded-sm w-fit mx-auto mb-6">
              <MessageSquare className="h-10 w-10 text-[#1E3A4A]" strokeWidth={1.5} />
            </div>
            <h3 className="serif text-lg font-bold text-slate-900 mb-2">No Messages</h3>
            <p className="sans text-slate-600 max-w-sm mx-auto">
              {searchQuery || readFilter !== "all"
                ? "Try adjusting your filters to find what you're looking for"
                : "Correspondence from your cases will appear here"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "blue" | "teal" | "amber";
  active: boolean;
  onClick: () => void;
}) {
  const colorConfig = {
    blue: {
      text: "text-slate-900",
      activeBg: "bg-gradient-to-br from-white to-[#F4F8F7]/50",
      iconBg: "bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] border-2 border-[#1E3A4A]/40 text-[#F4F8F7] shadow-lg",
      ring: "border-2 border-[#1E3A4A]/40 shadow-xl",
    },
    teal: {
      text: "text-emerald-900",
      activeBg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
      iconBg: "bg-gradient-to-br from-emerald-900 to-emerald-800 border-2 border-emerald-900/40 text-emerald-50 shadow-lg",
      ring: "border-2 border-emerald-900/30 shadow-md",
    },
    amber: {
      text: "text-[#1E3A4A]",
      activeBg: "bg-gradient-to-br from-[#F4F8F7] to-[#E8F4F0]/50",
      iconBg: "bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] border-2 border-[#1E3A4A]/40 text-[#F4F8F7] shadow-lg",
      ring: "border-2 border-[#1E3A4A]/30 shadow-md",
    },
  };

  const config = color ? colorConfig[color] : {
    text: "text-slate-900",
    activeBg: "bg-gradient-to-br from-white to-[#F4F8F7]/50",
    iconBg: "bg-[#1E3A4A]/10 border-2 border-[#1E3A4A]/20 text-[#1E3A4A]",
    ring: "border-2 border-[#1E3A4A]/40 shadow-xl",
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-sm text-left transition-all duration-200 ${
        active
          ? `${config.activeBg} ${config.ring}`
          : "bg-white border-2 border-slate-300 hover:bg-[#F4F8F7] hover:border-[#1E3A4A]/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`serif text-2xl font-bold ${config.text}`}>{value}</p>
          <p className="sans text-xs text-slate-600 mt-0.5 tracking-[0.1em] uppercase font-bold">{label}</p>
        </div>
        <div className={`p-2.5 rounded-sm ${active ? config.iconBg : "bg-[#1E3A4A]/10 border border-[#1E3A4A]/20 text-[#1E3A4A]"}`}>
          {icon}
        </div>
      </div>
    </button>
  );
}

// Message Card Component
function MessageCard({
  message,
  onMarkRead,
  onArchive,
  onUnarchive,
}: {
  message: Message;
  onMarkRead: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
}) {
  const router = useRouter();

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const truncateContent = (content: string, maxLength: number = 120) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + "...";
  };

  // Determine if this message was sent by the professional (us) or received
  const isSentByMe = message.sender_type === "professional";

  // The contact is the OTHER party in the conversation
  const contactName = isSentByMe ? message.recipient_name : message.sender_name;
  const contactInitials = contactName
    ? contactName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleCardClick = () => {
    if (message.family_file_id) {
      router.push(`/professional/cases/${message.family_file_id}/messages`);
    }
  };

  return (
    <Card
      className={`group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden ${!message.is_read && !isSentByMe ? "border-2 border-[#1E3A4A]/40 bg-gradient-to-r from-[#F4F8F7]/50 to-white shadow-md" : "border-2 border-slate-300 bg-white hover:border-[#1E3A4A]/30"}`}
      onClick={handleCardClick}
    >
      {/* Top accent bar for unread received messages */}
      {!message.is_read && !isSentByMe && (
        <div className="h-1 bg-gradient-to-r from-[#1E3A4A] via-[#3DAA8A] to-[#1E3A4A]" />
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white shadow-md border-2 border-[#1E3A4A]/20">
            <AvatarFallback className={`serif font-bold ${!message.is_read && !isSentByMe ? "bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-[#F4F8F7]" : "bg-[#1E3A4A]/10 text-[#1E3A4A]"}`}>
              {contactInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className={`serif font-bold truncate ${!message.is_read && !isSentByMe ? "text-slate-900" : "text-slate-700"}`}>
                  {contactName || "Unknown"}
                </h3>
                {isSentByMe ? (
                  <Badge className="bg-emerald-50 text-emerald-900 border-2 border-emerald-200 shrink-0 sans">
                    <Send className="h-3 w-3 mr-1" strokeWidth={2} />
                    Sent
                  </Badge>
                ) : !message.is_read ? (
                  <Badge className="bg-amber-100 text-amber-900 border-2 border-amber-200 shrink-0 sans">
                    New
                  </Badge>
                ) : null}
              </div>
              <span className="sans text-xs text-slate-500 shrink-0">
                {formatRelativeTime(message.sent_at || message.created_at)}
              </span>
            </div>

            {message.subject && (
              <p className={`sans text-sm mt-0.5 ${!message.is_read && !isSentByMe ? "font-bold text-slate-800" : "text-slate-600"}`}>
                {message.subject}
              </p>
            )}

            <p className="sans text-sm text-slate-600 mt-1.5 line-clamp-2">
              {isSentByMe && <span className="text-slate-500">You: </span>}
              {truncateContent(message.content)}
            </p>

            {message.family_file_id && (
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-xs bg-[#F4F8F7] border-2 border-[#1E3A4A]/20 text-[#1E3A4A] sans">
                  <Scale className="h-3 w-3 mr-1" strokeWidth={2} />
                  Case {message.family_file_id.slice(0, 8)}...
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                  <MoreVertical className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Conversation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                {!message.is_read && !isSentByMe && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead();
                  }}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Read
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  message.is_archived ? onUnarchive() : onArchive();
                }}>
                  <Archive className="h-4 w-4 mr-2" />
                  {message.is_archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
