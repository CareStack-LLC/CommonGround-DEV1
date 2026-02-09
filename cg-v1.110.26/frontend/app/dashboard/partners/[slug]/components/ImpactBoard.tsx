'use client';

import Link from 'next/link';
import {
    Shield,
    TrendingUp,
    MessageSquare,
    Share2,
    Users,
    Calendar,
    ArrowUpRight,
    Heart,
    Zap,
    Lock,
    Settings,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PartnerMetrics {
    codes_distributed: number;
    codes_activated: number;
    activation_rate: number;
    active_users: number;
    messages_sent: number;
    aria_interventions: number;
    schedules_created: number;
    conflict_reduction_pct: number | null;
}

interface ImpactBoardProps {
    partner: {
        partner_slug: string;
        display_name: string;
        codes_remaining: number;
    };
    metrics: PartnerMetrics;
    isStaff?: boolean;
}

export default function ImpactBoard({ partner, metrics, isStaff = false }: ImpactBoardProps) {
    // Calculated impacts
    const familiesHelped = metrics.active_users > 0 ? metrics.active_users : metrics.codes_activated;
    const peaceMoments = metrics.aria_interventions; // "Conflicts Prevented" -> "Moments of Peace"
    const connectionPoints = metrics.messages_sent; // "Messages Sent" -> "Connection Points"
    const stabilityScore = metrics.activation_rate; // "Activation Rate" -> "Stability Score"

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-amber-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-wider uppercase">
                                Impact Report
                            </span>
                            <span className="text-gray-500 text-sm">Updated Live</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            <span className="text-white">The </span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                                {partner.display_name}
                            </span>
                            <span className="text-white"> Effect</span>
                        </h1>
                        <p className="text-xl text-gray-400 mt-2 max-w-2xl">
                            Real-time data on how our partnership is building stronger families and protecting children from conflict.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isStaff && (
                            <Link href={`/dashboard/partners/${partner.partner_slug}/codes`}>
                                <Button className="bg-white text-gray-900 font-bold hover:bg-amber-400 transition-colors">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Manage Codes
                                </Button>
                            </Link>
                        )}
                        <Button
                            variant="outline"
                            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm"
                            onClick={() => window.print()}
                        >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share Report
                        </Button>
                    </div>
                </header>

                {/* Hero Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Main Impact Card */}
                    <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700/50 md:col-span-2 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('/assets/grain.png')] opacity-20" />
                        <div className="absolute top-0 right-0 p-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors duration-1000" />

                        <CardContent className="relative p-10 flex flex-col justify-between h-full min-h-[300px]">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-400 mb-1">Families Supported</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-7xl font-black text-white tracking-tighter">
                                            {familiesHelped}
                                        </span>
                                        <span className="text-xl text-green-400 font-medium flex items-center">
                                            <TrendingUp className="h-4 w-4 mr-1" />
                                            Active Now
                                        </span>
                                    </div>
                                </div>
                                <div className="h-16 w-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                                    <Heart className="h-8 w-8 text-amber-500 fill-amber-500/20" />
                                </div>
                            </div>

                            <div className="mt-8">
                                <div className="h-2 w-full bg-gray-700/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.min(stabilityScore, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-3 text-sm">
                                    <span className="text-gray-400">Stability Score</span>
                                    <span className="text-white font-medium">{stabilityScore}% of goal</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-1 gap-6">
                        <Card className="bg-gray-800/50 border-gray-700/50 hover:border-indigo-500/30 transition-colors">
                            <CardContent className="p-8">
                                <Shield className="h-8 w-8 text-indigo-400 mb-4" />
                                <h3 className="text-4xl font-bold text-white mb-1">{peaceMoments}</h3>
                                <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Toxic Threads Intercepted</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Potential conflicts defused by ARIA AI before reaching the children.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gray-800/50 border-gray-700/50 hover:border-green-500/30 transition-colors">
                            <CardContent className="p-8">
                                <MessageSquare className="h-8 w-8 text-green-400 mb-4" />
                                <h3 className="text-4xl font-bold text-white mb-1">{connectionPoints}</h3>
                                <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Safe Communications</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Secure, documented messages exchanged between co-parents.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Narrative Sections */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">Strong. Safe. Smart.</h2>
                            <p className="text-gray-400">
                                How {partner.display_name} is delivering on its promise to fathers.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-4 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 transition-colors">
                                <div className="mt-1">
                                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <Shield className="h-5 w-5 text-amber-500" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white">Leading with Strength</h4>
                                    <p className="text-gray-400 text-sm leading-relaxed mt-1">
                                        Fathers are entering mediation prepared. {familiesHelped} families
                                        now have verified data and organized reports, giving them the
                                        strength to advocate for their rights.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 transition-colors">
                                <div className="mt-1">
                                    <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <Lock className="h-5 w-5 text-indigo-400" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white">Creating Safety</h4>
                                    <p className="text-gray-400 text-sm leading-relaxed mt-1">
                                        The ARIA Safety Shield intercepted {peaceMoments} toxic interactions.
                                        That's {peaceMoments} moments where a child was protected from
                                        conflict, preserving their peace of mind.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 transition-colors">
                                <div className="mt-1">
                                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                        <Sparkles className="h-5 w-5 text-green-400" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white">Staying Smart</h4>
                                    <p className="text-gray-400 text-sm leading-relaxed mt-1">
                                        AI-powered communication tools ensured {connectionPoints} messages
                                        remained professional and productive, helping fathers master
                                        the art of responding, not reacting.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Hero Image Card */}
                        <div className="relative aspect-video rounded-3xl overflow-hidden border border-gray-700 shadow-2xl group">
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10 opacity-80" />
                            <img
                                src="/assets/marketing/empowering_father_son.png"
                                alt="Father and son moment"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute bottom-6 left-6 z-20">
                                <p className="text-white font-bold text-xl">Protecting Legacies.</p>
                                <p className="text-gray-300 text-sm">One family at a time.</p>
                            </div>
                        </div>

                        {/* Premium Icon Card */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent group-hover:from-amber-500/10 transition-colors" />
                                <img
                                    src="/assets/marketing/premium_document_icon.png"
                                    alt="Premium Security"
                                    className="w-20 h-20 object-contain mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                />
                                <p className="text-white font-bold">Bank-Grade Security</p>
                                <p className="text-xs text-gray-500 mt-1">256-bit Encryption</p>
                            </div>
                            <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent group-hover:from-indigo-500/10 transition-colors" />
                                <div className="h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                                    <Users className="h-10 w-10 text-indigo-400" />
                                </div>
                                <p className="text-white font-bold">Community Led</p>
                                <p className="text-xs text-gray-500 mt-1">Built for Fathers</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Call to Action Footer */}
                <div className="rounded-3xl bg-gradient-to-r from-amber-500 to-orange-600 text-gray-900 p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/assets/grain.png')] opacity-20 mix-blend-overlay" />
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl font-black mb-4 tracking-tight">Join the Movement</h2>
                        <p className="text-lg font-medium text-gray-900/90 mb-8 leading-relaxed">
                            {partner.display_name} and CommonGround are proving that technology can heal families.
                            Help us expand this program to more fathers who need to stay present and protected.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800 h-14 px-8 text-lg font-bold rounded-xl shadow-xl shadow-black/20 hover:scale-105 transition-all">
                                Support This Program
                            </Button>
                            <Button variant="ghost" className="bg-white/20 hover:bg-white/30 text-gray-900 h-14 px-8 text-lg font-bold rounded-xl backdrop-blur-sm">
                                Download Case Study
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
