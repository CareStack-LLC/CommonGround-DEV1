"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HelpCircle,
  ChevronDown,
  Search,
  FileText,
  Shield,
  Clock,
  Bot,
  Download,
  Users,
  Key,
  MessageCircle,
  ExternalLink,
  Mail,
  Phone,
  Scale,
} from "lucide-react";
import { useCourtAuth } from "../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Court Portal Help Page
 *
 * Help center and FAQ for court professionals.
 */

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Access & Security
  {
    category: "Access & Security",
    question: "How long does my case access last?",
    answer:
      "Access duration depends on your role. Guardians ad Litem typically have 120-day access, attorneys have 90-day access, and mediators have 60-day access. You'll receive notifications before your access expires, and you can request extensions if needed.",
  },
  {
    category: "Access & Security",
    question: "Is my access to case data logged?",
    answer:
      "Yes, all access to case data is logged with timestamps. This includes viewing messages, downloading reports, accessing agreements, and any exports. These logs may be included in audit reports and are retained for legal compliance.",
  },
  {
    category: "Access & Security",
    question: "Can I share my login credentials with colleagues?",
    answer:
      "No, sharing credentials is strictly prohibited. Each court professional must have their own account. All actions are logged under your identity, and sharing credentials compromises the audit trail and violates platform terms of use.",
  },
  {
    category: "Access & Security",
    question: "How do I enable two-factor authentication (MFA)?",
    answer:
      "Go to Settings > Account Information and click 'Enable MFA'. You'll be guided through setting up an authenticator app. MFA adds an extra layer of security and may be required by your organization.",
  },
  // Case Management
  {
    category: "Case Management",
    question: "How do I request access to a new case?",
    answer:
      "Click 'Request Access' on the dashboard or go to the Request Access page. You'll need the case number or parent email. The parents will be notified and must approve your access request.",
  },
  {
    category: "Case Management",
    question: "What information can I see in a case?",
    answer:
      "As a court professional, you have read-only access to: parent communications (with ARIA sentiment analysis), custody agreements, schedule and exchange records, compliance metrics, child information, and KidsCubbie items. You cannot modify any case data.",
  },
  {
    category: "Case Management",
    question: "Can I communicate with the parents through the platform?",
    answer:
      "Court professionals cannot send messages through CommonGround. The platform is designed for read-only observation. For communication, use your standard professional channels (email, phone, official correspondence).",
  },
  // Reports & Exports
  {
    category: "Reports & Exports",
    question: "What types of reports can I generate?",
    answer:
      "You can generate: Compliance Reports (schedule adherence, exchange records), Communication Analysis (message patterns, ARIA intervention rates), Agreement Summaries, Timeline Reports, and comprehensive Court Packages that combine all data types.",
  },
  {
    category: "Reports & Exports",
    question: "Are exported documents court-admissible?",
    answer:
      "Yes, all exports include SHA-256 verification hashes to ensure document integrity. Exports are watermarked with your professional identity and timestamp. The platform is designed to produce court-ready documentation.",
  },
  {
    category: "Reports & Exports",
    question: "How do I export data for a specific date range?",
    answer:
      "When generating any report, you can specify a date range. Go to the Reports page for the case, select the report type, and use the date picker to narrow down the time period. You can also filter by specific data types.",
  },
  // ARIA Assistant
  {
    category: "ARIA Assistant",
    question: "What is ARIA and how does it help?",
    answer:
      "ARIA (AI-Powered Relationship Intelligence Assistant) analyzes parent communications for tone and conflict indicators. It provides sentiment analysis, flags concerning patterns, and offers objective metrics on communication quality between co-parents.",
  },
  {
    category: "ARIA Assistant",
    question: "Can I ask ARIA questions about a case?",
    answer:
      "Yes, ARIA can answer factual questions about case data including schedules, exchange history, communication patterns, and compliance metrics. ARIA provides objective, data-driven responses and will indicate when information is unavailable.",
  },
  {
    category: "ARIA Assistant",
    question: "How reliable is ARIA's sentiment analysis?",
    answer:
      "ARIA uses advanced natural language processing but is a tool to supplement, not replace, professional judgment. Sentiment scores provide indicators of communication patterns over time. Individual message analysis should be reviewed in context.",
  },
  // Court Forms
  {
    category: "Court Forms",
    question: "What court forms are supported?",
    answer:
      "CommonGround supports California family law forms including FL-300 (Request for Order), FL-311 (Child Custody and Visitation Application), FL-320 (Responsive Declaration), FL-340/341/342 (Findings and Order After Hearing). More forms are being added.",
  },
  {
    category: "Court Forms",
    question: "How do I review submitted court forms?",
    answer:
      "Submitted forms appear in your Form Queue. Click on any form to review the details, supporting documentation, and parent responses. You can approve, request modifications, or reject forms based on your role and jurisdiction requirements.",
  },
];

const categories = [
  "Access & Security",
  "Case Management",
  "Reports & Exports",
  "ARIA Assistant",
  "Court Forms",
];

export default function CourtHelpPage() {
  const router = useRouter();
  const { professional, isLoading } = useCourtAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Filter FAQs
  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex p-3 bg-indigo-100 rounded-full mb-4">
          <HelpCircle className="h-8 w-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
        <p className="text-muted-foreground">
          Resources and answers for court professionals
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search help articles..."
          className="pl-10"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLink
          icon={<Scale className="h-5 w-5" />}
          label="Access Guidelines"
          href="#access"
        />
        <QuickLink
          icon={<FileText className="h-5 w-5" />}
          label="Report Guide"
          href="#reports"
        />
        <QuickLink
          icon={<Bot className="h-5 w-5" />}
          label="Using ARIA"
          href="#aria"
        />
        <QuickLink
          icon={<MessageCircle className="h-5 w-5" />}
          label="Contact Support"
          href="#contact"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className={selectedCategory === null ? "bg-indigo-600 hover:bg-indigo-700" : ""}
        >
          All Topics
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* FAQ List */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            {filteredFaqs.length} {filteredFaqs.length === 1 ? "article" : "articles"} found
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {filteredFaqs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No articles match your search. Try different keywords.
            </div>
          ) : (
            filteredFaqs.map((faq, index) => (
              <div key={index} className="py-3">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full text-left flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="font-medium text-foreground">{faq.question}</div>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {faq.category}
                    </Badge>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform ${
                      expandedFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="mt-3 text-sm text-muted-foreground pl-0 border-l-2 border-indigo-200 ml-0 pl-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Access Guidelines Section */}
      <Card id="access">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            Access Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <GuidelineCard
              title="Read-Only Access"
              description="All court professional access is read-only. You can view but not modify case data."
              icon={<Shield className="h-5 w-5" />}
            />
            <GuidelineCard
              title="Logged Activity"
              description="Every action you take is logged with timestamps for audit compliance."
              icon={<Clock className="h-5 w-5" />}
            />
            <GuidelineCard
              title="Watermarked Exports"
              description="All document exports are watermarked with your identity and timestamp."
              icon={<Download className="h-5 w-5" />}
            />
            <GuidelineCard
              title="Individual Accounts"
              description="Never share your login credentials. Each professional needs their own account."
              icon={<Key className="h-5 w-5" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card id="contact">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-indigo-600" />
            Contact Support
          </CardTitle>
          <CardDescription>
            Need additional help? Our support team is here for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
              <Mail className="h-5 w-5 text-indigo-600" />
              <div>
                <div className="font-medium">Email Support</div>
                <a
                  href="mailto:court-support@commonground.app"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  court-support@commonground.app
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
              <Phone className="h-5 w-5 text-indigo-600" />
              <div>
                <div className="font-medium">Phone Support</div>
                <div className="text-sm text-muted-foreground">
                  Mon-Fri, 9am-5pm PT
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Response time: Court professional inquiries are prioritized and
            typically receive a response within 4 business hours.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick Link Component
function QuickLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-sm font-medium"
    >
      <div className="text-indigo-600">{icon}</div>
      <span>{label}</span>
    </a>
  );
}

// Guideline Card Component
function GuidelineCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </div>
  );
}
