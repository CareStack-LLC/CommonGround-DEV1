"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  RefreshCw,
  User,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Bot,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProfessionalAuth } from "../../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MessageThread {
  thread_id: string;
  subject?: string;
  participant_names: string[];
  message_count: number;
  first_message_at: string;
  last_message_at: string;
  has_interventions: boolean;
}

interface ParentMessage {
  id: string;
  content: string;
  sender_name: string;
  sender_role: "parent_a" | "parent_b";
  sent_at: string;
  was_flagged: boolean;
  flag_category?: string;
  was_rewritten: boolean;
  original_content?: string;
}

interface CommunicationStats {
  // Backend fields
  period_days?: number;
  total_messages: number;
  flagged_messages?: number;
  flag_rate?: number;
  messages_by_sender?: Record<string, number>;
  recent_trend?: "increasing" | "decreasing" | "stable";
  last_7_days?: number;
  previous_7_days?: number;
  // Legacy/optional fields for backwards compatibility
  messages_last_30_days?: number;
  avg_response_time_hours?: number;
  intervention_rate?: number;
  messages_by_parent?: {
    parent_a: number;
    parent_b: number;
  };
  sentiment_trend?: "improving" | "stable" | "declining";
  // Enhanced stats
  good_faith_scores?: {
    parent_a: number;
    parent_b: number;
  };
  flag_categories?: Record<string, number>;
  topic_categories?: Record<string, number>;
  weekly_message_counts?: Array<{
    week: string;
    count: number;
    flagged: number;
  }>;
}

export default function CommunicationsPage() {
  const params = useParams();
  const { token } = useProfessionalAuth();
  const familyFileId = params.familyFileId as string;

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "flagged" | "rewritten">("all");
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [familyFileId, token]);

  useEffect(() => {
    if (selectedThread) {
      fetchThreadMessages(selectedThread);
    }
  }, [selectedThread, token]);

  const fetchData = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      // Fetch threads and stats in parallel
      const [threadsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/communications/threads`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/communications/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (threadsRes.ok) {
        const threadsData = await threadsRes.json();
        setThreads(threadsData.items || []);
        // Auto-select first thread if available
        if (threadsData.items?.length > 0) {
          setSelectedThread(threadsData.items[0].thread_id);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching communications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    if (!token || !familyFileId) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/communications?thread_id=${threadId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const toggleMessageExpand = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (filterType === "flagged" && !msg.was_flagged) return false;
    if (filterType === "rewritten" && !msg.was_rewritten) return false;
    if (searchQuery && !msg.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getSentimentIcon = (trend: string) => {
    switch (trend) {
      case "improving":
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

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
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <MessageSquare className="h-6 w-6" />
            </div>
            Parent Communications
          </h1>
          <p className="text-muted-foreground mt-1">
            View message history between co-parents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Messages</p>
                      <p className="text-2xl font-bold">{stats.total_messages}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Last 7 Days</p>
                      <p className="text-2xl font-bold">{stats.last_7_days ?? stats.messages_last_30_days ?? 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Flagged Messages</p>
                      <p className="text-2xl font-bold">
                        {stats.flag_rate != null ? `${stats.flag_rate}%` :
                         stats.intervention_rate != null ? `${(stats.intervention_rate * 100).toFixed(1)}%` :
                         `${stats.flagged_messages ?? 0}`}
                      </p>
                    </div>
                    <Bot className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Activity Trend</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getSentimentIcon(stats.recent_trend || stats.sentiment_trend || "stable")}
                        <span className="text-lg font-medium capitalize">
                          {stats.recent_trend || stats.sentiment_trend || "stable"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Stats Grid */}
          {stats && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Message Balance - shows messages_by_parent or messages_by_sender */}
              {(stats.messages_by_parent || stats.messages_by_sender) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Message Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.messages_by_parent ? (
                        <>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Parent A</span>
                              <span className="font-medium">{stats.messages_by_parent.parent_a ?? 0}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{
                                  width: `${stats.total_messages > 0 ? ((stats.messages_by_parent.parent_a ?? 0) / stats.total_messages) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Parent B</span>
                              <span className="font-medium">{stats.messages_by_parent.parent_b ?? 0}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{
                                  width: `${stats.total_messages > 0 ? ((stats.messages_by_parent.parent_b ?? 0) / stats.total_messages) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </>
                      ) : stats.messages_by_sender ? (
                        <>
                          {Object.entries(stats.messages_by_sender).slice(0, 2).map(([senderId, count], index) => (
                            <div key={senderId}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Sender {index + 1}</span>
                                <span className="font-medium">{count}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}
                                  style={{
                                    width: `${stats.total_messages > 0 ? (count / stats.total_messages) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Good Faith Scores */}
              {stats.good_faith_scores && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Good Faith Scores
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ARIA-assessed communication quality
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Parent A</span>
                          <span className={`font-medium ${
                            stats.good_faith_scores.parent_a >= 0.7 ? "text-emerald-600" :
                            stats.good_faith_scores.parent_a >= 0.4 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {Math.round(stats.good_faith_scores.parent_a * 100)}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              stats.good_faith_scores.parent_a >= 0.7 ? "bg-emerald-500" :
                              stats.good_faith_scores.parent_a >= 0.4 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${stats.good_faith_scores.parent_a * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Parent B</span>
                          <span className={`font-medium ${
                            stats.good_faith_scores.parent_b >= 0.7 ? "text-emerald-600" :
                            stats.good_faith_scores.parent_b >= 0.4 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {Math.round(stats.good_faith_scores.parent_b * 100)}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              stats.good_faith_scores.parent_b >= 0.7 ? "bg-emerald-500" :
                              stats.good_faith_scores.parent_b >= 0.4 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${stats.good_faith_scores.parent_b * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ARIA Flag Categories */}
              {stats.flag_categories && Object.keys(stats.flag_categories).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Flag Categories
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Types of ARIA interventions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.flag_categories)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([category, count]) => (
                          <div key={category} className="flex items-center justify-between">
                            <span className="text-sm capitalize">
                              {category.replace(/_/g, " ")}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {count}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Topic Categories */}
              {stats.topic_categories && Object.keys(stats.topic_categories).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Discussion Topics
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Most frequent message categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.topic_categories)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([topic, count]) => (
                          <div key={topic} className="flex items-center justify-between">
                            <span className="text-sm capitalize">
                              {topic.replace(/_/g, " ")}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {count}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Weekly Message Trend */}
              {stats.weekly_message_counts && stats.weekly_message_counts.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Message Frequency Trend
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Weekly message volume over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between gap-1 h-24">
                      {stats.weekly_message_counts.map((week, index) => {
                        const maxCount = Math.max(...stats.weekly_message_counts!.map(w => w.count));
                        const height = maxCount > 0 ? (week.count / maxCount) * 100 : 0;
                        const flaggedHeight = maxCount > 0 ? (week.flagged / maxCount) * 100 : 0;

                        return (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex flex-col justify-end h-20 relative">
                              <div
                                className="w-full bg-purple-200 rounded-t transition-all"
                                style={{ height: `${height}%` }}
                              >
                                <div
                                  className="w-full bg-amber-400 rounded-t absolute bottom-0"
                                  style={{ height: `${flaggedHeight}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                              {week.week}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-200 rounded" />
                        <span className="text-muted-foreground">Total</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-amber-400 rounded" />
                        <span className="text-muted-foreground">Flagged</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Message View */}
          <div className="grid lg:grid-cols-4 gap-4">
            {/* Thread List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Threads</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-2 space-y-1">
                    {threads.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No message threads found
                      </p>
                    ) : (
                      threads.map((thread) => (
                        <button
                          key={thread.thread_id}
                          onClick={() => setSelectedThread(thread.thread_id)}
                          className={`w-full p-3 rounded-lg text-left transition-colors ${
                            selectedThread === thread.thread_id
                              ? "bg-purple-50 border border-purple-200"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">
                              {thread.subject || "General"}
                            </span>
                            {thread.has_interventions && (
                              <Bot className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {thread.message_count} messages
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(thread.last_message_at)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2 border-b">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Messages</SelectItem>
                      <SelectItem value="flagged">Flagged Only</SelectItem>
                      <SelectItem value="rewritten">Rewritten Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-4">
                    {filteredMessages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No messages to display</p>
                      </div>
                    ) : (
                      filteredMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg border ${
                            message.sender_role === "parent_a"
                              ? "border-l-4 border-l-blue-500 bg-blue-50/50"
                              : "border-l-4 border-l-purple-500 bg-purple-50/50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  message.sender_role === "parent_a"
                                    ? "border-blue-300 text-blue-700"
                                    : "border-purple-300 text-purple-700"
                                }
                              >
                                {message.sender_name}
                              </Badge>
                              {message.was_flagged && (
                                <Badge className="bg-amber-100 text-amber-800">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {message.flag_category || "Flagged"}
                                </Badge>
                              )}
                              {message.was_rewritten && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Bot className="h-3 w-3 mr-1" />
                                  ARIA Rewritten
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.sent_at)}
                            </span>
                          </div>

                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                          {message.was_rewritten && message.original_content && (
                            <Collapsible
                              open={expandedMessages.has(message.id)}
                              onOpenChange={() => toggleMessageExpand(message.id)}
                            >
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="mt-2 text-xs">
                                  {expandedMessages.has(message.id) ? (
                                    <>
                                      <ChevronUp className="h-3 w-3 mr-1" />
                                      Hide Original
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                      Show Original
                                    </>
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-xs text-red-600 font-medium mb-1">
                                    Original (before ARIA)
                                  </p>
                                  <p className="text-sm text-red-800 whitespace-pre-wrap">
                                    {message.original_content}
                                  </p>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
