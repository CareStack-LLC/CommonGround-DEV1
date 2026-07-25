"use client";

import { useState, useEffect, useRef } from "react";
import {
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Shield,
    AlertTriangle,
    MessageSquare,
    FileText,
    Users,
    Settings,
    MoreHorizontal,
    Zap,
    Clock,
    ChevronRight,
    Monitor
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface CallInterfaceProps {
    familyFileId: string;
    token: string;
    onEndCall?: () => void;
}

export function CallInterface({ familyFileId, token, onEndCall }: CallInterfaceProps) {
    const [isLive, setIsLive] = useState(false);
    const [duration, setDuration] = useState(0);
    const [transcripts, setTranscripts] = useState<{ sender: string, text: string, time: string }[]>([]);
    const [riskScore, setRiskScore] = useState(15);
    const [activeIntervention, setActiveIntervention] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Mock duration timer
    useEffect(() => {
        let interval: any;
        if (isLive) {
            interval = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isLive]);

    // Auto-scroll transcripts
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts]);

    // Mock transcription stream
    useEffect(() => {
        if (!isLive) return;

        const phrases = [
            { sender: "Parent A", text: "I'm just saying, we agreed on 5 PM for the exchange." },
            { sender: "Parent B", text: "I know what we agreed on, but work was crazy today." },
            { sender: "Parent A", text: "It's always something. The kids were waiting for an hour." },
            { sender: "Parent B", text: "Don't start with the kids. You know I'm doing my best." },
            { sender: "ARIA", text: "Moderation Notice: Tone levels rising. Suggest centering on the children's schedule." },
            { sender: "Parent A", text: "Fine. Let's just look at the agreement then." },
        ];

        let count = 0;
        const interval = setInterval(() => {
            if (count < phrases.length) {
                setTranscripts(prev => [...prev, { ...phrases[count], time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }) }]);

                // Increase risk score slightly on tension
                if (count === 2 || count === 3) setRiskScore(s => Math.min(s + 20, 100));
                if (count === 4) setRiskScore(s => Math.max(s - 30, 10)); // ARIA intervened

                count++;
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [isLive]);

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startCall = () => {
        setIsLive(true);
        setTranscripts([]);
        setRiskScore(10);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[700px]">
            {/* Main Call View */}
            <div className="flex-1 flex flex-col gap-6 h-full">
                {/* Call Management Header */}
                <Card className="border-border">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`h-3 w-3 rounded-full ${isLive ? 'bg-cg-error animate-pulse' : 'bg-muted-foreground/40'}`} />
                            <div className="space-y-0.5">
                                <h2 className="font-bold text-foreground">{isLive ? "Live Intake Session" : "Wait for Participants"}</h2>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(duration)}</span>
                                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 2 / 2 Connected</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-9">
                                <Monitor className="h-4 w-4 mr-2" />
                                Screenshare
                            </Button>
                            {isLive ? (
                                <Button variant="destructive" size="sm" className="h-9 px-4" onClick={() => setIsLive(false)}>
                                    <PhoneOff className="h-4 w-4 mr-2" />
                                    End Call
                                </Button>
                            ) : (
                                <Button className="bg-cg-sage-dark hover:bg-cg-sage-dark text-white h-9 px-6" onClick={startCall}>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Join Call
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Video Grid Simulation */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-center border-2 border-slate-800">
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                            <Badge className="bg-black/40 backdrop-blur-md border-none text-white font-medium">Parent A (Petitioner)</Badge>
                            <div className="h-2 w-2 rounded-full bg-cg-sage" />
                        </div>
                        <Users className="h-20 w-20 text-slate-700" />
                        <div className="absolute bottom-4 right-4 flex gap-2">
                            <Button aria-label="Toggle microphone" size="icon" variant="ghost" className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 rounded-full"><Mic className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-center border-2 border-slate-800">
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                            <Badge className="bg-black/40 backdrop-blur-md border-none text-white font-medium">Parent B (Respondent)</Badge>
                            <div className="h-2 w-2 rounded-full bg-cg-sage" />
                        </div>
                        <Users className="h-20 w-20 text-slate-700" />
                        <div className="absolute bottom-4 right-4 flex gap-2">
                            <Button aria-label="Toggle microphone" size="icon" variant="ghost" className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 rounded-full"><Mic className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>

                {/* Real-time Transcription */}
                <Card className="h-64 border-border overflow-hidden flex flex-col">
                    <CardHeader className="py-3 px-4 bg-muted/50 border-b border-border flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="h-3 w-3" /> Live Transcription
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] bg-card border-border">Powered by Deepgram</Badge>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden" ref={scrollRef}>
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {transcripts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/40">
                                        <Zap className="h-8 w-8 mb-2 opacity-50" />
                                        <p className="text-sm italic">Waiting for speech...</p>
                                    </div>
                                ) : (
                                    transcripts.map((t, i) => (
                                        <div key={i} className={`flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 ${t.sender === 'ARIA' ? 'bg-[#F0F7FC] dark:bg-[#0F2836]/30 p-2 rounded-lg border border-cg-slate-subtle dark:border-[#163A50]/40' : ''}`}>
                                            <span className={`font-bold min-w-[70px] ${t.sender === 'Parent A' ? 'text-teal-600 dark:text-teal-400' : t.sender === 'Parent B' ? 'text-cg-slate dark:text-cg-slate-light' : 'text-cg-slate dark:text-cg-slate-light'}`}>
                                                {t.sender}:
                                            </span>
                                            <span className="text-foreground/80 leading-relaxed flex-1">{t.text}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono mt-1">{t.time}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar Controls (Safety Shields & Metadata) */}
            <div className="w-full lg:w-80 flex flex-col gap-6">
                {/* ARIA Safety Shield */}
                <Card className="border-[#C2DEF0] dark:border-[#163A50]/40 shadow-sm bg-gradient-to-b from-[#F0F7FC]/30 dark:from-[#0F2836]/20 to-card">
                    <CardHeader className="pb-3 border-b border-cg-slate-subtle dark:border-[#163A50]/40 transition-colors">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#163A50] dark:text-[#9BCADF]">
                                <Shield className="h-4 w-4" />
                                ARIA Safety Shield
                            </CardTitle>
                            <Switch checked={isLive} disabled={!isLive} className="scale-75 data-[state=checked]:bg-cg-slate" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-medium text-muted-foreground">Session Conflict Risk</span>
                                <span className={`text-sm font-bold ${riskScore > 60 ? 'text-cg-error' : riskScore > 30 ? 'text-cg-amber' : 'text-cg-sage'}`}>
                                    {riskScore}%
                                </span>
                            </div>
                            <Progress value={riskScore} className={`h-2 transition-all duration-1000 ${riskScore > 60 ? '[&>div]:bg-cg-error' : riskScore > 30 ? '[&>div]:bg-cg-amber' : '[&>div]:bg-cg-sage'
                                }`} />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" className="h-20 flex flex-col gap-2 border-border hover:bg-cg-error-subtle dark:hover:bg-[#7A2222]/20 hover:border-cg-error-subtle dark:hover:border-[#7A2222]/40 group">
                                <AlertTriangle className="h-4 w-4 text-muted-foreground group-hover:text-cg-error" />
                                <span className="text-[10px] font-bold">Intervene</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex flex-col gap-2 border-border hover:bg-[#F0F7FC] dark:hover:bg-[#0F2836]/20 hover:border-[#C2DEF0] dark:hover:border-[#163A50]/40 group">
                                <Zap className="h-4 w-4 text-muted-foreground group-hover:text-[#3D8DB0]" />
                                <span className="text-[10px] font-bold">Quiet Handoff</span>
                            </Button>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Insight</p>
                            <p className="text-xs italic leading-tight">
                                "Conflict detected regarding exchange location. Referring to Agreement 004-A-1."
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Case Reference Tab */}
                <Card className="flex-1 border-border overflow-hidden flex flex-col">
                    <Tabs defaultValue="agreements" className="flex-1 flex flex-col">
                        <TabsList className="bg-muted border-b border-border rounded-none w-full justify-start px-2 py-0 h-10">
                            <TabsTrigger value="agreements" className="text-[10px] h-8 data-[state=active]:bg-card">AGREEMENTS</TabsTrigger>
                            <TabsTrigger value="details" className="text-[10px] h-8 data-[state=active]:bg-card">CASE STATS</TabsTrigger>
                        </TabsList>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <TabsContent value="agreements" className="h-full m-0">
                                <ScrollArea className="h-[280px] p-4">
                                    <div className="space-y-3">
                                        <div className="p-2 rounded-lg border border-cg-sage-subtle dark:border-[#1B5544]/40 bg-cg-sage-subtle/50 dark:bg-[#123A2E]/20">
                                            <h4 className="text-xs font-bold text-[#1B5544] dark:text-[#9BD5C2] flex items-center justify-between">
                                                Exchange Plan A-1
                                                <ChevronRight className="h-3 w-3" />
                                            </h4>
                                            <p className="text-[10px] text-cg-sage-dark/70 dark:text-cg-sage-light/70 mt-1 line-clamp-2">Exchanges at Starbucks (3rd St) every Friday at 5:00 PM.</p>
                                        </div>
                                        <div className="p-2 rounded-lg border border-border">
                                            <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                                                Holiday Prep 2026
                                                <ChevronRight className="h-3 w-3" />
                                            </h4>
                                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">Vacation selection requires 30 days notice.</p>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="details" className="p-4 space-y-4 m-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Conflict Level</p>
                                        <Badge variant="outline" className="text-[#E09520] dark:text-[#F7B84D] bg-cg-amber-subtle dark:bg-[#3D2808]/20 border-[#FBE3BF] dark:border-[#6B460F]/40">HIGH-TEMP</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Avg Response</p>
                                        <p className="text-sm font-bold text-foreground">4.2 hours</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Recent Violations</p>
                                    <p className="text-xs text-muted-foreground">3 late exchanges in past 30 days.</p>
                                </div>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                    <CardFooter className="p-3 bg-muted flex justify-center">
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] text-muted-foreground">
                            <Settings className="h-3 w-3 mr-2" />
                            Call Settings
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
