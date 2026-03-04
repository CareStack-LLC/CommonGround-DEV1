"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfessionalAuth } from "../../../../layout";
import { TemplateBuilder, type TemplateData } from "@/components/professional/firm/template-builder/TemplateBuilder";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Default empty template for "new" case
const EMPTY_TEMPLATE: TemplateData = {
    name: "",
    description: "",
    estimated_minutes: 10,
    sections: [
        {
            id: "s1",
            title: "Basic Information",
            description: "Gather essential background information",
            questions: [
                {
                    id: "q1",
                    text: "What is the primary reason you are seeking legal assistance?",
                    type: "textarea",
                    required: true,
                    placeholder: "Please describe your situation...",
                },
            ],
        },
    ],
};

export default function TemplateEditPage() {
    const params = useParams();
    const router = useRouter();
    const { token, activeFirm } = useProfessionalAuth();
    const { toast } = useToast();

    const templateId = params?.id as string;
    const isNew = templateId === "new";

    const [initialTemplate, setInitialTemplate] = useState<TemplateData | null>(null);
    const [isLoading, setIsLoading] = useState(!isNew);
    const [isSaving, setIsSaving] = useState(false);
    const [savedStatus, setSavedStatus] = useState<"idle" | "saved" | "published">("idle");

    // Load existing template if editing
    useEffect(() => {
        if (isNew) {
            setInitialTemplate(EMPTY_TEMPLATE);
            return;
        }
        if (!token) return;

        const load = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(
                    `${API_BASE}/api/v1/professional/templates/${templateId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (res.ok) {
                    const data = await res.json();
                    // Map backend shape to TemplateData
                    const td: TemplateData = {
                        name: data.name || "",
                        description: data.description || "",
                        estimated_minutes: data.estimated_minutes || 10,
                        sections: data.content?.sections || EMPTY_TEMPLATE.sections,
                    };
                    setInitialTemplate(td);
                } else {
                    toast({ title: "Could not load template", variant: "destructive" });
                    setInitialTemplate(EMPTY_TEMPLATE);
                }
            } catch {
                setInitialTemplate(EMPTY_TEMPLATE);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [templateId, token, isNew]);

    const buildPayload = (template: TemplateData, isDraft: boolean) => ({
        name: template.name || "Untitled Template",
        description: template.description || "",
        template_type: "intake",
        is_active: !isDraft,
        estimated_minutes: template.estimated_minutes,
        content: {
            sections: template.sections,
            version: 1,
        },
    });

    const handleSaveDraft = async (template: TemplateData) => {
        if (!token || !activeFirm) {
            toast({ title: "Authentication required", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            const url = isNew
                ? `${API_BASE}/api/v1/professional/templates?firm_id=${activeFirm.id}`
                : `${API_BASE}/api/v1/professional/templates/${templateId}`;
            const method = isNew ? "POST" : "PATCH";
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(buildPayload(template, true)),
            });
            if (res.ok) {
                const saved = await res.json();
                setSavedStatus("saved");
                toast({ title: "Draft saved", description: "Your template has been saved as a draft." });
                // If new, redirect to the actual ID
                if (isNew) {
                    router.replace(`/professional/firm/templates/${saved.id}/edit`);
                }
                setTimeout(() => setSavedStatus("idle"), 3000);
            } else {
                const err = await res.json().catch(() => ({}));
                toast({
                    title: "Save failed",
                    description: err.detail || "Please try again.",
                    variant: "destructive",
                });
            }
        } catch {
            toast({ title: "Network error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async (template: TemplateData) => {
        if (!token || !activeFirm) {
            toast({ title: "Authentication required", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            const url = isNew
                ? `${API_BASE}/api/v1/professional/templates?firm_id=${activeFirm.id}`
                : `${API_BASE}/api/v1/professional/templates/${templateId}`;
            const method = isNew ? "POST" : "PATCH";
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(buildPayload(template, false)),
            });
            if (res.ok) {
                setSavedStatus("published");
                toast({
                    title: "Template Published!",
                    description: "The template is now available for intake sessions.",
                });
                setTimeout(() => {
                    router.push("/professional/firm/templates");
                }, 1500);
            } else {
                const err = await res.json().catch(() => ({}));
                toast({
                    title: "Publish failed",
                    description: err.detail || "Please try again.",
                    variant: "destructive",
                });
            }
        } catch {
            toast({ title: "Network error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !initialTemplate) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div className="flex items-center gap-3">
                <Link href="/professional/firm/templates">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="h-4 w-4" />
                        Templates
                    </Button>
                </Link>
                <span className="text-slate-300">/</span>
                <h1 className="text-lg font-bold text-slate-800">
                    {isNew ? "New Template" : "Edit Template"}
                </h1>
                {savedStatus === "saved" && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Saved
                    </div>
                )}
                {savedStatus === "published" && (
                    <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Published!
                    </div>
                )}
            </div>

            {/* Template Builder */}
            <TemplateBuilder
                initialTemplate={initialTemplate}
                onSaveDraft={handleSaveDraft}
                onPublish={handlePublish}
                isSaving={isSaving}
            />
        </div>
    );
}
