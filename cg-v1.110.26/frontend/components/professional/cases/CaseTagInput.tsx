"use client";

import { useState, useEffect, useRef } from "react";
import { Tag, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Predefined tag color palette cycling
const TAG_COLORS = [
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
];

function tagColor(tag: string) {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + (hash << 5) - hash;
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface CaseTagInputProps {
    caseId: string;
    token: string;
    /** Optionally pass a list of all existing tags for autocomplete */
    allTags?: string[];
    /** Called when tags change so parent can update filter state */
    onChange?: (tags: string[]) => void;
    compact?: boolean;
}

export function CaseTagInput({ caseId, token, allTags = [], onChange, compact = false }: CaseTagInputProps) {
    const { toast } = useToast();
    const [tags, setTags] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load existing tags for this case
    useEffect(() => {
        if (!token || !caseId) return;
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/professional/cases/${caseId}/tags`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    const loadedTags: string[] = Array.isArray(data)
                        ? data.map((t: any) => typeof t === "string" ? t : t.tag)
                        : [];
                    setTags(loadedTags);
                    onChange?.(loadedTags);
                }
            } catch { /* ignore load errors */ }
        };
        load();
    }, [caseId, token]);

    // Filter suggestions
    useEffect(() => {
        if (!inputValue.trim()) {
            setSuggestions([]);
            return;
        }
        const matches = allTags.filter(
            t => t.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(t)
        );
        setSuggestions(matches.slice(0, 6));
    }, [inputValue, allTags, tags]);

    const addTag = async (tag: string) => {
        const trimmed = tag.trim().toLowerCase();
        if (!trimmed || tags.includes(trimmed)) return;
        setIsAdding(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/cases/${caseId}/tags`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ tag: trimmed }),
            });
            if (res.ok || res.status === 409) {
                // 409 = already exists (unique constraint) — treat as success
                const newTags = [...tags, trimmed];
                setTags(newTags);
                onChange?.(newTags);
            } else {
                toast({ title: "Failed to add tag", variant: "destructive" });
            }
        } catch {
            toast({ title: "Network error", variant: "destructive" });
        } finally {
            setIsAdding(false);
            setInputValue("");
            setShowSuggestions(false);
        }
    };

    const removeTag = async (tag: string) => {
        try {
            await fetch(
                `${API_BASE}/api/v1/professional/cases/${caseId}/tags/${encodeURIComponent(tag)}`,
                { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
            );
            const newTags = tags.filter(t => t !== tag);
            setTags(newTags);
            onChange?.(newTags);
        } catch {
            toast({ title: "Failed to remove tag", variant: "destructive" });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    if (compact && tags.length === 0) {
        // In compact mode don't show if no tags
        return null;
    }

    return (
        <div className="relative">
            <div
                className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "min-h-[38px] border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:border-teal-400 transition-colors"}`}
                onClick={() => !compact && inputRef.current?.focus()}
            >
                <Tag className={`shrink-0 ${compact ? "h-3 w-3 text-slate-400" : "h-3.5 w-3.5 text-slate-400"}`} />

                {/* Existing tags */}
                {tags.map(tag => (
                    <Badge
                        key={tag}
                        variant="outline"
                        className={`text-xs gap-1 border ${tagColor(tag)} pr-1`}
                    >
                        {tag}
                        {!compact && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                                className="hover:text-red-600 transition-colors"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        )}
                    </Badge>
                ))}

                {/* Input */}
                {!compact && (
                    <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder={tags.length === 0 ? "Add tag..." : ""}
                        disabled={isAdding}
                        className="flex-1 min-w-[80px] text-xs outline-none bg-transparent placeholder:text-slate-400"
                    />
                )}
            </div>

            {/* Autocomplete dropdown */}
            {showSuggestions && (suggestions.length > 0 || inputValue.trim()) && (
                <div className="absolute top-full left-0 mt-1 z-50 w-full max-w-xs bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                    {suggestions.map(s => (
                        <button
                            key={s}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                            onMouseDown={() => addTag(s)}
                        >
                            <Badge variant="outline" className={`text-xs border ${tagColor(s)}`}>{s}</Badge>
                        </button>
                    ))}
                    {inputValue.trim() && !tags.includes(inputValue.trim().toLowerCase()) && (
                        <button
                            className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                            onMouseDown={() => addTag(inputValue)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create "{inputValue.trim()}"
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
