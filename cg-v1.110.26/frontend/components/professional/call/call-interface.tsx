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
                <Card className="border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`h-3 w-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                            <div className="space-y-0.5">
                                <h2 className="font-bold text-slate-900">{isLive ? "Live Intake Session" : "Wait for Participants"}</h2>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
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
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-6" onClick={startCall}>
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
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                        <Users className="h-20 w-20 text-slate-700" />
                        <div className="absolute bottom-4 right-4 flex gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 rounded-full"><Mic className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-center border-2 border-slate-800">
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                            <Badge className="bg-black/40 backdrop-blur-md border-none text-white font-medium">Parent B (Respondent)</Badge>
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                        <Users className="h-20 w-20 text-slate-700" />
                        <div className="absolute bottom-4 right-4 flex gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 rounded-full"><Mic className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>

                {/* Real-time Transcription placeholders */}
                <Card className="h-64 border-slate-200 overflow-hidden flex flex-col">
                    <CardHeader className="py-3 px-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <MessageSquare className="h-3 w-3" /> Live Transcription
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-200">Powered by Deepgram</Badge>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden" ref={scrollRef}>
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {transcripts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                                        <Zap className="h-8 w-8 mb-2 opacity-50" />
                                        <p className="text-sm italic">Waiting for speech...</p>
                                    </div>
                                ) : (
                                    transcripts.map((t, i) => (
                                        <div key={i} className={`flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 ${t.sender === 'ARIA' ? 'bg-indigo-50/50 p-2 rounded-lg border border-indigo-100' : ''}`}>
                                            <span className={`font-bold min-w-[70px] ${t.sender === 'Parent A' ? 'text-teal-600' : t.sender === 'Parent B' ? 'text-blue-600' : 'text-indigo-600'}`}>
                                                {t.sender}:
                                            </span>
                                            <span className="text-slate-700 leading-relaxed flex-1">{t.text}</span>
                                            <span className="text-[10px] text-slate-400 font-mono mt-1">{t.time}</span>
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
                <Card className="border-indigo-200 shadow-sm bg-gradient-to-b from-indigo-50/30 to-white">
                    <CardHeader className="pb-3 border-b border-indigo-100 transition-colors">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
                                <Shield className="h-4 w-4" />
                                ARIA Safety Shield
                            </CardTitle>
                            <Switch checked={isLive} disabled={!isLive} className="scale-75 data-[state=checked]:bg-indigo-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-medium text-slate-600">Session Conflict Risk</span>
                                <span className={`text-sm font-bold ${riskScore > 60 ? 'text-red-500' : riskScore > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {riskScore}%
                                </span>
                            </div>
                            <Progress value={riskScore} className={`h-2 transition-all duration-1000 ${riskScore > 60 ? '[&>div]:bg-red-500' : riskScore > 30 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'
                                }`} />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" className="h-20 flex flex-col gap-2 border-slate-200 hover:bg-red-50 hover:border-red-200 group">
                                <AlertTriangle className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
                                <span className="text-[10px] font-bold">Intervene</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex flex-col gap-2 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 group">
                                <Zap className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
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
                <Card className="flex-1 border-slate-200 overflow-hidden flex flex-col">
                    <Tabs defaultValue="agreements" className="flex-1 flex flex-col">
                        <TabsList className="bg-slate-50 border-b border-slate-100 rounded-none w-full justify-start px-2 py-0 h-10">
                            <TabsTrigger value="agreements" className="text-[10px] h-8 data-[state=active]:bg-white">AGREEMENTS</TabsTrigger>
                            <TabsTrigger value="details" className="text-[10px] h-8 data-[state=active]:bg-white">CASE STATS</TabsTrigger>
                        </TabsList>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <TabsContent value="agreements" className="h-full m-0">
                                <ScrollArea className="h-[280px] p-4">
                                    <div className="space-y-3">
                                        <div className="p-2 rounded-lg border border-emerald-100 bg-emerald-50/50">
                                            <h4 className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                                                Exchange Plan A-1
                                                <ChevronRight className="h-3 w-3" />
                                            </h4>
                                            <p className="text-[10px] text-emerald-700/70 mt-1 line-clamp-2">Exchanges at Starbucks (3rd St) every Friday at 5:00 PM.</p>
                                        </div>
                                        <div className="p-2 rounded-lg border border-slate-200">
                                            <h4 className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                Holiday Prep 2026
                                                <ChevronRight className="h-3 w-3" />
                                            </h4>
                                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">Vacation selection requires 30 days notice.</p>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="details" className="p-4 space-y-4 m-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Conflict Level</p>
                                        <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">HIGH-TEMP</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Response</p>
                                        <p className="text-sm font-bold">4.2 hours</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Recent Violations</p>
                                    <p className="text-xs text-slate-600">3 late exchanges in past 30 days.</p>
                                </div>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                    <CardFooter className="p-3 bg-slate-50 flex justify-center">
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] text-slate-500">
                            <Settings className="h-3 w-3 mr-2" />
                            Call Settings
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
