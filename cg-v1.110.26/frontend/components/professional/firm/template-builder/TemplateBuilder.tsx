"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, GripVertical, Plus, Trash2, Eye, EyeOff, CheckCircle2, AlertTriangle, Bot, MessageSquare, ChevronDown, ChevronRight, Save, Rocket, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type QuestionType = "text" | "textarea" | "select" | "date" | "yes_no" | "multiple_choice";

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    required: boolean;
    placeholder?: string;
    options?: string[];  // for select / multiple_choice
}

export interface Section {
    id: string;
    title: string;
    description?: string;
    questions: Question[];
}

export interface TemplateData {
    name: string;
    description?: string;
    estimated_minutes: number;
    sections: Section[];
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

const blankSection = (): Section => ({
    id: uid(),
    title: "New Section",
    description: "",
    questions: [],
});

const blankQuestion = (): Question => ({
    id: uid(),
    text: "",
    type: "text",
    required: true,
    placeholder: "",
    options: [],
});

// ─────────────────────────────────────────────
// ValidationErrors component
// ─────────────────────────────────────────────
function ValidationErrors({ errors }: { errors: string[] }) {
    if (!errors.length) return null;
    return (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
            <ul className="space-y-1 list-disc list-inside">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
        </div>
    );
}

// ─────────────────────────────────────────────
// LivePreview component
// ─────────────────────────────────────────────
function LivePreview({ template }: { template: TemplateData }) {
    const [activeSection, setActiveSection] = useState(0);

    const section = template.sections[activeSection];

    return (
        <div className="h-full flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            {/* Preview header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Bot className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">ARIA — {template.name || "Untitled Template"}</p>
                    <p className="text-xs text-slate-400">{template.estimated_minutes} min estimated</p>
                </div>
                <Badge variant="outline" className="text-xs text-purple-600 border-purple-200 bg-purple-50">Preview</Badge>
            </div>

            {/* Section picker */}
            {template.sections.length > 1 && (
                <div className="flex gap-1 px-3 py-2 bg-white border-b border-slate-100 overflow-x-auto">
                    {template.sections.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(i)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${i === activeSection
                                    ? "bg-purple-600 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                        >
                            {s.title || `Section ${i + 1}`}
                        </button>
                    ))}
                </div>
            )}

            {/* Chat preview */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* ARIA greeting */}
                <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-purple-100 rounded-full shrink-0">
                        <Bot className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 shadow-sm border border-slate-100 max-w-[85%]">
                        <p className="text-xs text-slate-700">
                            {section
                                ? `Let's go through ${section.title}. ${section.description || "I'll guide you through each question."}`
                                : "Hello! I'm ARIA, your AI intake assistant. Let's get started."}
                        </p>
                    </div>
                </div>

                {/* Questions */}
                {section?.questions.map((q, qi) => (
                    <div key={q.id} className="space-y-2">
                        {/* ARIA asks */}
                        <div className="flex items-start gap-2">
                            <div className="p-1.5 bg-purple-100 rounded-full shrink-0">
                                <Bot className="h-3.5 w-3.5 text-purple-600" />
                            </div>
                            <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 shadow-sm border border-slate-100 max-w-[85%]">
                                <p className="text-xs text-slate-700">
                                    {q.text || `Question ${qi + 1}`}
                                    {q.required && <span className="text-red-400 ml-1">*</span>}
                                </p>
                            </div>
                        </div>
                        {/* Client response placeholder */}
                        <div className="flex justify-end">
                            <div className="bg-purple-600 text-white rounded-xl rounded-tr-sm px-3 py-2 max-w-[70%]">
                                {q.type === "yes_no" ? (
                                    <div className="flex gap-2">
                                        <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">Yes</span>
                                        <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">No</span>
                                    </div>
                                ) : q.type === "select" && q.options?.length ? (
                                    <p className="text-xs text-purple-200 italic">{q.options[0]}</p>
                                ) : (
                                    <p className="text-xs text-purple-200 italic">{q.placeholder || "Client's response..."}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {!section && (
                    <div className="text-center py-8">
                        <MessageSquare className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400">Add sections and questions to see the preview</p>
                    </div>
                )}

                {section?.questions.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-xs text-slate-400">No questions in this section yet</p>
                    </div>
                )}
            </div>

            {/* Input bar */}
            <div className="border-t border-slate-200 p-3 bg-white">
                <div className="flex gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <input
                        disabled
                        placeholder="Client types response here..."
                        className="flex-1 text-xs bg-transparent outline-none text-slate-400"
                    />
                    <div className="p-1 bg-purple-600 rounded-md opacity-50">
                        <ChevronRight className="h-3 w-3 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// QuestionEditor component
// ─────────────────────────────────────────────
function QuestionEditor({
    question,
    index,
    onUpdate,
    onDelete,
    onDragStart,
    onDragOver,
    onDrop,
    dragId,
}: {
    question: Question;
    index: number;
    onUpdate: (q: Question) => void;
    onDelete: () => void;
    onDragStart: (id: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (id: string) => void;
    dragId: string | null;
}) {
    const isDragging = dragId === question.id;

    const update = (patch: Partial<Question>) => onUpdate({ ...question, ...patch });

    return (
        <div
            draggable
            onDragStart={() => onDragStart(question.id)}
            onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
            onDrop={() => onDrop(question.id)}
            className={`group flex items-start gap-2 p-3 bg-white rounded-lg border transition-all ${isDragging ? "opacity-40 border-purple-400 shadow-inner" : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
                }`}
        >
            {/* Drag handle */}
            <div className="cursor-grab active:cursor-grabbing mt-1 text-slate-300 hover:text-slate-500 transition-colors">
                <GripVertical className="h-4 w-4" />
            </div>

            <div className="flex-1 space-y-2">
                {/* Question text + type */}
                <div className="flex gap-2">
                    <Input
                        placeholder={`Question ${index + 1}...`}
                        value={question.text}
                        onChange={(e) => update({ text: e.target.value })}
                        className="flex-1 h-8 text-sm border-slate-200"
                    />
                    <Select value={question.type} onValueChange={(v) => update({ type: v as QuestionType })}>
                        <SelectTrigger className="w-36 h-8 text-xs border-slate-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="text">Short Text</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="yes_no">Yes / No</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Placeholder */}
                {(question.type === "text" || question.type === "textarea") && (
                    <Input
                        placeholder="Placeholder hint (optional)..."
                        value={question.placeholder || ""}
                        onChange={(e) => update({ placeholder: e.target.value })}
                        className="h-7 text-xs border-slate-200 text-slate-500"
                    />
                )}

                {/* Options for select/multiple_choice */}
                {(question.type === "select" || question.type === "multiple_choice") && (
                    <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-medium">Options (one per line)</p>
                        <Textarea
                            rows={3}
                            placeholder="Option A&#10;Option B&#10;Option C"
                            value={(question.options || []).join("\n")}
                            onChange={(e) => update({ options: e.target.value.split("\n").filter(Boolean) })}
                            className="text-xs border-slate-200 resize-none"
                        />
                    </div>
                )}

                {/* Required toggle */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id={`req-${question.id}`}
                        checked={question.required}
                        onChange={(e) => update({ required: e.target.checked })}
                        className="w-3.5 h-3.5 accent-purple-600"
                    />
                    <label htmlFor={`req-${question.id}`} className="text-xs text-slate-500 cursor-pointer">Required</label>
                </div>
            </div>

            {/* Delete */}
            <button
                onClick={onDelete}
                className="mt-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────
// SectionEditor component
// ─────────────────────────────────────────────
function SectionEditor({
    section,
    index,
    total,
    onUpdate,
    onDelete,
    onDragStart,
    onDragOver,
    onDrop,
    dragSectionId,
}: {
    section: Section;
    index: number;
    total: number;
    onUpdate: (s: Section) => void;
    onDelete: () => void;
    onDragStart: (id: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (id: string) => void;
    dragSectionId: string | null;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const [dragQId, setDragQId] = useState<string | null>(null);

    const updateSection = (patch: Partial<Section>) => onUpdate({ ...section, ...patch });

    const addQuestion = () => {
        updateSection({ questions: [...section.questions, blankQuestion()] });
    };

    const updateQuestion = (qi: number, q: Question) => {
        const questions = [...section.questions];
        questions[qi] = q;
        updateSection({ questions });
    };

    const deleteQuestion = (qi: number) => {
        updateSection({ questions: section.questions.filter((_, i) => i !== qi) });
    };

    // DnD for questions within this section
    const handleQDragOver = (e: React.DragEvent) => { e.preventDefault(); };

    const handleQDrop = (targetId: string) => {
        if (!dragQId || dragQId === targetId) return;
        const qs = [...section.questions];
        const fromIdx = qs.findIndex(q => q.id === dragQId);
        const toIdx = qs.findIndex(q => q.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = qs.splice(fromIdx, 1);
        qs.splice(toIdx, 0, moved);
        updateSection({ questions: qs });
        setDragQId(null);
    };

    const isDragging = dragSectionId === section.id;

    return (
        <div
            draggable
            onDragStart={() => onDragStart(section.id)}
            onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
            onDrop={() => onDrop(section.id)}
            className={`border rounded-xl transition-all ${isDragging ? "opacity-40 border-purple-400 shadow-inner bg-purple-50/20" : "border-slate-200 bg-white hover:shadow-sm"
                }`}
        >
            {/* Section header */}
            <div className="flex items-center gap-2 p-3 border-b border-slate-100">
                <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                    <GripVertical className="h-5 w-5" />
                </div>

                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                </div>

                <Input
                    placeholder="Section title..."
                    value={section.title}
                    onChange={(e) => updateSection({ title: e.target.value })}
                    className="flex-1 h-8 text-sm font-medium border-0 shadow-none px-1 focus-visible:ring-0 bg-transparent"
                />

                <Badge variant="outline" className="text-xs shrink-0 border-slate-200 text-slate-500">
                    {section.questions.length} Q{section.questions.length !== 1 ? "s" : ""}
                </Badge>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {total > 1 && (
                    <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            {!collapsed && (
                <div className="p-3 space-y-3">
                    {/* Section description */}
                    <Input
                        placeholder="Section description (optional)..."
                        value={section.description || ""}
                        onChange={(e) => updateSection({ description: e.target.value })}
                        className="h-7 text-xs border-slate-200 text-slate-500"
                    />

                    {/* Questions */}
                    <div className="space-y-2">
                        {section.questions.map((q, qi) => (
                            <QuestionEditor
                                key={q.id}
                                question={q}
                                index={qi}
                                onUpdate={(updated) => updateQuestion(qi, updated)}
                                onDelete={() => deleteQuestion(qi)}
                                onDragStart={setDragQId}
                                onDragOver={handleQDragOver}
                                onDrop={handleQDrop}
                                dragId={dragQId}
                            />
                        ))}
                    </div>

                    {/* Add question */}
                    <button
                        onClick={addQuestion}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-slate-400 hover:text-purple-600 border border-dashed border-slate-200 hover:border-purple-300 rounded-lg transition-all hover:bg-purple-50/30"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Question
                    </button>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Main TemplateBuilder component
// ─────────────────────────────────────────────
export function TemplateBuilder({
    initialTemplate,
    onSaveDraft,
    onPublish,
    isSaving,
}: {
    initialTemplate: TemplateData;
    onSaveDraft: (t: TemplateData) => Promise<void>;
    onPublish: (t: TemplateData) => Promise<void>;
    isSaving: boolean;
}) {
    const [template, setTemplate] = useState<TemplateData>(initialTemplate);
    const [showPreview, setShowPreview] = useState(true);
    const [errors, setErrors] = useState<string[]>([]);
    const [dragSectionId, setDragSectionId] = useState<string | null>(null);
    const [previewTourRunning, setPreviewTourRunning] = useState(false);

    const updateMeta = (patch: Partial<TemplateData>) => setTemplate(t => ({ ...t, ...patch }));

    const addSection = () => {
        setTemplate(t => ({ ...t, sections: [...t.sections, blankSection()] }));
    };

    const updateSection = (si: number, s: Section) => {
        setTemplate(t => {
            const sections = [...t.sections];
            sections[si] = s;
            return { ...t, sections };
        });
    };

    const deleteSection = (si: number) => {
        setTemplate(t => ({ ...t, sections: t.sections.filter((_, i) => i !== si) }));
    };

    // Section drag-and-drop
    const handleSectionDrop = (targetId: string) => {
        if (!dragSectionId || dragSectionId === targetId) return;
        setTemplate(t => {
            const sections = [...t.sections];
            const fromIdx = sections.findIndex(s => s.id === dragSectionId);
            const toIdx = sections.findIndex(s => s.id === targetId);
            if (fromIdx === -1 || toIdx === -1) return t;
            const [moved] = sections.splice(fromIdx, 1);
            sections.splice(toIdx, 0, moved);
            return { ...t, sections };
        });
        setDragSectionId(null);
    };

    const validate = (): boolean => {
        const errs: string[] = [];
        if (!template.name.trim()) errs.push("Template name is required.");
        if (template.sections.length === 0) errs.push("At least one section is required.");
        template.sections.forEach((s, si) => {
            if (!s.title.trim()) errs.push(`Section ${si + 1} needs a title.`);
            if (s.questions.length === 0) errs.push(`Section "${s.title || si + 1}" must have at least one question.`);
            s.questions.forEach((q, qi) => {
                if (!q.text.trim()) errs.push(`Section "${s.title}" — Question ${qi + 1} text is empty.`);
            });
        });
        setErrors(errs);
        return errs.length === 0;
    };

    const handleSaveDraft = async () => {
        setErrors([]);
        await onSaveDraft(template);
    };

    const handlePublish = async () => {
        if (!validate()) return;
        await onPublish(template);
    };

    const totalQuestions = template.sections.reduce((acc, s) => acc + s.questions.length, 0);

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Input
                        placeholder="Template name..."
                        value={template.name}
                        onChange={(e) => updateMeta({ name: e.target.value })}
                        className="max-w-xs h-9 font-semibold text-slate-800 border-slate-200 focus:border-purple-400"
                    />
                    <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                        <span>{template.sections.length} section{template.sections.length !== 1 ? "s" : ""}</span>
                        <span className="text-slate-300">·</span>
                        <span>{totalQuestions} question{totalQuestions !== 1 ? "s" : ""}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Estimated time */}
                    <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs text-slate-500">~</span>
                        <input
                            type="number"
                            min={1}
                            max={120}
                            value={template.estimated_minutes}
                            onChange={(e) => updateMeta({ estimated_minutes: parseInt(e.target.value) || 5 })}
                            className="w-8 text-xs font-medium text-center bg-transparent outline-none text-slate-700"
                        />
                        <span className="text-xs text-slate-500">min</span>
                    </div>

                    {/* Preview toggle */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="gap-1.5 text-xs border-slate-200"
                    >
                        {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {showPreview ? "Hide Preview" : "Preview"}
                    </Button>

                    {/* Save Draft */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        className="gap-1.5 text-xs border-slate-200"
                    >
                        <Save className="h-3.5 w-3.5" />
                        Save Draft
                    </Button>

                    {/* Publish */}
                    <Button
                        size="sm"
                        onClick={handlePublish}
                        disabled={isSaving}
                        className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        <Rocket className="h-3.5 w-3.5" />
                        Publish
                    </Button>
                </div>
            </div>

            {/* Validation errors */}
            {errors.length > 0 && (
                <div className="mb-4">
                    <ValidationErrors errors={errors} />
                </div>
            )}

            {/* Body: sections list + live preview */}
            <div className={`flex gap-6 flex-1 min-h-0 ${showPreview ? "grid grid-cols-[1fr_380px]" : ""}`}>
                {/* Left: Sections */}
                <div className="flex flex-col min-h-0 overflow-y-auto space-y-3 pr-1">
                    {/* Template description */}
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Template Description (optional)</Label>
                        <Input
                            placeholder="Brief description shown to professionals selecting this template..."
                            value={template.description || ""}
                            onChange={(e) => updateMeta({ description: e.target.value })}
                            className="h-8 text-sm border-slate-200"
                        />
                    </div>

                    {/* Sections */}
                    {template.sections.map((section, si) => (
                        <SectionEditor
                            key={section.id}
                            section={section}
                            index={si}
                            total={template.sections.length}
                            onUpdate={(s) => updateSection(si, s)}
                            onDelete={() => deleteSection(si)}
                            onDragStart={setDragSectionId}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleSectionDrop}
                            dragSectionId={dragSectionId}
                        />
                    ))}

                    {/* Add section */}
                    <button
                        onClick={addSection}
                        className="w-full flex items-center justify-center gap-2 py-4 text-sm text-slate-400 hover:text-purple-600 border-2 border-dashed border-slate-200 hover:border-purple-300 rounded-xl transition-all hover:bg-purple-50/20"
                    >
                        <Plus className="h-4 w-4" />
                        Add Section
                    </button>
                </div>

                {/* Right: Live Preview */}
                {showPreview && (
                    <div className="min-h-0">
                        <LivePreview template={template} />
                    </div>
                )}
            </div>
        </div>
    );
}
