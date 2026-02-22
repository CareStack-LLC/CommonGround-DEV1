"use client";

import { useState, useEffect, useCallback } from "react";
import { LayoutList, Plus, Star, Trash2, Check, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface SavedView {
    id: string;
    name: string;
    view_type: string;
    filters: Record<string, string>;
    is_default: boolean;
}

interface SavedViewsProps {
    token: string;
    activeFilters: Record<string, string>;   // current filter state from parent
    onApplyView: (filters: Record<string, string>, viewId: string) => void;
    activeViewId: string | null;
}

// Static system views (always present)
const SYSTEM_VIEWS: SavedView[] = [
    { id: "sys_my_cases", name: "My Cases", view_type: "cases", filters: { status: "active" }, is_default: true },
    { id: "sys_urgent", name: "Urgent", view_type: "cases", filters: { urgency: "urgent" }, is_default: false },
    { id: "sys_dv", name: "DV Flagged", view_type: "cases", filters: { aria_risk: "high" }, is_default: false },
    { id: "sys_court", name: "Court This Week", view_type: "cases", filters: { court_date: "7" }, is_default: false },
];

// ─────────────────────────────────────────────
// SavedViews component
// ─────────────────────────────────────────────
export function SavedViews({ token, activeFilters, onApplyView, activeViewId }: SavedViewsProps) {
    const { toast } = useToast();
    const [userViews, setUserViews] = useState<SavedView[]>([]);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const allViews = [...SYSTEM_VIEWS, ...userViews];

    // Load saved views
    const loadViews = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/saved-views?view_type=cases`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUserViews(Array.isArray(data) ? data : data.items || []);
            }
        } catch { /* use empty user views */ }
    }, [token]);

    useEffect(() => { loadViews(); }, [loadViews]);

    const handleSave = async () => {
        if (!saveName.trim()) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/saved-views`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: saveName.trim(),
                    view_type: "cases",
                    filters: activeFilters,
                    is_default: false,
                }),
            });
            if (res.ok) {
                const created = await res.json();
                setUserViews(vs => [...vs, created]);
                toast({ title: "View saved", description: `"${saveName}" saved to your views.` });
                setShowSaveDialog(false);
                setSaveName("");
            } else {
                toast({ title: "Save failed", variant: "destructive" });
            }
        } catch {
            toast({ title: "Network error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (viewId: string) => {
        try {
            await fetch(`${API_BASE}/api/v1/professional/saved-views/${viewId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            setUserViews(vs => vs.filter(v => v.id !== viewId));
            toast({ title: "View deleted" });
        } catch {
            toast({ title: "Delete failed", variant: "destructive" });
        }
    };

    const handleSetDefault = async (viewId: string) => {
        try {
            await fetch(`${API_BASE}/api/v1/professional/saved-views/${viewId}/default`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            setUserViews(vs => vs.map(v => ({ ...v, is_default: v.id === viewId })));
            toast({ title: "Default view updated" });
        } catch {
            toast({ title: "Update failed", variant: "destructive" });
        }
    };

    return (
        <>
            <div className="flex items-center gap-2 flex-wrap">
                <LayoutList className="h-4 w-4 text-slate-400 shrink-0" />

                {/* View pills */}
                {allViews.map(view => (
                    <div key={view.id} className="flex items-center group relative">
                        <button
                            onClick={() => onApplyView(view.filters, view.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${activeViewId === view.id
                                    ? "bg-[var(--portal-primary)] text-white border-[var(--portal-primary)] shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                        >
                            {view.is_default && <Star className="h-3 w-3" />}
                            {view.name}
                        </button>

                        {/* Actions for user views only */}
                        {!view.id.startsWith("sys_") && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="absolute -right-1 -top-1 p-0.5 bg-white border border-slate-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-2.5 w-2.5 text-slate-500" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                    <DropdownMenuItem onClick={() => handleSetDefault(view.id)}>
                                        <Star className="h-3.5 w-3.5 mr-2" />
                                        Set as Default
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(view.id)}>
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                ))}

                {/* Save current filters as view */}
                <button
                    onClick={() => setShowSaveDialog(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-[var(--portal-primary)] border border-dashed border-slate-200 hover:border-[var(--portal-primary)]/30 rounded-full transition-all"
                    title="Save current filters as a view"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Save View
                </button>
            </div>

            {/* Save dialog */}
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Save Current Filters</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <Input
                            placeholder="View name (e.g. My Urgent Cases)..."
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            className="border-slate-200"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)} size="sm">Cancel</Button>
                        <Button size="sm" onClick={handleSave} disabled={!saveName.trim() || isSaving}
                            className="bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)] text-white">
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
