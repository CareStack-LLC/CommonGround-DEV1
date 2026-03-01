"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  Send,
  Copy,
  ExternalLink,
  RefreshCw,
  Download,
  Eye,
  Mail,
  Phone,
  MapPin,
  Users,
  FileCheck,
  Sparkles,
  FolderOpen,
  Scale,
  Gavel,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useProfessionalAuth } from "../../layout";
import { ConvertToCaseModal } from "@/components/professional/intake/convert-to-case-modal";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IntakeSession {
  id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  status: string;
  intake_type: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  message_count: number;
  intake_link: string;
  notes?: string;
}

interface IntakeMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
}

interface IntakeSummary {
  client_info: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  case_overview: string;
  children: Array<{
    name: string;
    age: number;
    special_needs?: string;
  }>;
  current_situation: string;
  goals: string[];
  concerns: string[];
  other_party_info?: string;
  timeline: string;
  recommended_actions: string[];
  confidence_score: number;
}

interface ExtractedData {
  parties: any;
  children: any[];
  custody_preferences: any;
  financial_info: any;
  schedule_preferences: any;
  special_considerations: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800" },
  reviewed: { label: "Reviewed", color: "bg-purple-100 text-purple-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
};

export default function IntakeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, activeFirm } = useProfessionalAuth();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<IntakeSession | null>(null);
  const [messages, setMessages] = useState<IntakeMessage[]>([]);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId, token]);

  const fetchSessionData = async () => {
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

      // Fetch outputs (summary + extracted data)
      const outputsResponse = await fetch(
        `${API_BASE}/api/v1/professional/intake/sessions/${sessionId}/outputs`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (outputsResponse.ok) {
        const outputsData = await outputsResponse.json();
        setSummary(outputsData.summary || null);
        setExtractedData(outputsData.extracted_data || null);
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyIntakeLink = () => {
    if (session?.intake_link) {
      navigator.clipboard.writeText(session.intake_link);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSummary = async () => {
    if (!token || !sessionId) return;

    setIsRefreshing(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/professional/intake/sessions/${sessionId}/refresh-summary`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const outputsData = await res.json();
        setSummary(outputsData.summary || null);
        setExtractedData(outputsData.extracted_data || null);
      }

      // Also refresh session details
      await fetchSessionData();
    } catch (error) {
      console.error("Error refreshing summary:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const markAsReviewed = async () => {
    if (!token || !sessionId) return;

    try {
      await fetch(
        `${API_BASE}/api/v1/professional/intake/sessions/${sessionId}/review`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchSessionData();
    } catch (error) {
      console.error("Error marking as reviewed:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Session not found</h3>
        <Button asChild>
          <Link href="/professional/intake">Back to Intake Center</Link>
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.pending;

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        .serif { font-family: 'Crimson Pro', serif; }
        .sans { font-family: 'Outfit', sans-serif; }
      `}</style>

      {/* Back Link */}
      <Link
        href="/professional/intake"
        className="inline-flex items-center gap-2 text-sm text-amber-900 hover:text-amber-950 font-medium border-b-2 border-transparent hover:border-amber-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        <span className="sans tracking-wide">Return to Intake Center</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-xl rounded-sm p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-amber-900 to-amber-800 text-amber-50 rounded-sm shadow-lg border-2 border-amber-900/40">
            <Gavel className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="serif text-3xl font-bold text-slate-900 tracking-tight">
              {session.client_name || "Unnamed Client"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className={`${statusConfig.color} border-2 sans tracking-wide`}>{statusConfig.label}</Badge>
              <span className="text-amber-900/30">|</span>
              <span className="sans text-sm text-slate-600 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {session.client_email}
              </span>
              {session.client_phone && (
                <>
                  <span className="text-amber-900/30">|</span>
                  <span className="sans text-sm text-slate-600 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {session.client_phone}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Convert to Case - primary CTA for completed/reviewed intakes */}
          {(session.status === "completed" || session.status === "reviewed") && (
            <Button
              size="sm"
              className="bg-amber-900 hover:bg-amber-950 text-amber-50 border-2 border-amber-900/40 shadow-lg gap-2 sans"
              onClick={() => setShowConvertModal(true)}
            >
              <Scale className="h-4 w-4" strokeWidth={1.5} />
              Convert to Case
            </Button>
          )}
          {/* Status-contextual secondary action */}
          {session.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(session.intake_link, "_blank")}
              className="border-2 border-amber-900/20 hover:bg-amber-50 sans"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Intake Form
            </Button>
          )}
          {session.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAsReviewed}
              className="border-2 border-emerald-900/20 hover:bg-emerald-50 text-emerald-900 sans"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Reviewed
            </Button>
          )}
          {session.status === "reviewed" && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-900 font-medium bg-emerald-50 border-2 border-emerald-200 rounded-sm px-3 py-1.5 sans">
              <CheckCircle2 className="h-4 w-4" />
              Review Complete
            </div>
          )}

          <Button variant="outline" size="sm" onClick={copyIntakeLink} className="border-2 border-slate-300 hover:bg-amber-50 sans">
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={refreshSummary} disabled={isRefreshing} className="border-2 border-slate-300 hover:bg-amber-50 sans">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Regenerating..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Convert to Case Modal */}
      <ConvertToCaseModal
        open={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        sessionId={sessionId}
        clientName={session.client_name || "Client"}
        token={token}
        firmId={activeFirm?.id}
        onSuccess={(caseId) => {
          // The modal shows success + open case button — also refresh session status
          fetchSessionData();
        }}
      />

      {/* Session Info */}
      <div className="grid md:grid-cols-4 gap-4">
        <InfoCard
          label="Created"
          value={formatDate(session.created_at)}
          icon={<Calendar className="h-4 w-4" />}
        />
        <InfoCard
          label="Last Updated"
          value={formatDate(session.updated_at)}
          icon={<Clock className="h-4 w-4" />}
        />
        <InfoCard
          label="Messages"
          value={session.message_count.toString()}
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <InfoCard
          label="Type"
          value={session.intake_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-amber-50/50 border-2 border-amber-900/10 p-1">
          <TabsTrigger
            value="overview"
            className="serif data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-900/20 data-[state=active]:text-amber-900"
          >
            <Sparkles className="h-4 w-4 mr-2" strokeWidth={1.5} />
            AI Summary
          </TabsTrigger>
          <TabsTrigger
            value="transcript"
            className="serif data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-900/20 data-[state=active]:text-amber-900"
          >
            <MessageSquare className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Transcript
          </TabsTrigger>
          <TabsTrigger
            value="extracted"
            className="serif data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-900/20 data-[state=active]:text-amber-900"
          >
            <FileCheck className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Extracted Data
          </TabsTrigger>
        </TabsList>

        {/* AI Summary Tab */}
        <TabsContent value="overview" className="mt-4">
          {summary ? (
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Case Overview */}
              <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                <CardHeader>
                  <CardTitle className="serif text-lg font-bold text-slate-900">Case Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="sans text-sm text-slate-700 leading-relaxed">{summary.case_overview}</p>
                </CardContent>
              </Card>

              {/* Current Situation */}
              <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                <CardHeader>
                  <CardTitle className="serif text-lg font-bold text-slate-900">Current Situation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="sans text-sm text-slate-700 leading-relaxed">{summary.current_situation}</p>
                </CardContent>
              </Card>

              {/* Children */}
              {summary.children && summary.children.length > 0 && (
                <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                  <CardHeader>
                    <CardTitle className="serif text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Users className="h-5 w-5" strokeWidth={1.5} />
                      Children
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.children.map((child, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-900/10 rounded-sm"
                        >
                          <span className="serif font-bold text-slate-900">{child.name}</span>
                          <span className="sans text-sm text-slate-600">
                            Age {child.age}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Goals */}
              <Card className="border-2 border-emerald-900/30 bg-gradient-to-br from-white via-emerald-50/30 to-white shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-900 via-emerald-600 to-emerald-900"></div>
                <CardHeader>
                  <CardTitle className="serif text-lg font-bold text-emerald-900">Client Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.goals.map((goal, index) => (
                      <li key={index} className="flex items-start gap-2 sans text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" strokeWidth={2} />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Concerns */}
              <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                <CardHeader>
                  <CardTitle className="serif text-lg font-bold text-amber-900">Key Concerns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.concerns.map((concern, index) => (
                      <li key={index} className="flex items-start gap-2 sans text-sm text-slate-700">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" strokeWidth={2} />
                        {concern}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              <Card className="lg:col-span-2 border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                <CardHeader>
                  <CardTitle className="serif text-lg font-bold text-amber-900">
                    Recommended Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {summary.recommended_actions.map((action, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-900/20 rounded-sm sans text-sm text-slate-700"
                      >
                        <span className="serif font-bold text-amber-900 min-w-[24px]">{index + 1}.</span>
                        {action}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Confidence Score */}
              <Card className="lg:col-span-2 border-2 border-amber-900/30 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-md">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-900" strokeWidth={2} />
                      <span className="sans text-sm font-bold text-amber-900 tracking-[0.1em] uppercase">AI Confidence Score</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-amber-900/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-900 rounded-full"
                          style={{ width: `${summary.confidence_score * 100}%` }}
                        />
                      </div>
                      <span className="serif text-sm font-bold text-amber-900">
                        {Math.round(summary.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-amber-900/30 mb-4" />
                <h3 className="serif text-lg font-bold text-slate-900 mb-2">
                  Summary Not Available
                </h3>
                <p className="sans text-slate-600">
                  {session.status === "completed"
                    ? "The AI summary is being generated..."
                    : "Summary will be available once the intake is completed."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-4">
          <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
            <CardHeader>
              <CardTitle className="serif text-lg font-bold text-slate-900">Conversation Transcript</CardTitle>
              <CardDescription className="sans text-slate-600">
                Full conversation between ARIA and the client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length > 0 ? (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === "assistant" ? "" : "flex-row-reverse"
                          }`}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
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
                          className={`flex-1 ${message.role === "assistant" ? "pr-12" : "pl-12"
                            }`}
                        >
                          <div
                            className={`p-3 rounded-lg ${message.role === "assistant"
                              ? "bg-muted"
                              : "bg-blue-50"
                              }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No messages yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extracted Data Tab */}
        <TabsContent value="extracted" className="mt-4">
          {extractedData ? (
            <div className="space-y-4">
              {/* Parties */}
              {extractedData.parties && (
                <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                  <CardHeader>
                    <CardTitle className="serif text-lg font-bold text-slate-900">Party Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-amber-50/50 border border-amber-900/10 p-3 rounded-sm overflow-auto sans">
                      {JSON.stringify(extractedData.parties, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Children */}
              {extractedData.children && extractedData.children.length > 0 && (
                <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                  <CardHeader>
                    <CardTitle className="serif text-lg font-bold text-slate-900">Children</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-amber-50/50 border border-amber-900/10 p-3 rounded-sm overflow-auto sans">
                      {JSON.stringify(extractedData.children, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Custody Preferences */}
              {extractedData.custody_preferences && (
                <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                  <CardHeader>
                    <CardTitle className="serif text-lg font-bold text-slate-900">Custody Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-amber-50/50 border border-amber-900/10 p-3 rounded-sm overflow-auto sans">
                      {JSON.stringify(extractedData.custody_preferences, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Schedule Preferences */}
              {extractedData.schedule_preferences && (
                <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                  <CardHeader>
                    <CardTitle className="serif text-lg font-bold text-slate-900">Schedule Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-amber-50/50 border border-amber-900/10 p-3 rounded-sm overflow-auto sans">
                      {JSON.stringify(extractedData.schedule_preferences, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Special Considerations */}
              {extractedData.special_considerations &&
                extractedData.special_considerations.length > 0 && (
                  <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                    <CardHeader>
                      <CardTitle className="serif text-lg font-bold text-slate-900">Special Considerations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {extractedData.special_considerations.map((item, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 sans text-sm p-3 bg-amber-50 border border-amber-900/20 rounded-sm"
                          >
                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" strokeWidth={2} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

              {/* Download Button */}
              <Button variant="outline" className="w-full border-2 border-amber-900/30 hover:bg-amber-50 sans">
                <Download className="h-4 w-4 mr-2" />
                Export Extracted Data (JSON)
              </Button>
            </div>
          ) : (
            <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg">
              <CardContent className="py-12 text-center">
                <FileCheck className="h-12 w-12 mx-auto text-amber-900/30 mb-4" />
                <h3 className="serif text-lg font-bold text-slate-900 mb-2">
                  No Extracted Data
                </h3>
                <p className="sans text-slate-600">
                  Structured data will be extracted once the intake is completed.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Info Card Component
function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-2 border-slate-300 bg-white shadow-sm">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-amber-900/60 mb-1">
          {icon}
          <span className="sans text-xs font-bold tracking-[0.1em] uppercase">{label}</span>
        </div>
        <p className="serif font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
