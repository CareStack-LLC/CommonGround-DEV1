"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
    Plus,
    FolderOpen,
    Bot,
    Upload,
    Calendar,
    CheckSquare,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const QUICK_CREATE_ITEMS = [
    {
        href: "/professional/cases/new",
        label: "New Case",
        description: "Open a new client case",
        icon: <FolderOpen className="h-4 w-4 text-[var(--portal-primary)]" />,
    },
    {
        href: "/professional/intake/new",
        label: "Send ARIA Intake",
        description: "Email intake link to a client",
        icon: <Bot className="h-4 w-4 text-amber-600" />,
    },
    {
        href: "/professional/documents/ocr",
        label: "Upload Court Order",
        description: "OCR: Auto-extract & lock fields from court order",
        icon: <Upload className="h-4 w-4 text-blue-600" />,
    },
    {
        href: "/professional/calendar?new=1",
        label: "Schedule Court Event",
        description: "Add a hearing, deadline, or meeting",
        icon: <Calendar className="h-4 w-4 text-purple-600" />,
    },
];

interface QuickCreateMenuProps {
    onCreateTask?: () => void;
}

export function QuickCreateMenu({ onCreateTask }: QuickCreateMenuProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={menuRef} className="relative">
            <Button
                onClick={() => setOpen((p) => !p)}
                className="bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)] text-white gap-2 shadow-sm"
            >
                <Plus className="h-4 w-4" />
                Quick Create
                <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </Button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-2 space-y-0.5">
                        {QUICK_CREATE_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                            >
                                <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white transition-colors shrink-0 mt-0.5">
                                    {item.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                                </div>
                            </Link>
                        ))}

                        {onCreateTask && (
                            <>
                                <div className="h-px bg-slate-100 mx-2 my-1" />
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        onCreateTask();
                                    }}
                                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group text-left"
                                >
                                    <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white transition-colors shrink-0 mt-0.5">
                                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Create Task</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Add a personal to-do item</p>
                                    </div>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
