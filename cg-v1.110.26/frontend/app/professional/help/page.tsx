"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Search, BookOpen, Sparkles, MessageCircleQuestion,
    PlayCircle, ChevronRight, Clock, ArrowLeft, ExternalLink,
    Compass, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProfessionalAuth } from "../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface HelpArticle {
    id: string;
    category: "getting-started" | "features" | "faqs";
    title: string;
    excerpt?: string;
    content: string;
    video_url?: string;
    read_time_minutes: number;
    sort_order: number;
}

interface Tour {
    id: string;
    label: string;
    description: string;
    steps: number;
    page: string;
}

// ─────────────────────────────────────────────
// Fallback static articles (shown while DB loads)
// ─────────────────────────────────────────────
const STATIC_ARTICLES: HelpArticle[] = [
    {
        id: "s1", category: "getting-started", title: "Welcome to CommonGround Professional",
        excerpt: "Learn the basics of the Professional Portal in 5 minutes.",
        content: "# Welcome to CommonGround Professional\n\nCommonGround Professional gives attorneys, mediators, and parenting coordinators a unified view of all their family law cases.\n\n## Key Features\n\n- **Dashboard** — Real-time case alerts and upcoming events\n- **Case Management** — Filter, tag, and bulk-manage all assigned cases\n- **ARIA Intake Center** — Send AI-powered intake sessions to clients\n- **Compliance Reports** — Generate court-ready PDF/Excel reports with SHA-256 verification",
        read_time_minutes: 3, sort_order: 1,
    },
    {
        id: "s2", category: "getting-started", title: "Setting Up Your Professional Profile",
        excerpt: "Add your credentials, practice areas, and bio to attract clients.",
        content: "# Setting Up Your Professional Profile\n\n## Required Fields\n\n- **Full Name** — As it appears on your bar card\n- **License Number & State** — Required for verification\n- **Professional Type** — Attorney, Mediator, Parenting Coordinator\n\n## Recommended\n\n- **Headline**, **Bio**, **Practice Areas**, **Languages**",
        read_time_minutes: 3, sort_order: 2,
    },
    {
        id: "s3", category: "features", title: "How to Send an ARIA Intake Session",
        excerpt: "Send clients an AI-powered intake form that extracts data automatically.",
        content: "# How to Send an ARIA Intake Session\n\n## Steps\n\n1. Go to **Intake Center**\n2. Click **New Intake**\n3. Enter client name, email, and phone\n4. Select an intake template\n5. Click **Send** — Client receives a secure link via email\n\n## After the Client Completes Intake\n\n- Status changes to **Completed**\n- Review the **AI Summary**, **Extracted Data**, and **Transcript**\n- Click **Convert to Case** to create a new case file",
        read_time_minutes: 5, sort_order: 4,
    },
    {
        id: "s4", category: "features", title: "Generating Compliance Reports",
        excerpt: "Create court-ready PDF and Excel compliance reports with SHA-256 verification.",
        content: "# Generating Compliance Reports\n\n## Steps\n\n1. Navigate to a case → **Compliance** tab\n2. Click **Generate Report**\n3. Select report type, date range, and export format (PDF or Excel)\n4. Enter optional signature line\n5. Click **Generate**\n\n## Verifying Integrity\n\nEach report shows a **SHA-256 hash** for tamper-proof verification.",
        read_time_minutes: 4, sort_order: 5,
    },
    {
        id: "s5", category: "features", title: "OCR: Importing Court Orders",
        excerpt: "Upload a court order PDF and let ARIA extract and lock fields automatically.",
        content: "# OCR: Importing Court Orders\n\n1. Go to **Documents → Upload Court Order**\n2. Select a supported California court form (FL-300, FL-311, etc.)\n3. ARIA extracts all fields with confidence scores\n4. Review and approve\n5. Fields are **locked** — parents cannot edit them",
        read_time_minutes: 4, sort_order: 6,
    },
    {
        id: "s6", category: "faqs", title: "What does my subscription tier include?",
        excerpt: "Compare Starter, Solo, and Firm plan features.",
        content: "# Subscription Tiers\n\n| Feature | Starter | Solo | Firm |\n|---------|---------|------|------|\n| Active Cases | 5 | 20 | Unlimited |\n| Team Members | 1 | 1 | Unlimited |\n| ARIA Intake | Basic | All | All + Custom |\n| OCR Court Forms | ✗ | ✓ | ✓ |\n| Compliance Reports | ✗ | ✓ PDF | ✓ PDF + Excel |\n| Firm Analytics | ✗ | ✗ | ✓ |",
        read_time_minutes: 2, sort_order: 7,
    },
    {
        id: "s7", category: "faqs", title: "How does ARIA flag messages?",
        excerpt: "Understanding ARIA's safety shield and communication analysis.",
        content: "# How ARIA Flags Messages\n\n## What ARIA Monitors\n\n- Harassment or threats\n- Alienation language\n- Financial coercion\n- Hostile tone\n\n## When a Message is Flagged\n\n1. ARIA assigns a severity (low / medium / high / severe)\n2. Tagged with categories\n3. Appears in the **ARIA Analysis** tab\n4. High-severity flags create dashboard alerts",
        read_time_minutes: 3, sort_order: 8,
    },
];

const TOURS: Tour[] = [
    { id: "dashboard", label: "Dashboard Tour", description: "Learn to read alerts, stats, and tasks at a glance.", steps: 7, page: "/professional/dashboard" },
    { id: "intake", label: "Intake Center Tour", description: "Send your first ARIA intake session to a client.", steps: 6, page: "/professional/intake" },
    { id: "cases", label: "Cases Tour", description: "Filter, tag, and bulk manage your case portfolio.", steps: 5, page: "/professional/cases" },
    { id: "reports", label: "Reports Tour", description: "Generate a court-ready compliance report.", steps: 5, page: "/professional/reports" },
];

// ─────────────────────────────────────────────
// Simple markdown → HTML renderer
// ─────────────────────────────────────────────
function renderMarkdown(md: string): string {
    return md
        .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-slate-900 mt-6 mb-3">$1</h1>')
        .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-slate-800 mt-5 mb-2">$1</h2>')
        .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-slate-700 mt-4 mb-1">$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 underline hover:text-blue-800" target="_blank">$1</a>')
        .replace(/^\| (.+) \|$/gm, (row) => {
            const cells = row.split('|').filter(Boolean).map(c => `<td class="px-3 py-2 border border-slate-200 text-xs text-slate-600">${c.trim()}</td>`).join('');
            return `<tr>${cells}</tr>`;
        })
        .replace(/<tr>(.+?)<\/tr>/gs, '<table class="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden my-3 text-sm"><tbody>$&</tbody></table>')
        .replace(/^- (.+)$/gm, '<li class="text-sm text-slate-600 ml-4 list-disc">$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li class="text-sm text-slate-600 ml-4 list-decimal">$2</li>')
        .replace(/\n\n/g, '<br /><br />');
}

// YouTube / Vimeo embed helpers
function getEmbedUrl(url: string): string | null {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vm = url.match(/vimeo\.com\/([0-9]+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    return null;
}

const CATEGORY_CONFIG = {
    "getting-started": { label: "Getting Started", icon: <Compass className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    features: { label: "Features", icon: <Sparkles className="h-4 w-4" />, color: "text-purple-600 bg-purple-50 border-purple-200" },
    faqs: { label: "FAQs", icon: <MessageCircleQuestion className="h-4 w-4" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
};

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function HelpCenterPage() {
    const { token, profile } = useProfessionalAuth();

    const [articles, setArticles] = useState<HelpArticle[]>(STATIC_ARTICLES);
    const [completedTours, setCompletedTours] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

    // Load articles from DB if available
    useEffect(() => {
        if (!token) return;
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/professional/help/articles?limit=50`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) setArticles(data);
                }
            } catch { /* use static fallback */ }

            // Load completed tours
            try {
                const tr = await fetch(`${API_BASE}/api/v1/professional/help/tours/completed`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (tr.ok) {
                    const tours = await tr.json();
                    setCompletedTours(tours.map((t: any) => t.tour_id || t));
                }
            } catch { /* tours not available yet */ }
        };
        load();
    }, [token]);

    const filtered = useMemo(() => {
        return articles
            .filter(a => {
                const matchCat = activeCategory === "all" || a.category === activeCategory;
                const matchSearch = !search ||
                    a.title.toLowerCase().includes(search.toLowerCase()) ||
                    a.excerpt?.toLowerCase().includes(search.toLowerCase()) ||
                    a.content.toLowerCase().includes(search.toLowerCase());
                return matchCat && matchSearch;
            })
            .sort((a, b) => a.sort_order - b.sort_order);
    }, [articles, activeCategory, search]);

    const startTour = async (tour: Tour) => {
        // In production this would launch react-joyride. For now navigate to page with tour query param.
        window.location.href = `${tour.page}?tour=${tour.id}`;
    };

    if (selectedArticle) {
        const embedUrl = selectedArticle.video_url ? getEmbedUrl(selectedArticle.video_url) : null;
        const cfg = CATEGORY_CONFIG[selectedArticle.category];
        return (
            <div className="max-w-3xl mx-auto space-y-5">
                <button
                    onClick={() => setSelectedArticle(null)}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Help Center
                </button>

                <div>
                    <Badge variant="outline" className={`text-xs ${cfg.color} mb-3 gap-1`}>
                        {cfg.icon}
                        {cfg.label}
                    </Badge>
                    <h1 className="text-2xl font-bold text-slate-900">{selectedArticle.title}</h1>
                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {selectedArticle.read_time_minutes} min read
                    </p>
                </div>

                {/* Video embed */}
                {embedUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-video">
                        <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                )}
                {selectedArticle.video_url && !embedUrl && (
                    <a href={selectedArticle.video_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                        <ExternalLink className="h-4 w-4" />
                        Watch video
                    </a>
                )}

                {/* Article content */}
                <Card className="border-slate-200">
                    <CardContent className="pt-6">
                        <div
                            className="prose prose-slate max-w-none text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedArticle.content) }}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-xl shadow-lg shadow-violet-500/20">
                            <HelpCircle className="h-6 w-6" />
                        </div>
                        Help Center
                    </h1>
                    <p className="text-slate-500 mt-1">Find answers, guides, and in-app tours</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-xl">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search help articles..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 border-slate-200 focus:border-violet-400"
                />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { id: "all", label: "All Articles", icon: <BookOpen className="h-4 w-4" /> },
                    { id: "getting-started", label: "Getting Started", icon: <Compass className="h-4 w-4" /> },
                    { id: "features", label: "Features", icon: <Sparkles className="h-4 w-4" /> },
                    { id: "faqs", label: "FAQs", icon: <MessageCircleQuestion className="h-4 w-4" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveCategory(tab.id); setSearch(""); }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${activeCategory === tab.id
                                ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Articles list */}
                <div className="lg:col-span-2 space-y-3">
                    {filtered.length === 0 ? (
                        <Card className="border-dashed border-slate-200">
                            <CardContent className="py-12 text-center">
                                <Search className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 font-medium">No articles found</p>
                                <p className="text-xs text-slate-400 mt-1">Try a different search term or category</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filtered.map(article => {
                            const cfg = CATEGORY_CONFIG[article.category];
                            return (
                                <button
                                    key={article.id}
                                    onClick={() => setSelectedArticle(article)}
                                    className="w-full text-left group"
                                >
                                    <Card className="border-slate-200 hover:shadow-md hover:border-violet-200 transition-all">
                                        <CardContent className="pt-4 pb-4">
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg border shrink-0 ${cfg.color}`}>
                                                    {cfg.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
                                                        {article.title}
                                                    </p>
                                                    {article.excerpt && (
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{article.excerpt}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {article.read_time_minutes} min
                                                        </span>
                                                        {article.video_url && (
                                                            <span className="text-xs text-blue-500 flex items-center gap-1">
                                                                <PlayCircle className="h-3 w-3" />
                                                                Video
                                                            </span>
                                                        )}
                                                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                                                            {cfg.label}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 transition-colors shrink-0 mt-1" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Tours sidebar */}
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="h-1 w-6 bg-violet-500 rounded-full" />
                        In-App Tours
                    </h2>
                    {TOURS.map(tour => {
                        const isDone = completedTours.includes(tour.id);
                        return (
                            <Card key={tour.id} className="border-slate-200">
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg shrink-0 ${isDone ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600"}`}>
                                            <PlayCircle className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">{tour.label}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{tour.description}</p>
                                            <p className="text-xs text-slate-400 mt-1">{tour.steps} steps</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className={`w-full mt-3 gap-1.5 text-xs ${isDone
                                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                                : "bg-violet-600 hover:bg-violet-700 text-white"
                                            }`}
                                        onClick={() => startTour(tour)}
                                    >
                                        <PlayCircle className="h-3.5 w-3.5" />
                                        {isDone ? "Replay Tour" : "Start Tour"}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
