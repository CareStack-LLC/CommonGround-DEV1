"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Puzzle,
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Building2,
  FileText,
  MessageSquare,
  DollarSign,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  tagline: string;
  description: string;
  logo: string;
  category: "Practice Management" | "Billing" | "Communication" | "Document Management";
  status: "coming_soon" | "beta" | "active";
  benefits: string[];
  estimatedLaunch?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "mycase",
    name: "MyCase",
    tagline: "Sync cases, contacts, and billing seamlessly",
    description:
      "Automatically sync CommonGround case data with your MyCase practice management system. Eliminate duplicate data entry and keep client information synchronized.",
    logo: "MC",
    category: "Practice Management",
    status: "coming_soon",
    estimatedLaunch: "Q2 2026",
    benefits: [
      "Two-way case synchronization",
      "Automatic time tracking for billable activities",
      "Client contact sync",
      "Document linking and storage",
    ],
  },
  {
    id: "clio",
    name: "Clio Manage",
    tagline: "Connect your practice with co-parenting data",
    description:
      "Integrate CommonGround compliance reports, messages, and case events directly into Clio. Generate court-ready exports with one click.",
    logo: "CL",
    category: "Practice Management",
    status: "coming_soon",
    estimatedLaunch: "Q2 2026",
    benefits: [
      "Matter synchronization",
      "Automated document generation",
      "Billing integration for case activities",
      "Calendar event sync",
    ],
  },
  {
    id: "smokeball",
    name: "Smokeball",
    tagline: "Streamline family law workflows",
    description:
      "Connect Smokeball to CommonGround for automated time tracking, document assembly, and matter management for family law cases.",
    logo: "SB",
    category: "Practice Management",
    status: "coming_soon",
    estimatedLaunch: "Q3 2026",
    benefits: [
      "Automatic time entry capture",
      "Document template integration",
      "Court deadline tracking",
      "E-signature workflows",
    ],
  },
  {
    id: "practicepanther",
    name: "PracticePanther",
    tagline: "Unify case management across platforms",
    description:
      "Sync CommonGround case data with PracticePanther for centralized practice management. Access compliance reports and communication logs in one place.",
    logo: "PP",
    category: "Practice Management",
    status: "coming_soon",
    estimatedLaunch: "Q3 2026",
    benefits: [
      "Bidirectional case sync",
      "Automated invoice generation",
      "Task automation for custody events",
      "Client portal integration",
    ],
  },
];

export default function IntegrationsPage() {
  const [notifyRequests, setNotifyRequests] = useState<Set<string>>(new Set());

  const handleNotifyMe = (integrationId: string) => {
    setNotifyRequests((prev) => new Set(prev).add(integrationId));
    // In production: send notification request to backend
  };

  const categoryColors: Record<string, string> = {
    "Practice Management": "bg-blue-100 text-blue-700 border-blue-200",
    Billing: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Communication: "bg-purple-100 text-purple-700 border-purple-200",
    "Document Management": "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-500/20">
            <Puzzle className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Integrations Center</h1>
            <p className="text-slate-500 mt-1">
              Connect CommonGround with your existing practice management tools
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <Card className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-md">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Integrations Coming Soon</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                We're building seamless integrations with the most popular legal practice management
                platforms. Connect your existing tools with CommonGround to eliminate duplicate data
                entry, automate billing, and centralize case information.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Launching Q2-Q3 2026
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {INTEGRATIONS.length} Integrations Planned
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Integration Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {INTEGRATIONS.map((integration) => (
          <Card
            key={integration.id}
            className="group border-2 border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                    {integration.logo}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {integration.tagline}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`${categoryColors[integration.category]} border text-[10px] shrink-0`}
                >
                  {integration.category}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">{integration.description}</p>

              {/* Benefits */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Key Features
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {integration.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-md border border-slate-100"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="text-xs">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 flex items-center justify-between">
                {integration.estimatedLaunch && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Est. {integration.estimatedLaunch}</span>
                  </div>
                )}
                <Button
                  variant={notifyRequests.has(integration.id) ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleNotifyMe(integration.id)}
                  disabled={notifyRequests.has(integration.id)}
                  className={
                    notifyRequests.has(integration.id)
                      ? "border-emerald-200 text-emerald-700"
                      : "bg-purple-600 hover:bg-purple-700 text-white ml-auto"
                  }
                >
                  {notifyRequests.has(integration.id) ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      You'll be notified
                    </>
                  ) : (
                    <>
                      <Bell className="h-3.5 w-3.5 mr-1.5" />
                      Notify Me When Ready
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Custom Integration */}
      <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Don't see your practice management tool?
          </h3>
          <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
            We're actively expanding our integration partnerships. Let us know which tools you use
            and we'll prioritize accordingly.
          </p>
          <Button variant="outline" className="text-purple-600 border-purple-300 hover:bg-purple-50">
            <MessageSquare className="h-4 w-4 mr-2" />
            Request an Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
