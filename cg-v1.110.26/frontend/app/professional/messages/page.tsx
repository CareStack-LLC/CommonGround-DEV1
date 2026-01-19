"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  sender_email?: string;
  recipient_id: string;
  recipient_name: string;
  case_id?: string;
  case_name?: string;
  family_file_id?: string;
  subject?: string;
  content: string;
  is_read: boolean;
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
        setUnreadCount(data.count || 0);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <MessageSquare className="h-6 w-6" />
            </div>
            Messages
          </h1>
          <p className="text-muted-foreground mt-1">
            Secure communication with clients and co-parents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchMessages}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
          color="blue"
          active={readFilter === "unread"}
          onClick={() => setReadFilter("unread")}
        />
        <StatCard
          label="Read"
          value={stats.read}
          icon={<MailOpen className="h-5 w-5" />}
          color="emerald"
          active={readFilter === "read"}
          onClick={() => setReadFilter("read")}
        />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-full sm:w-40">
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : filteredMessages.length > 0 ? (
        <div className="space-y-2">
          {filteredMessages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onMarkRead={() => markAsRead(message.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No messages</h3>
            <p className="text-muted-foreground">
              {searchQuery || readFilter !== "all"
                ? "Try adjusting your filters"
                : "Messages from your cases will appear here"}
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
  color?: "blue" | "emerald" | "amber";
  active: boolean;
  onClick: () => void;
}) {
  const colorClasses = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border text-left transition-all ${
        active
          ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500/20"
          : "bg-card border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-2xl font-bold ${color ? colorClasses[color] : ""}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <div className={`p-2 rounded-lg ${color === "blue" ? "bg-blue-100 text-blue-600" : color === "emerald" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-600"}`}>
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
}: {
  message: Message;
  onMarkRead: () => void;
}) {
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

  return (
    <Card className={`hover:shadow-md transition-shadow cursor-pointer ${!message.is_read ? "bg-blue-50/50 border-blue-200" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className={`${!message.is_read ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}>
              {getInitials(message.sender_name || "?")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className={`font-semibold truncate ${!message.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                  {message.sender_name}
                </h3>
                {!message.is_read && (
                  <Badge className="bg-blue-100 text-blue-800 shrink-0">
                    New
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelativeTime(message.created_at)}
              </span>
            </div>

            {message.subject && (
              <p className={`text-sm mt-0.5 ${!message.is_read ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {message.subject}
              </p>
            )}

            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {truncateContent(message.content)}
            </p>

            {message.case_name && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {message.case_name}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to message detail
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  // Reply functionality
                }}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                {!message.is_read && (
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
                  // Archive functionality
                }}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
