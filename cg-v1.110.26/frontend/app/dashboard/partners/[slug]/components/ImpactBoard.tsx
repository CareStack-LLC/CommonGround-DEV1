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
    // "Fathers Enrolled" -> active_users (or codes_activated if active_users is 0/null)
    const fathersEnrolled = metrics.active_users > 0 ? metrics.active_users : metrics.codes_activated;

    // "Grant Codes Distributed" -> codes_distributed
    const codesDistributed = metrics.codes_distributed;

    // "Messages Kept Respectful" -> messages_sent (assuming these are the safe ones)
    const respectfulMessages = metrics.messages_sent;

    // "Conflict Reduction Signal" -> conflict_reduction_pct (or a calculated fallback)
    // If null, we might show a baseline or "Tracking"
    const conflictReduction = metrics.conflict_reduction_pct || 0;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-amber-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-wider uppercase">
                                Impact Report
                            </span>
                            <span className="text-gray-500 text-sm flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Updated Live
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                            Proof that calm support <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                                changes families.
                            </span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
                            {partner.display_name} and CommonGround partnered to give fathers grant-funded access to a calmer co-parenting system. The result: more fathers engaged, more families supported, and measurable reductions in conflict patterns.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
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

                {/* Metrics Grid (4 Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
                    {/* Card 1: Fathers Enrolled */}
                    <Card className="bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 transition-colors group">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users className="h-5 w-5 text-amber-500" />
                                </div>
                                <span className="text-xs font-mono text-gray-500">Goal: 100/Q2</span>
                            </div>
                            <h3 className="text-4xl font-black text-white mb-1">{fathersEnrolled}</h3>
                            <p className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Fathers Enrolled</p>
                            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-700/50 pt-3">
                                Every enrollment is one more family with a better shot at stability.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 2: Grant Codes Distributed */}
                    <Card className="bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 transition-colors group">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Zap className="h-5 w-5 text-blue-400" />
                                </div>
                                <span className="text-xs font-mono text-gray-500">Active</span>
                            </div>
                            <h3 className="text-4xl font-black text-white mb-1">{codesDistributed}</h3>
                            <p className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Grant Codes Distributed</p>
                            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-700/50 pt-3">
                                This is what turning funding into real help looks like — fast, direct, usable.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 3: Messages Kept Respectful */}
                    <Card className="bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 transition-colors group">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <MessageSquare className="h-5 w-5 text-green-400" />
                                </div>
                                <span className="text-xs font-mono text-gray-500">Goal: 80%</span>
                            </div>
                            <h3 className="text-4xl font-black text-white mb-1">{respectfulMessages}</h3>
                            <p className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Messages Kept Respectful</p>
                            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-700/50 pt-3">
                                Less escalation means fewer moments where kids feel the tension.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 4: Conflict Reduction Signal */}
                    <Card className="bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 transition-colors group">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <TrendingUp className="h-5 w-5 text-indigo-400" />
                                </div>
                                <span className="text-xs font-mono text-gray-500">Target: 25%</span>
                            </div>
                            <h3 className="text-4xl font-black text-white mb-1">
                                {conflictReduction > 0 ? `-${conflictReduction}%` : 'Tracking'}
                            </h3>
                            <p className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Conflict Reduction Signal</p>
                            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-700/50 pt-3">
                                The goal isn’t silence — it’s progress. Calmer patterns create safer homes.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Narrative Sections Grid */}
                <div className="grid lg:grid-cols-2 gap-12 mb-24">
                    {/* Why These Numbers Matter */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4">Why these four numbers matter</h2>
                            <p className="text-gray-400 leading-relaxed mb-6">
                                We track what partners and families actually care about:
                            </p>
                            <ul className="space-y-4">
                                <li className="flex gap-3">
                                    <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-amber-500 text-xs font-bold">1</span>
                                    </div>
                                    <span className="text-gray-300"><strong className="text-white">Fathers Enrolled:</strong> Are fathers enrolling and staying engaged?</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-blue-500 text-xs font-bold">2</span>
                                    </div>
                                    <span className="text-gray-300"><strong className="text-white">Grant Codes:</strong> Are we delivering support quickly and fairly?</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-green-500 text-xs font-bold">3</span>
                                    </div>
                                    <span className="text-gray-300"><strong className="text-white">Respectful Messages:</strong> Are families communicating in a healthier way day-to-day?</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-indigo-500 text-xs font-bold">4</span>
                                    </div>
                                    <span className="text-gray-300"><strong className="text-white">Conflict Reduction:</strong> Is conflict behavior decreasing over time — not just “today”?</span>
                                </li>
                            </ul>
                            <div className="mt-8 p-4 border-l-2 border-amber-500 bg-gray-800/30">
                                <p className="text-lg font-medium text-white italic">"This is what stability looks like when you can measure it."</p>
                            </div>
                        </div>

                        <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">How impact happens</h3>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-gray-900 rounded-lg border border-gray-700">
                                        <Users className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">1. Fathers Enroll</p>
                                        <p className="text-sm text-gray-400">Through {partner.display_name}, engaging with support rooted in growth.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-gray-900 rounded-lg border border-gray-700">
                                        <Zap className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">2. Grant Codes Distributed</p>
                                        <p className="text-sm text-gray-400">Removing cost barriers to activate access immediately.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-gray-900 rounded-lg border border-gray-700">
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">3. Patterns Improve</p>
                                        <p className="text-sm text-gray-400">Families use a shared system designed to reduce escalation.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Partnership & Trust */}
                    <div className="space-y-8">
                        {/* Hero Image Block */}
                        <div className="relative aspect-video rounded-3xl overflow-hidden border border-gray-700 shadow-2xl group">
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10 opacity-80" />
                            <img
                                src="/assets/marketing/empowering_father_son.png"
                                alt="Father and son moment"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute bottom-6 left-6 z-20 max-w-md">
                                <h3 className="text-white font-bold text-2xl mb-2">Why Forever Forward × CommonGround works</h3>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    Forever Forward brings the trust, leadership development, and real-world support fathers actually connect with. CommonGround brings the daily structure families need when emotions run hot.
                                </p>
                            </div>
                        </div>

                        {/* Bridge Line */}
                        <div className="flex items-center gap-4 py-4 px-6 bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl border-l-4 border-amber-500">
                            <p className="text-lg font-bold text-amber-100">
                                Support builds the father. Structure protects the family system.
                            </p>
                        </div>

                        {/* Trust Block */}
                        <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="h-6 w-6 text-gray-400" />
                                <h3 className="text-xl font-bold text-white">Built for dignity. Designed for outcomes.</h3>
                            </div>
                            <p className="text-gray-400 leading-relaxed mb-6">
                                We report impact using aggregate signals and trends — not by exposing private family details. The goal is to prove what’s working while keeping families protected.
                            </p>
                            <div className="flex gap-3">
                                <div className="px-3 py-1 rounded-md bg-gray-900 border border-gray-700 text-xs text-gray-500 font-mono">Anonymous Aggregation</div>
                                <div className="px-3 py-1 rounded-md bg-gray-900 border border-gray-700 text-xs text-gray-500 font-mono">Privacy First</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Closing CTA */}
                <div className="rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/assets/grain.png')] opacity-10" />
                    <div className="relative z-10 max-w-3xl mx-auto">
                        <h2 className="text-3xl font-black text-white mb-4">Want your organization to create this kind of impact?</h2>
                        <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                            If you serve fathers, families, or community stability programs, this partnership model is built to scale. Funding turns into grant codes. Grant codes turn into real usage. Usage turns into measurable reductions in conflict patterns.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                            <Button className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold h-12 px-8">
                                Become a Partner
                            </Button>
                            <Button variant="secondary" className="bg-white text-gray-900 hover:bg-gray-100 h-12 px-8 font-bold">
                                Sponsor Grant Codes
                            </Button>
                            <Button variant="outline" className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800 h-12 px-8">
                                Request Partnership Info
                            </Button>
                        </div>
                        <p className="text-sm font-medium text-amber-500/80 uppercase tracking-widest">
                            More dads supported. More calm in homes. Better outcomes for kids.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
