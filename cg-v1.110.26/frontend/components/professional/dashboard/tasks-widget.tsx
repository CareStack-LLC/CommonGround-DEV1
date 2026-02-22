"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CheckCircle2,
    Circle,
    Trash2,
    Plus,
    AlertCircle,
    Clock,
    ChevronDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Task {
    id: string;
    title: string;
    description?: string;
    case_id?: string;
    due_date?: string;
    priority: "low" | "medium" | "high" | "urgent";
    completed: boolean;
    completed_at?: string;
    created_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-blue-100 text-blue-700 border-blue-200",
    low: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatDueDate(dateStr?: string) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Overdue", color: "text-red-600" };
    if (diffDays === 0) return { label: "Due today", color: "text-orange-600" };
    if (diffDays === 1) return { label: "Due tomorrow", color: "text-amber-600" };
    return {
        label: `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        color: "text-slate-500",
    };
}

interface AddTaskModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: (task: Task) => void;
    token: string | null;
}

function AddTaskModal({ open, onClose, onCreated, token }: AddTaskModalProps) {
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<string>("medium");
    const [dueDate, setDueDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!title.trim()) { setError("Title is required"); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: title.trim(),
                    priority,
                    due_date: dueDate || undefined,
                }),
            });
            if (!res.ok) throw new Error("Failed to create task");
            const created: Task = await res.json();
            onCreated(created);
            setTitle(""); setPriority("medium"); setDueDate("");
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <Label htmlFor="task-title">Task Title *</Label>
                        <Input
                            id="task-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Review compliance report for Smith case"
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                    <SelectItem value="high">🟠 High</SelectItem>
                                    <SelectItem value="medium">🔵 Medium</SelectItem>
                                    <SelectItem value="low">⚪ Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="task-due">Due Date</Label>
                            <Input
                                id="task-due"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !title.trim()}
                        className="bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)] text-white"
                    >
                        {loading ? "Creating..." : "Create Task"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface TasksWidgetProps {
    token: string | null;
}

export function TasksWidget({ token }: TasksWidgetProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [filterCompleted, setFilterCompleted] = useState(false);

    const fetchTasks = useCallback(async () => {
        if (!token) return;
        try {
            const params = filterCompleted ? "?completed=true" : "?completed=false";
            const res = await fetch(`${API_BASE}/api/v1/professional/tasks${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setTasks(await res.json());
        } catch (e) {
            console.error("Error fetching tasks:", e);
        } finally {
            setLoading(false);
        }
    }, [token, filterCompleted]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const toggleComplete = async (task: Task) => {
        if (!token) return;
        const optimistic = tasks.map((t) =>
            t.id === task.id ? { ...t, completed: !t.completed } : t
        );
        setTasks(optimistic);
        try {
            await fetch(`${API_BASE}/api/v1/professional/tasks/${task.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ completed: !task.completed }),
            });
            // Refetch to sync
            await fetchTasks();
        } catch (e) {
            console.error("Error updating task:", e);
            setTasks(tasks); // revert on error
        }
    };

    const deleteTask = async (taskId: string) => {
        if (!token) return;
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        try {
            await fetch(`${API_BASE}/api/v1/professional/tasks/${taskId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (e) {
            console.error("Error deleting task:", e);
            await fetchTasks();
        }
    };

    const pendingCount = tasks.filter((t) => !t.completed).length;

    return (
        <>
            <AddTaskModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                onCreated={(task) => {
                    setTasks((prev) => [task, ...prev]);
                    setShowAddModal(false);
                }}
                token={token}
            />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-[var(--portal-primary)]" />
                            My Tasks
                        </CardTitle>
                        <CardDescription>
                            {loading ? "Loading..." : `${pendingCount} open task${pendingCount !== 1 ? "s" : ""}`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-500"
                            onClick={() => setFilterCompleted((p) => !p)}
                        >
                            {filterCompleted ? "Show Open" : "Show Done"}
                        </Button>
                        <Button
                            size="sm"
                            className="bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)] text-white gap-1.5"
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Task
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">
                                {filterCompleted ? "No completed tasks" : "All clear! No open tasks."}
                            </p>
                            {!filterCompleted && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-[var(--portal-primary)] mt-1"
                                    onClick={() => setShowAddModal(true)}
                                >
                                    + Add your first task
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {tasks.map((task) => {
                                const due = formatDueDate(task.due_date);
                                return (
                                    <div
                                        key={task.id}
                                        className={`group flex items-start gap-3 p-3 rounded-lg border transition-all
                      ${task.completed
                                                ? "bg-slate-50 border-slate-100 opacity-60"
                                                : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                                            }`}
                                    >
                                        <button
                                            onClick={() => toggleComplete(task)}
                                            className="mt-0.5 shrink-0 text-slate-400 hover:text-[var(--portal-primary)] transition-colors"
                                        >
                                            {task.completed ? (
                                                <CheckCircle2 className="h-5 w-5 text-[var(--portal-primary)]" />
                                            ) : (
                                                <Circle className="h-5 w-5" />
                                            )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={`text-sm font-medium ${task.completed ? "line-through text-slate-400" : "text-slate-800"
                                                    }`}
                                            >
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs border ${PRIORITY_COLORS[task.priority]}`}
                                                >
                                                    {task.priority}
                                                </Badge>
                                                {due && (
                                                    <span className={`text-xs flex items-center gap-0.5 ${due.color}`}>
                                                        <Clock className="h-3 w-3" />
                                                        {due.label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
