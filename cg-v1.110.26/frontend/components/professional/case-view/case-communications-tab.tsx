"use client";

import { useState, useEffect } from "react";
import {
    MessageSquare,
    Search,
    Filter,
    User,
    Clock,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageComposer } from "@/components/professional/message-composer";
import { Send, Plus } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
    id: string;
    sender_name: string;
    sender_id: string;
    recipient_name: string;
    content: string;
    sent_at: string;
    flagged_by_aria: boolean;
    aria_risk_score?: number;
    aria_flag_category?: string;
    is_professional_viewed: boolean;
}

export function CaseCommunicationsTab({ familyFileId, token }: { familyFileId: string, token: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterFlagged, setFilterFlagged] = useState(false);
    const [isComposing, setIsComposing] = useState(false);

    useEffect(() => {
        fetchMessages();
    }, [familyFileId, token]);

    const fetchMessages = async () => {
        if (!token || !familyFileId) return;

        setIsLoading(true);
        try {
            // In a real app, this would be a specific endpoint for professionals to view client messages
            const response = await fetch(
                `${API_BASE}/api/v1/professional/cases/${familyFileId}/communications`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setMessages(data.items || []);
            }
        } catch (error) {
            console.error("Error fetching communications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredMessages = messages.filter((msg) => {
        const matchesSearch = msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.sender_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFlag = filterFlagged ? msg.flagged_by_aria : true;
        return matchesSearch && matchesFlag;
    });

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-teal-600" />
                    Case Communications
                </h3>
                {!isComposing && (
                    <Button
                        onClick={() => setIsComposing(true)}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Message
                    </Button>
                )}
            </div>

            {isComposing && (
                <MessageComposer
                    familyFileId={familyFileId}
                    token={token}
                    onCancel={() => setIsComposing(false)}
                    onSuccess={() => {
                        setIsComposing(false);
                        fetchMessages();
                    }}
                />
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                    <Button
                        variant={filterFlagged ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterFlagged(!filterFlagged)}
                        className={filterFlagged ? "bg-red-600 hover:bg-red-700 h-9" : "h-9"}
                    >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Flagged
                    </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchMessages} className="h-9">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
                </div>
            ) : filteredMessages.length > 0 ? (
                <div className="space-y-4">
                    {filteredMessages.map((msg) => (
                        <MessageCard key={msg.id} message={msg} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No messages found.</p>
                </div>
            )}
        </div>
    );
}

function MessageCard({ message }: { message: Message }) {
    return (
        <Card className={`overflow-hidden border-slate-100 hover:border-indigo-100 transition-colors ${message.flagged_by_aria ? 'border-l-4 border-l-red-500' : ''}`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                            {message.sender_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-900">{message.sender_name}</span>
                                <span className="text-slate-300">→</span>
                                <span className="text-xs text-slate-500">{message.recipient_name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span className="text-[10px] text-slate-400">
                                    {new Date(message.sent_at).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    {message.flagged_by_aria && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 text-[10px] py-0 h-5">
                            ARIA Flag: {message.aria_flag_category || "Inappropriate"}
                        </Badge>
                    )}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 leading-relaxed italic">
                    "{message.content}"
                </div>

                {message.flagged_by_aria && message.aria_risk_score && (
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-500"
                                style={{ width: `${message.aria_risk_score * 10}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-bold text-red-600">Risk Score: {message.aria_risk_score}/10</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
