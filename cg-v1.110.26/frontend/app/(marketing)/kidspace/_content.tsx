'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    Heart,
    Shield,
    Play,
    BookOpen,
    Video,
    Clock,
    Check,
    ArrowRight,
    Lock,
    Eye,
    Gift,
    Users,
} from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * KidSpace Landing Page — Simplified
 *
 * Focused on the core message: keeping families connected when apart.
 * Parents control everything. Kids get to bond.
 */

export function KidSpaceContent() {
    return (
        <div className="min-h-screen bg-[#F4F8F7]">

            {/* HERO */}
            <section className="pt-12 pb-16 lg:pt-20 lg:pb-24">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 text-sm font-medium rounded-full">
                            <Shield className="w-3.5 h-3.5" /> COPPA Compliant
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 text-sm font-medium rounded-full">
                            Ages 3–12
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 px-3 py-1 text-sm font-medium rounded-full">
                            <Eye className="w-3.5 h-3.5" /> Parent-controlled
                        </span>
                    </div>

                    <h1
                        className="text-4xl md:text-5xl lg:text-6xl text-[#1E3A4A] mb-6 leading-tight"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                        Stay connected with your child
                        <br />
                        <span className="text-[#3DAA8A]">even when you're apart</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        KidSpace lets parents and children read books, watch movies, play games, and video call together — even from different homes. Parents control everything. Kids just get to bond.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/early-access"
                            className="inline-flex items-center justify-center px-8 py-4 bg-[#3DAA8A] text-white font-semibold rounded-full hover:bg-[#2D8A6A] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group text-lg"
                        >
                            Try KidSpace Free
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="/pricing"
                            className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#1E3A4A] font-semibold rounded-full border-2 border-gray-200 hover:border-[#3DAA8A]/40 transition-all text-lg"
                        >
                            View Plans
                        </Link>
                    </div>

                    <p className="mt-4 text-sm text-gray-500">
                        Included with Plus ($17/mo) and Complete plans. 14-day free trial.
                    </p>
                </div>
            </section>

            {/* WHAT KIDSPACE DOES — simple 3 features */}
            <section className="py-16 md:py-24 bg-white">
                <div className="max-w-5xl mx-auto px-6">
                    <h2
                        className="text-3xl md:text-4xl text-[#1E3A4A] mb-4 text-center"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                        Bond across <span className="text-[#3DAA8A]">two homes</span>
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto text-center mb-16">
                        Whether it's bedtime stories from Dad's house or movie night at Grandma's — KidSpace keeps the connection alive.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Read */}
                        <div className="bg-[#F4F8F7] rounded-3xl p-8 text-center">
                            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <BookOpen className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-bold text-[#1E3A4A] mb-3" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                                Read Together
                            </h3>
                            <p className="text-gray-600">
                                Bedtime stories across two homes. Kids pick the book, both parents can co-read — a shared moment that says "we both love you."
                            </p>
                        </div>

                        {/* Watch */}
                        <div className="bg-[#F4F8F7] rounded-3xl p-8 text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Video className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-[#1E3A4A] mb-3" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                                Watch Together
                            </h3>
                            <p className="text-gray-600">
                                Age-appropriate movies and episodes. Start a movie night with one tap. No scheduling fights — just press play.
                            </p>
                        </div>

                        {/* Play */}
                        <div className="bg-[#F4F8F7] rounded-3xl p-8 text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Play className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-[#1E3A4A] mb-3" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                                Play Together
                            </h3>
                            <p className="text-gray-600">
                                Cooperative games designed for bonding. Tic-tac-toe with Grandma, puzzles with Dad — connection through play.
                            </p>
                        </div>
                    </div>

                    {/* What's new in KidSpace — April 2026 */}
                    <div className="mt-12 rounded-3xl border border-[#3DAA8A]/20 bg-[#F4F8F7] p-6 md:p-8">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#3DAA8A] mb-3">
                            New in KidSpace
                        </p>
                        <h3 className="text-2xl text-[#1E3A4A] mb-4" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                            More ways to stay close
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl leading-none">🖌️</span>
                                <div>
                                    <p className="font-semibold text-[#1E3A4A]">Shared whiteboard</p>
                                    <p className="text-gray-600 mt-0.5">Draw together in real time — math homework or silly doodles, same canvas.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl leading-none">❌⭕</span>
                                <div>
                                    <p className="font-semibold text-[#1E3A4A]">Two-player games</p>
                                    <p className="text-gray-600 mt-0.5">Play Tic-Tac-Toe vs. a parent, grandparent, or the computer — moves sync live.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl leading-none">✅</span>
                                <div>
                                    <p className="font-semibold text-[#1E3A4A]">Chores &amp; allowance</p>
                                    <p className="text-gray-600 mt-0.5">Parents assign chores with an optional reward. Kids mark them done; wallet credits on approval.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl leading-none">🎁</span>
                                <div>
                                    <p className="font-semibold text-[#1E3A4A]">Rewards store</p>
                                    <p className="text-gray-600 mt-0.5">Kids spend earned wallet balance on rewards you curate — ice cream trip, new book, whatever fits.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl leading-none">🎂</span>
                                <div>
                                    <p className="font-semibold text-[#1E3A4A]">Birthdays on the calendar</p>
                                    <p className="text-gray-600 mt-0.5">Upcoming birthdays show up automatically on the shared family calendar.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl leading-none">🛡️</span>
                                <div>
                                    <p className="font-semibold text-[#1E3A4A]">Block &amp; report</p>
                                    <p className="text-gray-600 mt-0.5">One tap to flag a circle contact for safety concerns — severe reports auto-block.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PARENTS CONTROL EVERYTHING */}
            <section className="py-16 md:py-20 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full mb-6">
                                <Lock className="w-4 h-4" />
                                <span className="text-sm font-medium">Full Parental Control</span>
                            </div>
                            <h2
                                className="text-3xl md:text-4xl mb-6"
                                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                            >
                                You decide who, when, and how long
                            </h2>
                            <p className="text-lg text-white/80 mb-8">
                                KidSpace isn't unsupervised screen time. Think of it like a supervised visit — you control who your child connects with, set calling hours, and monitor everything through ARIA.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                'Approve every contact',
                                'Set calling hours',
                                'Control screen time',
                                'ARIA monitors messages',
                                'End calls anytime',
                                'View activity logs',
                            ].map((feature) => (
                                <div key={feature} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                    <Check className="w-5 h-5 text-[#3DAA8A] mb-2" />
                                    <div className="text-sm font-medium text-white/90">{feature}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* GRANDPARENTS / EXTENDED FAMILY */}
            <section className="py-16 md:py-20 bg-white">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-[#FEF7ED] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Gift className="w-10 h-10 text-amber-600" />
                        </div>
                        <div>
                            <h3
                                className="text-2xl md:text-3xl text-[#1E3A4A] mb-3"
                                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                            >
                                The perfect gift for grandparents
                            </h3>
                            <p className="text-gray-600 text-lg mb-4">
                                A grandparent might pay for KidSpace just to have movie nights with their grandchild. An aunt might gift it so she can read bedtime stories from across the country. KidSpace keeps families together when life pulls them apart.
                            </p>
                            <Link
                                href="/early-access"
                                className="inline-flex items-center text-[#F5A623] font-semibold hover:text-[#D4910F] transition-colors group"
                            >
                                Gift KidSpace
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 md:py-24 bg-[#F4F8F7]">
                <div className="max-w-3xl mx-auto px-6">
                    <h2
                        className="text-3xl text-[#1E3A4A] mb-10 text-center"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                        Common questions
                    </h2>

                    <Accordion type="single" collapsible className="w-full space-y-4">
                        <AccordionItem value="age" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-[#1E3A4A] hover:no-underline py-6">
                                What age range is KidSpace for?
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                                KidSpace is designed for children ages 3–12. Stories are visual and simple for younger kids, while games and episodes engage older children with more interactivity.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="safety" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-[#1E3A4A] hover:no-underline py-6">
                                Is it safe? Can I control who my child talks to?
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                                Yes. Parents approve every contact. ARIA monitors all messages for safety. You set calling hours and can end any call instantly. KidSpace is fully COPPA compliant.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="both" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-[#1E3A4A] hover:no-underline py-6">
                                Do both parents need an account?
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                                For the full experience, yes. But one parent can still use KidSpace solo with their child for stories, movies, and games.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="family" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-[#1E3A4A] hover:no-underline py-6">
                                Can grandparents or extended family use it?
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                                Absolutely. Parents add approved contacts through My Circle. Grandparents, aunts, uncles — anyone the parent approves can enjoy story time, movie nights, and games with the child.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="cost" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-[#1E3A4A] hover:no-underline py-6">
                                What does it cost?
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                                KidSpace is included with the Plus plan ($17/mo) and Complete plan ($34.99/mo). Both come with a 14-day free trial. No contracts — cancel anytime.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="py-20 bg-white">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2
                        className="text-3xl md:text-4xl text-[#1E3A4A] mb-6"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                        Your child doesn't need to feel the distance
                    </h2>
                    <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto">
                        KidSpace turns tough transitions into bonding moments. Start your free trial and see what a calmer week looks like.
                    </p>
                    <Link
                        href="/early-access"
                        className="inline-flex items-center justify-center px-10 py-5 bg-[#3DAA8A] text-white font-bold text-lg rounded-full hover:bg-[#2D8A6A] transition-all shadow-xl hover:-translate-y-1 group"
                    >
                        Start Free Trial
                        <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                    </Link>
                    <p className="mt-4 text-sm text-gray-500">
                        14 days free. No credit card required. Cancel anytime.
                    </p>
                </div>
            </section>
        </div>
    );
}
