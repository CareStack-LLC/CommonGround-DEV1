"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Sparkles,
  FileCheck,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  FileText,
  Clipboard,
  Copy,
  ChevronRight,
  Printer,
  Mail,
  Phone,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
    date_of_birth?: string;
    special_needs?: string;
    school?: string;
    current_custody?: string;
  }>;
  current_situation: string;
  goals: string[];
  concerns: string[];
  other_party_info?: {
    name?: string;
    relationship?: string;
    contact_info?: string;
    concerns?: string[];
  };
  timeline: string;
  urgency_level: "low" | "medium" | "high" | "urgent";
  recommended_actions: string[];
  confidence_score: number;
  key_dates?: Array<{ date: string; description: string }>;
  legal_issues?: string[];
}

interface ExtractedData {
  parties: {
    petitioner?: any;
    respondent?: any;
  };
  children: Array<{
    name: string;
    age: number;
    date_of_birth?: string;
    school?: string;
    medical_needs?: string[];
    activities?: string[];
  }>;
  custody_preferences: {
    legal_custody?: string;
    physical_custody?: string;
    schedule_preference?: string;
    exchange_location?: string;
  };
  financial_info: {
    petitioner_income?: number;
    respondent_income?: number;
    child_support_current?: number;
    major_expenses?: string[];
  };
  schedule_preferences: {
    weekday?: string;
    weekend?: string;
    holidays?: string;
    summer?: string;
  };
  special_considerations: string[];
  communication_preferences: string[];
}

export default function IntakeOutputsPage() {
  const params = useParams();
  const { token } = useProfessionalAuth();
  const { toast } = useToast();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<IntakeSession | null>(null);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");

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

      // Fetch outputs
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
      console.error("Error fetching outputs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportAsJson = () => {
    const data = { summary, extracted_data: extractedData };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intake-outputs-${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!summary && !extractedData) {
    return (
      <div className="space-y-6">
        <Link
          href={`/professional/intake/${sessionId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Session
        </Link>

        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Outputs Not Available</h3>
            <p className="text-muted-foreground mb-4">
              {session?.status === "completed"
                ? "The AI is still processing this intake. Check back shortly."
                : "Outputs will be available once the intake is completed."}
            </p>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/professional/intake/${sessionId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Session
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <Sparkles className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI-Generated Outputs</h1>
            <p className="text-muted-foreground mt-1">
              Summary and extracted data from {session?.client_name}'s intake
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAsJson}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Confidence Score */}
      {summary && (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">AI Confidence Score</p>
                  <p className="text-sm text-muted-foreground">
                    Based on completeness and clarity of responses
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={summary.confidence_score * 100} className="w-32 h-2" />
                <span className="text-lg font-bold text-purple-600">
                  {Math.round(summary.confidence_score * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="summary">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Summary
          </TabsTrigger>
          <TabsTrigger value="extracted">
            <FileCheck className="h-4 w-4 mr-2" />
            Extracted Data
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Clipboard className="h-4 w-4 mr-2" />
            Next Steps
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4 space-y-4">
          {summary && (
            <>
              {/* Client Info Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{summary.client_info.email}</span>
                    </div>
                    {summary.client_info.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{summary.client_info.phone}</span>
                      </div>
                    )}
                    {summary.client_info.address && (
                      <div className="flex items-center gap-2 md:col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{summary.client_info.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Urgency and Timeline */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Urgency Level</p>
                        <Badge className={`mt-1 ${getUrgencyColor(summary.urgency_level)}`}>
                          {summary.urgency_level.toUpperCase()}
                        </Badge>
                      </div>
                      <AlertCircle
                        className={`h-8 w-8 ${
                          summary.urgency_level === "urgent" || summary.urgency_level === "high"
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Timeline</p>
                        <p className="font-medium mt-1">{summary.timeline}</p>
                      </div>
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Case Overview */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Case Overview</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(summary.case_overview)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{summary.case_overview}</p>
                </CardContent>
              </Card>

              {/* Current Situation */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Current Situation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{summary.current_situation}</p>
                </CardContent>
              </Card>

              {/* Children */}
              {summary.children && summary.children.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Children ({summary.children.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {summary.children.map((child, index) => (
                        <div
                          key={index}
                          className="p-3 bg-muted/50 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{child.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span>Age {child.age}</span>
                              {child.school && (
                                <>
                                  <span>|</span>
                                  <span>{child.school}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {child.special_needs && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700">
                              Special Needs
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Goals and Concerns */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
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

                <Card>
                  <CardHeader className="pb-2">
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
              </div>

              {/* Other Party Info */}
              {summary.other_party_info && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Other Party Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {summary.other_party_info.name && (
                        <p>
                          <span className="text-muted-foreground">Name:</span>{" "}
                          {summary.other_party_info.name}
                        </p>
                      )}
                      {summary.other_party_info.relationship && (
                        <p>
                          <span className="text-muted-foreground">Relationship:</span>{" "}
                          {summary.other_party_info.relationship}
                        </p>
                      )}
                      {summary.other_party_info.concerns && (
                        <div>
                          <span className="text-muted-foreground">Concerns:</span>
                          <ul className="mt-1 space-y-1 pl-4">
                            {summary.other_party_info.concerns.map((concern, i) => (
                              <li key={i} className="list-disc">{concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Legal Issues */}
              {summary.legal_issues && summary.legal_issues.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-blue-600">Identified Legal Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {summary.legal_issues.map((issue, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50">
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Extracted Data Tab */}
        <TabsContent value="extracted" className="mt-4 space-y-4">
          {extractedData && (
            <Accordion type="multiple" defaultValue={["children", "custody"]}>
              {/* Parties */}
              {extractedData.parties && (
                <AccordionItem value="parties">
                  <AccordionTrigger>Party Information</AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                      {JSON.stringify(extractedData.parties, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Children */}
              {extractedData.children && extractedData.children.length > 0 && (
                <AccordionItem value="children">
                  <AccordionTrigger>
                    Children ({extractedData.children.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {extractedData.children.map((child, index) => (
                        <Card key={index}>
                          <CardContent className="pt-4">
                            <div className="grid md:grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Name:</span>{" "}
                                <span className="font-medium">{child.name}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Age:</span>{" "}
                                <span className="font-medium">{child.age}</span>
                              </div>
                              {child.date_of_birth && (
                                <div>
                                  <span className="text-muted-foreground">DOB:</span>{" "}
                                  <span className="font-medium">{child.date_of_birth}</span>
                                </div>
                              )}
                              {child.school && (
                                <div>
                                  <span className="text-muted-foreground">School:</span>{" "}
                                  <span className="font-medium">{child.school}</span>
                                </div>
                              )}
                              {child.medical_needs && child.medical_needs.length > 0 && (
                                <div className="md:col-span-2">
                                  <span className="text-muted-foreground">Medical:</span>{" "}
                                  {child.medical_needs.join(", ")}
                                </div>
                              )}
                              {child.activities && child.activities.length > 0 && (
                                <div className="md:col-span-2">
                                  <span className="text-muted-foreground">Activities:</span>{" "}
                                  {child.activities.join(", ")}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Custody Preferences */}
              {extractedData.custody_preferences && (
                <AccordionItem value="custody">
                  <AccordionTrigger>Custody Preferences</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      {extractedData.custody_preferences.legal_custody && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground text-xs">Legal Custody</p>
                          <p className="font-medium">
                            {extractedData.custody_preferences.legal_custody}
                          </p>
                        </div>
                      )}
                      {extractedData.custody_preferences.physical_custody && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground text-xs">Physical Custody</p>
                          <p className="font-medium">
                            {extractedData.custody_preferences.physical_custody}
                          </p>
                        </div>
                      )}
                      {extractedData.custody_preferences.schedule_preference && (
                        <div className="p-3 bg-muted/50 rounded-lg md:col-span-2">
                          <p className="text-muted-foreground text-xs">Schedule Preference</p>
                          <p className="font-medium">
                            {extractedData.custody_preferences.schedule_preference}
                          </p>
                        </div>
                      )}
                      {extractedData.custody_preferences.exchange_location && (
                        <div className="p-3 bg-muted/50 rounded-lg md:col-span-2">
                          <p className="text-muted-foreground text-xs">Exchange Location</p>
                          <p className="font-medium">
                            {extractedData.custody_preferences.exchange_location}
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Schedule Preferences */}
              {extractedData.schedule_preferences && (
                <AccordionItem value="schedule">
                  <AccordionTrigger>Schedule Preferences</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      {Object.entries(extractedData.schedule_preferences).map(([key, value]) => (
                        value && (
                          <div key={key} className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-muted-foreground text-xs capitalize">{key}</p>
                            <p className="font-medium">{value}</p>
                          </div>
                        )
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Financial Info */}
              {extractedData.financial_info && (
                <AccordionItem value="financial">
                  <AccordionTrigger>Financial Information</AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                      {JSON.stringify(extractedData.financial_info, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Special Considerations */}
              {extractedData.special_considerations &&
                extractedData.special_considerations.length > 0 && (
                  <AccordionItem value="special">
                    <AccordionTrigger>Special Considerations</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {extractedData.special_considerations.map((item, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg text-sm"
                          >
                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
            </Accordion>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="mt-4 space-y-4">
          {summary && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-purple-600">
                    Recommended Next Steps
                  </CardTitle>
                  <CardDescription>
                    AI-generated action items based on the intake
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.recommended_actions.map((action, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-200 text-purple-700 text-sm font-medium shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-sm">{action}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Key Dates */}
              {summary.key_dates && summary.key_dates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Key Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.key_dates.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 border rounded-lg"
                        >
                          <Badge variant="outline">{item.date}</Badge>
                          <span className="text-sm">{item.description}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Create Case from Intake
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Consultation
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Follow-up Email
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Printer className="h-4 w-4 mr-2" />
                      Print Summary
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
