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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useProfessionalAuth } from "../../layout";

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
  const { token } = useProfessionalAuth();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<IntakeSession | null>(null);
  const [messages, setMessages] = useState<IntakeMessage[]>([]);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

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
      {/* Back Link */}
      <Link
        href="/professional/intake"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Intake Center
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <Bot className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {session.client_name || "Unnamed Client"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {session.client_email}
              </span>
              {session.client_phone && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {session.client_phone}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyIntakeLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSessionData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {session.status === "completed" && (
            <Button
              size="sm"
              onClick={markAsReviewed}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Reviewed
            </Button>
          )}
        </div>
      </div>

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
        <TabsList>
          <TabsTrigger value="overview">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Summary
          </TabsTrigger>
          <TabsTrigger value="transcript">
            <MessageSquare className="h-4 w-4 mr-2" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="extracted">
            <FileCheck className="h-4 w-4 mr-2" />
            Extracted Data
          </TabsTrigger>
        </TabsList>

        {/* AI Summary Tab */}
        <TabsContent value="overview" className="mt-4">
          {summary ? (
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Case Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Case Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{summary.case_overview}</p>
                </CardContent>
              </Card>

              {/* Current Situation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Situation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{summary.current_situation}</p>
                </CardContent>
              </Card>

              {/* Children */}
              {summary.children && summary.children.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Children
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.children.map((child, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                        >
                          <span className="font-medium">{child.name}</span>
                          <span className="text-sm text-muted-foreground">
                            Age {child.age}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-emerald-600">Client Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.goals.map((goal, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Concerns */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-amber-600">Key Concerns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.concerns.map((concern, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        {concern}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base text-purple-600">
                    Recommended Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-2">
                    {summary.recommended_actions.map((action, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg text-sm"
                      >
                        <span className="font-medium text-purple-600">{index + 1}.</span>
                        {action}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Confidence Score */}
              <Card className="lg:col-span-2">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium">AI Confidence Score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${summary.confidence_score * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(summary.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Summary Not Available
                </h3>
                <p className="text-muted-foreground">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversation Transcript</CardTitle>
              <CardDescription>
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
                        className={`flex gap-3 ${
                          message.role === "assistant" ? "" : "flex-row-reverse"
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
                          className={`flex-1 ${
                            message.role === "assistant" ? "pr-12" : "pl-12"
                          }`}
                        >
                          <div
                            className={`p-3 rounded-lg ${
                              message.role === "assistant"
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Party Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                      {JSON.stringify(extractedData.parties, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Children */}
              {extractedData.children && extractedData.children.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Children</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                      {JSON.stringify(extractedData.children, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Custody Preferences */}
              {extractedData.custody_preferences && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Custody Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                      {JSON.stringify(extractedData.custody_preferences, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Schedule Preferences */}
              {extractedData.schedule_preferences && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Schedule Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                      {JSON.stringify(extractedData.schedule_preferences, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Special Considerations */}
              {extractedData.special_considerations &&
                extractedData.special_considerations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Special Considerations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {extractedData.special_considerations.map((item, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm p-2 bg-amber-50 rounded-lg"
                          >
                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

              {/* Download Button */}
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Extracted Data (JSON)
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No Extracted Data
                </h3>
                <p className="text-muted-foreground">
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
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}
