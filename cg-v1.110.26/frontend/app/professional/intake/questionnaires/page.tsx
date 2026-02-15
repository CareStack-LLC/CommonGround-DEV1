"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Plus,
    GripVertical,
    Trash2,
    Eye,
    EyeOff,
    Save,
    Sparkles,
    MessageSquare,
    FileText,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    ToggleLeft,
    ToggleRight,
    Lock,
    Loader2,
    Settings2,
    Pencil,
    AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfessionalAuth } from "../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────
interface QuestionField {
    id: string;
    label: string;
    type: "text" | "textarea" | "select" | "multi_select" | "yes_no" | "scale";
    required: boolean;
    placeholder?: string;
    options?: string[]; // for select / multi_select
    scaleMin?: number;
    scaleMax?: number;
}

interface QuestionSection {
    id: string;
    title: string;
    description: string;
    fields: QuestionField[];
    collapsed?: boolean;
}

interface Questionnaire {
    id: string;
    name: string;
    description: string | null;
    template_type: string;
    content: { sections: QuestionSection[] };
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
}

const QUESTION_TYPES: { value: QuestionField["type"]; label: string; description: string }[] = [
    { value: "text", label: "Short Text", description: "Single-line text input" },
    { value: "textarea", label: "Long Text", description: "Multi-line text area" },
    { value: "select", label: "Dropdown", description: "Choose one from a list" },
    { value: "multi_select", label: "Multi-Select", description: "Choose multiple from a list" },
    { value: "yes_no", label: "Yes / No", description: "Simple binary choice" },
    { value: "scale", label: "Rating Scale", description: "Numeric scale (e.g. 1–10)" },
];

const STANDARD_SECTIONS = [
    "Basic Information",
    "Family Background",
    "Custody History",
    "Safety Concerns",
    "Children's Needs",
    "Communication Patterns",
    "Financial Overview",
    "Schedule Preferences",
    "Support Systems",
    "Goals & Expectations",
];

function generateId(): string {
    return Math.random().toString(36).substring(2, 10);
}

// ─── Page Component ──────────────────────────────────────────────
export default function QuestionnaireBuilderPage() {
    const { token, profile, isLoading: authLoading } = useProfessionalAuth();

    const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<"list" | "editor" | "preview">("list");

    // Editor state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [sections, setSections] = useState<QuestionSection[]>([]);
    const [saving, setSaving] = useState(false);
    const [isPublished, setIsPublished] = useState(false);

    // Tier check
    const isFreeUser = profile?.subscription_tier === "starter" || !profile?.subscription_tier;

    const fetchQuestionnaires = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(
                `${API_BASE}/api/v1/professional/firms/templates?template_type=intake`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setQuestionnaires(Array.isArray(data) ? data : data.templates || []);
            }
        } catch (err) {
            console.error("Error fetching questionnaires:", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchQuestionnaires();
    }, [fetchQuestionnaires]);

    // ─── Editor helpers ──────────────────────────────────────────
    const startNew = () => {
        setEditingId(null);
        setName("");
        setDescription("");
        setSections([
            {
                id: generateId(),
                title: "Getting Started",
                description: "Initial questions for the intake session",
                fields: [
                    {
                        id: generateId(),
                        label: "What brings you in today?",
                        type: "textarea",
                        required: true,
                        placeholder: "Please describe your situation...",
                    },
                ],
            },
        ]);
        setIsPublished(false);
        setActiveView("editor");
    };

    const startEdit = (q: Questionnaire) => {
        setEditingId(q.id);
        setName(q.name);
        setDescription(q.description || "");
        setSections(q.content?.sections || []);
        setIsPublished(q.is_active);
        setActiveView("editor");
    };

    const addSection = () => {
        setSections((prev) => [
            ...prev,
            {
                id: generateId(),
                title: "",
                description: "",
                fields: [],
            },
        ]);
    };

    const removeSection = (sectionId: string) => {
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
    };

    const updateSection = (sectionId: string, updates: Partial<QuestionSection>) => {
        setSections((prev) =>
            prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
        );
    };

    const moveSection = (index: number, direction: "up" | "down") => {
        const newSections = [...sections];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newSections.length) return;
        [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
        setSections(newSections);
    };

    const addField = (sectionId: string) => {
        setSections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? {
                        ...s,
                        fields: [
                            ...s.fields,
                            {
                                id: generateId(),
                                label: "",
                                type: "text" as const,
                                required: false,
                            },
                        ],
                    }
                    : s
            )
        );
    };

    const removeField = (sectionId: string, fieldId: string) => {
        setSections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
                    : s
            )
        );
    };

    const updateField = (sectionId: string, fieldId: string, updates: Partial<QuestionField>) => {
        setSections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? {
                        ...s,
                        fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
                    }
                    : s
            )
        );
    };

    // ─── Save ────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!token || !name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                description: description.trim() || null,
                template_type: "intake",
                content: { sections },
                is_active: isPublished,
            };

            const url = editingId
                ? `${API_BASE}/api/v1/professional/firms/templates/${editingId}`
                : `${API_BASE}/api/v1/professional/firms/templates`;

            const res = await fetch(url, {
                method: editingId ? "PUT" : "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                await fetchQuestionnaires();
                setActiveView("list");
            }
        } catch (err) {
            console.error("Error saving questionnaire:", err);
        } finally {
            setSaving(false);
        }
    };

    // ─── Template from standard sections ─────────────────────────
    const addStandardSection = (sectionName: string) => {
        setSections((prev) => [
            ...prev,
            {
                id: generateId(),
                title: sectionName,
                description: `Questions about ${sectionName.toLowerCase()}`,
                fields: [
                    {
                        id: generateId(),
                        label: "",
                        type: "text" as const,
                        required: false,
                        placeholder: `Enter a question about ${sectionName.toLowerCase()}...`,
                    },
                ],
            },
        ]);
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // ─── Tier Gate ───────────────────────────────────────────────
    if (isFreeUser) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/professional/intake">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Custom Questionnaires</h1>
                        <p className="text-muted-foreground">Build custom ARIA intake questionnaires</p>
                    </div>
                </div>

                <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
                    <CardContent className="py-12 text-center">
                        <Lock className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Solo Tier Required</h3>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                            Custom intake questionnaires are available on Solo tier ($99/month) and above.
                            The standard 17-section ARIA intake is available on all tiers.
                        </p>
                        <Link href="/professional/settings/subscription">
                            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                Upgrade to Solo
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── List View ───────────────────────────────────────────────
    if (activeView === "list") {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Link href="/professional/intake">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Custom Questionnaires</h1>
                            <p className="text-muted-foreground">
                                Build custom ARIA intake questionnaires for your practice
                            </p>
                        </div>
                    </div>
                    <Button onClick={startNew} className="bg-purple-600 hover:bg-purple-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        New Questionnaire
                    </Button>
                </div>

                {/* Standard intake callout */}
                <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Sparkles className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">
                                    Standard 17-Section Custody Intake
                                </p>
                                <p className="text-xs text-blue-600">
                                    The standard ARIA intake is always available alongside your custom questionnaires
                                </p>
                            </div>
                            <Badge variant="outline" className="border-blue-200 text-blue-700">
                                Always Active
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : questionnaires.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No custom questionnaires yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Create a custom questionnaire to gather practice-specific information from clients.
                            </p>
                            <Button onClick={startNew} variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Your First Questionnaire
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {questionnaires.map((q) => (
                            <Card
                                key={q.id}
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => startEdit(q)}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 rounded-lg">
                                                <FileText className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium">{q.name}</h3>
                                                {q.description && (
                                                    <p className="text-sm text-muted-foreground">{q.description}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {q.content?.sections?.length || 0} sections · v{q.version} ·
                                                    Updated {new Date(q.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={q.is_active ? "default" : "outline"}
                                                className={
                                                    q.is_active
                                                        ? "bg-green-100 text-green-700 border-green-200"
                                                        : "text-slate-500"
                                                }
                                            >
                                                {q.is_active ? "Published" : "Draft"}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEdit(q);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ─── Preview View ────────────────────────────────────────────
    if (activeView === "preview") {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setActiveView("editor")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold">Preview: {name || "Untitled"}</h1>
                            <p className="text-sm text-muted-foreground">
                                How ARIA will present these questions to clients
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline">Preview Mode</Badge>
                </div>

                {/* ARIA conversation preview */}
                <Card className="border-purple-200">
                    <CardContent className="py-6">
                        <div className="space-y-6">
                            {/* ARIA greeting */}
                            <div className="flex gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <div className="bg-purple-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                    <p className="text-sm">
                                        Hi there! I&apos;m ARIA, your intake assistant. I&apos;ll be asking you some
                                        questions to help your attorney understand your situation better.
                                        Let&apos;s get started.
                                    </p>
                                </div>
                            </div>

                            {sections.map((section) => (
                                <div key={section.id} className="space-y-4">
                                    {/* Section header */}
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="bg-purple-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                            <p className="text-sm font-medium">{section.title || "Untitled Section"}</p>
                                            {section.description && (
                                                <p className="text-xs text-purple-600 mt-1">{section.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Questions */}
                                    {section.fields.map((field) => (
                                        <div key={field.id} className="space-y-2">
                                            <div className="flex gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                                    <Sparkles className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="bg-purple-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                                    <p className="text-sm">
                                                        {field.label || "Untitled question"}
                                                        {field.required && (
                                                            <span className="text-red-500 ml-1">*</span>
                                                        )}
                                                    </p>
                                                    {field.type === "select" || field.type === "multi_select" ? (
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {(field.options || []).map((opt, i) => (
                                                                <Badge
                                                                    key={i}
                                                                    variant="outline"
                                                                    className="text-xs cursor-pointer hover:bg-purple-100"
                                                                >
                                                                    {opt}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : field.type === "yes_no" ? (
                                                        <div className="mt-2 flex gap-2">
                                                            <Badge variant="outline" className="cursor-pointer hover:bg-green-50">
                                                                Yes
                                                            </Badge>
                                                            <Badge variant="outline" className="cursor-pointer hover:bg-red-50">
                                                                No
                                                            </Badge>
                                                        </div>
                                                    ) : field.type === "scale" ? (
                                                        <div className="mt-2 flex gap-1">
                                                            {Array.from(
                                                                { length: (field.scaleMax || 10) - (field.scaleMin || 1) + 1 },
                                                                (_, i) => (
                                                                    <Badge
                                                                        key={i}
                                                                        variant="outline"
                                                                        className="text-xs cursor-pointer hover:bg-purple-100 w-7 justify-center"
                                                                    >
                                                                        {(field.scaleMin || 1) + i}
                                                                    </Badge>
                                                                )
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {/* Simulated user response */}
                                            <div className="flex gap-3 justify-end">
                                                <div className="bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%]">
                                                    <p className="text-sm text-slate-400 italic">
                                                        {field.placeholder || "Client response will appear here..."}
                                                    </p>
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-medium text-slate-500">CL</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── Editor View ─────────────────────────────────────────────
    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setActiveView("list")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">
                            {editingId ? "Edit Questionnaire" : "New Questionnaire"}
                        </h1>
                        <p className="text-muted-foreground">
                            Design custom questions for ARIA intake sessions
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setActiveView("preview")}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
                {/* Main Editor */}
                <div className="space-y-6">
                    {/* Metadata */}
                    <Card>
                        <CardContent className="py-4 space-y-4">
                            <div>
                                <Label htmlFor="q-name" className="text-sm font-medium">
                                    Questionnaire Name
                                </Label>
                                <Input
                                    id="q-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., High-Conflict Case Screening"
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="q-desc" className="text-sm font-medium">
                                    Description (optional)
                                </Label>
                                <Textarea
                                    id="q-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of when to use this questionnaire..."
                                    className="mt-1.5"
                                    rows={2}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                                <div>
                                    <p className="text-sm font-medium">Publish Status</p>
                                    <p className="text-xs text-muted-foreground">
                                        Published questionnaires can be used in intake sessions
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsPublished(!isPublished)}
                                    className={isPublished ? "text-green-600" : "text-slate-500"}
                                >
                                    {isPublished ? (
                                        <ToggleRight className="h-6 w-6 mr-1.5" />
                                    ) : (
                                        <ToggleLeft className="h-6 w-6 mr-1.5" />
                                    )}
                                    {isPublished ? "Published" : "Draft"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sections */}
                    {sections.map((section, sectionIndex) => (
                        <Card
                            key={section.id}
                            className="border-l-4 border-l-purple-400"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                        <Input
                                            value={section.title}
                                            onChange={(e) =>
                                                updateSection(section.id, { title: e.target.value })
                                            }
                                            placeholder="Section Title"
                                            className="font-medium border-0 shadow-none p-0 h-auto focus-visible:ring-0 text-base"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => moveSection(sectionIndex, "up")}
                                            disabled={sectionIndex === 0}
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => moveSection(sectionIndex, "down")}
                                            disabled={sectionIndex === sections.length - 1}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-500 hover:text-red-700"
                                            onClick={() => removeSection(section.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <Input
                                    value={section.description}
                                    onChange={(e) =>
                                        updateSection(section.id, { description: e.target.value })
                                    }
                                    placeholder="Section description (shown to ARIA)..."
                                    className="text-sm border-0 shadow-none p-0 h-auto focus-visible:ring-0 text-muted-foreground"
                                />
                            </CardHeader>

                            <CardContent className="space-y-3">
                                {section.fields.map((field, fieldIndex) => (
                                    <div
                                        key={field.id}
                                        className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3"
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs text-muted-foreground mt-2.5 w-5 text-right">
                                                Q{fieldIndex + 1}
                                            </span>
                                            <div className="flex-1 space-y-2">
                                                <Input
                                                    value={field.label}
                                                    onChange={(e) =>
                                                        updateField(section.id, field.id, { label: e.target.value })
                                                    }
                                                    placeholder="Enter your question..."
                                                    className="bg-white"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={field.type}
                                                        onValueChange={(val) =>
                                                            updateField(section.id, field.id, {
                                                                type: val as QuestionField["type"],
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className="w-[160px] h-8 text-xs bg-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {QUESTION_TYPES.map((qt) => (
                                                                <SelectItem key={qt.value} value={qt.value}>
                                                                    {qt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-8 text-xs ${field.required ? "text-red-600" : "text-slate-400"
                                                            }`}
                                                        onClick={() =>
                                                            updateField(section.id, field.id, {
                                                                required: !field.required,
                                                            })
                                                        }
                                                    >
                                                        {field.required ? "Required" : "Optional"}
                                                    </Button>
                                                </div>

                                                {/* Options for select types */}
                                                {(field.type === "select" || field.type === "multi_select") && (
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">
                                                            Options (comma-separated)
                                                        </Label>
                                                        <Input
                                                            value={(field.options || []).join(", ")}
                                                            onChange={(e) =>
                                                                updateField(section.id, field.id, {
                                                                    options: e.target.value
                                                                        .split(",")
                                                                        .map((o) => o.trim())
                                                                        .filter(Boolean),
                                                                })
                                                            }
                                                            placeholder="Option 1, Option 2, Option 3"
                                                            className="mt-1 bg-white text-sm"
                                                        />
                                                    </div>
                                                )}

                                                {/* Scale range */}
                                                {field.type === "scale" && (
                                                    <div className="flex gap-2 items-center">
                                                        <Label className="text-xs text-muted-foreground">From</Label>
                                                        <Input
                                                            type="number"
                                                            value={field.scaleMin || 1}
                                                            onChange={(e) =>
                                                                updateField(section.id, field.id, {
                                                                    scaleMin: parseInt(e.target.value) || 1,
                                                                })
                                                            }
                                                            className="w-16 h-8 bg-white text-sm"
                                                        />
                                                        <Label className="text-xs text-muted-foreground">to</Label>
                                                        <Input
                                                            type="number"
                                                            value={field.scaleMax || 10}
                                                            onChange={(e) =>
                                                                updateField(section.id, field.id, {
                                                                    scaleMax: parseInt(e.target.value) || 10,
                                                                })
                                                            }
                                                            className="w-16 h-8 bg-white text-sm"
                                                        />
                                                    </div>
                                                )}

                                                {/* Placeholder */}
                                                <Input
                                                    value={field.placeholder || ""}
                                                    onChange={(e) =>
                                                        updateField(section.id, field.id, {
                                                            placeholder: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Placeholder text (optional)..."
                                                    className="bg-white text-sm text-muted-foreground"
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-400 hover:text-red-600 mt-1"
                                                onClick={() => removeField(section.id, field.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addField(section.id)}
                                    className="w-full border-dashed"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Add Question
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    <Button variant="outline" onClick={addSection} className="w-full border-dashed h-12">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                    </Button>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Settings2 className="h-4 w-4" />
                                Quick Add Sections
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Click to add pre-titled sections
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            {STANDARD_SECTIONS.filter(
                                (s) => !sections.some((sec) => sec.title === s)
                            ).map((sectionName) => (
                                <Button
                                    key={sectionName}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-8"
                                    onClick={() => addStandardSection(sectionName)}
                                >
                                    <Plus className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                    {sectionName}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-1">
                            <p>{sections.length} section{sections.length !== 1 ? "s" : ""}</p>
                            <p>
                                {sections.reduce((sum, s) => sum + s.fields.length, 0)} total question
                                {sections.reduce((sum, s) => sum + s.fields.length, 0) !== 1 ? "s" : ""}
                            </p>
                            <p>
                                {sections.reduce(
                                    (sum, s) => sum + s.fields.filter((f) => f.required).length,
                                    0
                                )}{" "}
                                required
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-200 bg-purple-50/50">
                        <CardContent className="py-3">
                            <div className="flex items-start gap-2">
                                <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-purple-900">ARIA Integration</p>
                                    <p className="text-xs text-purple-600 mt-0.5">
                                        ARIA will use your sections and questions as a guide, adapting the conversation
                                        naturally while ensuring all required questions are covered.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
