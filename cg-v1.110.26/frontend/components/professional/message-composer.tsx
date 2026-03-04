"use client";

import { useState, useEffect } from "react";
import {
    Send,
    X,
    Paperclip,
    Layout,
    User,
    ChevronDown,
    Sparkles,
    Loader2,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface Template {
    id: string;
    name: string;
    template_type: string;
    description?: string;
}

interface MessageComposerProps {
    familyFileId: string;
    token: string;
    initialRecipient?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function MessageComposer({
    familyFileId,
    token,
    initialRecipient,
    onSuccess,
    onCancel
}: MessageComposerProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [recipient, setRecipient] = useState(initialRecipient || "");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInjecting, setIsInjecting] = useState(false);
    const [caseData, setCaseData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            try {
                // Fetch case info for recipient details
                const caseRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/family-files/${familyFileId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (caseRes.ok) {
                    setCaseData(await caseRes.ok ? await caseRes.json() : null);
                }

                // Fetch email templates
                const templateRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/professional/templates?template_type=email_template`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (templateRes.ok) {
                    setTemplates(await templateRes.json());
                }
            } catch (error) {
                console.error("Error fetching composer data:", error);
            }
        };
        fetchData();
    }, [familyFileId, token]);

    const handleApplyTemplate = async (templateId: string) => {
        setIsInjecting(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/professional/templates/${templateId}/preview?family_file_id=${familyFileId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                setSubject(data.subject || "");
                setContent(data.body || "");
                toast({ title: "Template applied with case variables" });
            }
        } catch (error) {
            toast({ title: "Failed to apply template", variant: "destructive" });
        } finally {
            setIsInjecting(false);
        }
    };

    const handleSendMessage = async () => {
        if (!recipient || !content) {
            toast({ title: "Please select a recipient and enter a message", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/professional/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipient_id: recipient,
                    subject,
                    content,
                    family_file_id: familyFileId
                })
            });

            if (response.ok) {
                toast({ title: "Message sent successfully" });
                if (onSuccess) onSuccess();
            } else {
                toast({ title: "Failed to send message", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "An error occurred while sending", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                        <Send className="h-4 w-4 text-teal-600" />
                        Compose Message
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200">
                                    <Layout className="h-3 w-3 mr-2" />
                                    Apply Template
                                    <ChevronDown className="h-3 w-3 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Select a Template</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {templates.length > 0 ? (
                                    templates.map(t => (
                                        <DropdownMenuItem key={t.id} onClick={() => handleApplyTemplate(t.id)}>
                                            <div>
                                                <div className="font-medium">{t.name}</div>
                                                <div className="text-[10px] text-slate-500 line-clamp-1">{t.description}</div>
                                            </div>
                                        </DropdownMenuItem>
                                    ))
                                ) : (
                                    <div className="px-2 py-3 text-center text-xs text-slate-500 italic">
                                        No template found
                                    </div>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-teal-600 font-medium">
                                    <Plus className="h-3 w-3 mr-2" />
                                    Create Template
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {onCancel && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {/* Recipient */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        Recipient
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {caseData?.parent_a_info && (
                            <button
                                onClick={() => setRecipient(caseData.parent_a_info.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${recipient === caseData.parent_a_info.id
                                    ? "bg-teal-50 border-teal-200 text-teal-700 font-bold shadow-sm"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                    }`}
                            >
                                <div className="h-4 w-4 rounded-full bg-teal-100 flex items-center justify-center text-[10px]">
                                    {caseData.parent_a_info.first_name[0]}
                                </div>
                                {caseData.parent_a_info.first_name} {caseData.parent_a_info.last_name}
                                {recipient === caseData.parent_a_info.id && <CheckCircle2 className="h-3 w-3" />}
                            </button>
                        )}
                        {caseData?.parent_b_info && (
                            <button
                                onClick={() => setRecipient(caseData.parent_b_info.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${recipient === caseData.parent_b_info.id
                                    ? "bg-teal-50 border-teal-200 text-teal-700 font-bold shadow-sm"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                    }`}
                            >
                                <div className="h-4 w-4 rounded-full bg-teal-100 flex items-center justify-center text-[10px]">
                                    {caseData.parent_b_info.first_name[0]}
                                </div>
                                {caseData.parent_b_info.first_name} {caseData.parent_b_info.last_name}
                                {recipient === caseData.parent_b_info.id && <CheckCircle2 className="h-3 w-3" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                    <Input
                        placeholder="Subject (optional)"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="h-10 border-slate-200 focus-visible:ring-teal-500"
                    />
                </div>

                {/* Content */}
                <div className="relative">
                    <Textarea
                        placeholder="Type your message here..."
                        className="min-h-[200px] border-slate-200 focus-visible:ring-teal-500 resize-none pb-12"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                    {isInjecting && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all rounded-md">
                            <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-teal-100 flex items-center gap-3 animate-pulse">
                                <Sparkles className="h-4 w-4 text-teal-500" />
                                <span className="text-xs font-medium text-slate-700">Injecting case variables...</span>
                            </div>
                        </div>
                    )}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50">
                            <Paperclip className="h-4 w-4 mr-1.5" />
                            <span className="text-xs">Attach Evidence</span>
                        </Button>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-4 flex justify-between items-center">
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    Messages are logged for court compliance.
                </div>
                <div className="flex gap-2">
                    {onCancel && (
                        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
                            Discard
                        </Button>
                    )}
                    <Button
                        className="bg-teal-600 hover:bg-teal-700 text-white min-w-[120px]"
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={isLoading || !recipient || !content}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Message
                            </>
                        )}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

function Plus(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    );
}
