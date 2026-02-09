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
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold text-white">Why This Matters</h2>
                        <div className="space-y-4">
                            <div className="flex gap-4 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
                                <div className="mt-1">
                                    <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                        <Sparkles className="h-4 w-4 text-amber-400" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-white">Every Message Counts</h4>
                                    <p className="text-gray-400 leading-relaxed">
                                        Communication is the lifeline of co-parenting. By providing a secure channel,
                                        {partner.display_name} ensures that {connectionPoints} messages resulted in
                                        coordinated care, not conflict.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
                                <div className="mt-1">
                                    <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                        <Shield className="h-4 w-4 text-indigo-400" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-white">Protecting the Child's Peace</h4>
                                    <p className="text-gray-400 leading-relaxed">
                                        The ARIA Safety Shield intercepted {peaceMoments} toxic interactions.
                                        That's {peaceMoments} times a child didn't have to witness an argument
                                        or feel the tension of a hostile exchange.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative aspect-square md:aspect-auto md:h-full min-h-[400px] rounded-3xl overflow-hidden bg-gray-800 border border-gray-700">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-indigo-500/10" />
                        <div className="absolute inset-x-12 top-12 bottom-12 flex flex-col justify-center space-y-3">
                            <h3 className="text-center text-gray-500 text-sm uppercase tracking-widest mb-4">Grant Distribution Velocity</h3>
                            {[65, 45, 75, 55, 80, 70].map((h, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="text-xs text-gray-600 font-mono w-8">Wk {i + 1}</div>
                                    <div className="flex-1 h-3 bg-gray-700/50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-gray-600 to-gray-500 rounded-full"
                                            style={{ width: `${h}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="flex items-center gap-4">
                                <div className="text-xs text-amber-500 font-mono w-8">Now</div>
                                <div className="flex-1 h-3 bg-gray-700/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"
                                        style={{ width: `${stabilityScore}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Call to Action Footer */}
                <div className="rounded-3xl bg-amber-500 text-gray-900 p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/assets/grain.png')] opacity-10" />
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl font-black mb-4">Join the Movement</h2>
                        <p className="text-lg font-medium text-gray-900/80 mb-8">
                            {partner.display_name} and CommonGround are proving that technology can heal families.
                            Help us expand this program to more families in need.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800 h-12 px-8 text-lg font-bold">
                                Support This Program
                            </Button>
                            <Button variant="ghost" className="bg-white/20 hover:bg-white/30 text-gray-900 h-12 px-8 text-lg font-bold">
                                Download Case Study
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
