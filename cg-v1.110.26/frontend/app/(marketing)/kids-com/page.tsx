'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    Heart,
    Shield,
    Play,
    BookOpen,
    Video,
    Calendar,
    MessageCircle,
    Users,
    Check,
    HelpCircle,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * KidsCom Landing Page
 * 
 * A child-centered feature for bonding during co-parenting transitions.
 * Theme: Warm Earth, Soft Cream, Rounded, Calm.
 */

export default function KidsComPage() {
    return (
        <div className="min-h-screen bg-[#F4F8F7] overflow-x-hidden">

            {/* 1. HERO SECTION */}
            <section className="relative pt-8 pb-16 lg:pt-16 lg:pb-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

                        {/* Hero Content */}
                        <div className="flex-1 text-center lg:text-left z-10">
                            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-6">
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 px-3 py-1 text-sm font-medium rounded-full">
                                    Child-centered bonding
                                </Badge>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 px-3 py-1 text-sm font-medium rounded-full">
                                    ARIA-safe communication
                                </Badge>
                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 px-3 py-1 text-sm font-medium rounded-full">
                                    Shared moments, not chaos
                                </Badge>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-slate-900 mb-6 leading-tight">
                                Kids need calm. <br />
                                <span className="text-cg-sage">Even when parents can't.</span>
                            </h1>

                            <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                KidsCom helps families stay connected through stories, movies, and games—built to protect peace during hard transitions.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                <Button size="lg" className="rounded-full px-8 py-6 text-lg bg-cg-sage hover:bg-cg-sage-dark shadow-lg shadow-emerald-900/10 transition-all hover:scale-105" asChild>
                                    <Link href="#pricing">See KidsCom</Link>
                                </Button>
                                <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-lg border-cg-sage text-cg-sage hover:bg-cg-sage/5 bg-transparent" asChild>
                                    <Link href="#pricing">View Plans</Link>
                                </Button>
                            </div>

                            <p className="mt-4 text-xs text-slate-500 font-medium">
                                KidsCom included with Plus and above (from $17/mo).
                            </p>
                        </div>

                        {/* Hero Image */}
                        <div className="flex-1 relative w-full max-w-lg lg:max-w-xl">
                            <div className="relative aspect-square w-full">
                                {/* Decorative blob behind image */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-amber-100 rounded-full blur-3xl opacity-60 animate-pulse-slow transform scale-90"></div>

                                <Image
                                    src="/kidsComms/MiloPicoAria.png"
                                    alt="Milo, Pico, and ARIA - Friendly characters for kids"
                                    fill
                                    className="object-contain drop-shadow-2xl z-20 relative hover:scale-105 transition-transform duration-700 ease-in-out"
                                    priority
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Background Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0 pointer-events-none">
                    <div className="absolute top-20 left-10 w-24 h-24 bg-amber-200/20 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-20 right-10 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl"></div>
                </div>
            </section>

            {/* 2. NEEDS SECTION ("What kids actually need right now") */}
            <section className="py-16 md:py-24 bg-white rounded-t-[3rem] shadow-sm relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold font-serif text-slate-900 mb-16">
                        What kids actually need right now
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">

                        {/* Card 1: Consistency */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                <Calendar className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Consistency</h3>
                            <p className="text-slate-600 max-w-xs mx-auto">
                                Simple routines and shared moments that happen regardless of which house they're in.
                            </p>
                        </div>

                        {/* Card 2: Connection */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                <Heart className="w-10 h-10 text-amber-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Connection</h3>
                            <p className="text-slate-600 max-w-xs mx-auto">
                                Bonding without pressure. Just fun, safe activities to do together with Milo & Pico.
                            </p>
                        </div>

                        {/* Card 3: Protection */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                <Shield className="w-10 h-10 text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Protection</h3>
                            <p className="text-slate-600 max-w-xs mx-auto">
                                ARIA helps keep communication calm and protected, so kids can just be kids.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* 3. FEATURE GRID */}
            <section className="py-16 md:py-24 bg-[#F4F8F7] relative z-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold font-serif text-slate-900 mb-4">
                            A bridge for bonding
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            KidsCom gives you safe tools to connect, play, and share moments—even when apart.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Feature 1 */}
                        <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow duration-300 rounded-3xl overflow-hidden">
                            <CardContent className="p-8">
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 text-orange-600">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Read together</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Short bedtime stories starring Milo & Pico, with co-reading prompts to help spark imagination.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 2 */}
                        <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow duration-300 rounded-3xl overflow-hidden">
                            <CardContent className="p-8">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                                    <Video className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Watch together</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Mini adventures and episodes you can stream safely together, perfect for winding down.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 3 */}
                        <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow duration-300 rounded-3xl overflow-hidden">
                            <CardContent className="p-8">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                                    <Play className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Play together</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Simple co-op games made for bonding (not competition), designing to build teamwork.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 4 */}
                        <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow duration-300 rounded-3xl overflow-hidden">
                            <CardContent className="p-8">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Shared Moments</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    One-tap "movie night" or "story time" scheduling that respects everyone's time.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 5 */}
                        <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow duration-300 rounded-3xl overflow-hidden">
                            <CardContent className="p-8">
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6 text-amber-600">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">ARIA Guardrails</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Gentle message screening and de-escalation nudges keep the vibe safe and child-friendly.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 6 */}
                        <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow duration-300 rounded-3xl overflow-hidden">
                            <CardContent className="p-8">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6 text-slate-600">
                                    <Users className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Parent Bridge</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    A safe lane for logistics so kids don't have to carry the stress of planning.
                                </p>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </section>

            {/* 4. HOW IT WORKS */}
            <section className="py-16 md:py-24 bg-white rounded-[3rem] shadow-sm relative z-10 mx-4 md:mx-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold font-serif text-slate-900 mb-4">
                            How KidsCom works
                        </h2>
                        <p className="text-sm text-slate-500 font-medium bg-slate-100 inline-block px-4 py-2 rounded-full">
                            KidsCom experiences focus on bonding—not legal stress.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

                        {/* Connecting line for desktop */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-200 -z-0 border-t-2 border-dashed border-slate-200"></div>

                        {/* Step 1 */}
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-24 h-24 bg-white border-4 border-[#F4F8F7] rounded-full flex items-center justify-center mb-6 text-2xl font-bold text-slate-900 shadow-sm">
                                1
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Pick a moment</h3>
                            <p className="text-slate-600">
                                Choose a story, episode, or game to share with your child.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-24 h-24 bg-white border-4 border-[#F4F8F7] rounded-full flex items-center justify-center mb-6 text-2xl font-bold text-slate-900 shadow-sm">
                                2
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Invite co-parent</h3>
                            <p className="text-slate-600">
                                Send a calm, structured invite. ARIA handles the coordination.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-24 h-24 bg-white border-4 border-[#F4F8F7] rounded-full flex items-center justify-center mb-6 text-2xl font-bold text-slate-900 shadow-sm">
                                3
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Bond with child</h3>
                            <p className="text-slate-600">
                                Enjoy the KidsCom experience. Records stay clean and positive.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* 5. CONTENT PREVIEW STRIP */}
            <section className="py-16 bg-[#F4F8F7] overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-4 md:pb-0 scrollbar-hide snap-x">

                        {/* Preview 1 */}
                        <div className="flex-shrink-0 w-80 bg-white rounded-3xl p-4 shadow-sm snap-center">
                            <div className="aspect-video bg-orange-100 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center group">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                <BookOpen className="w-12 h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="px-2 pb-2">
                                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Tonight's Story</span>
                                <h4 className="text-lg font-bold text-slate-900 mt-1">Milo Learns Brave Steps</h4>
                            </div>
                        </div>

                        {/* Preview 2 */}
                        <div className="flex-shrink-0 w-80 bg-white rounded-3xl p-4 shadow-sm snap-center">
                            <div className="aspect-video bg-blue-100 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center group">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                <Video className="w-12 h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="px-2 pb-2">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Mini Episode</span>
                                <h4 className="text-lg font-bold text-slate-900 mt-1">Pico's Friendly Adventure</h4>
                            </div>
                        </div>

                        {/* Preview 3 */}
                        <div className="flex-shrink-0 w-80 bg-white rounded-3xl p-4 shadow-sm snap-center">
                            <div className="aspect-video bg-emerald-100 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center group">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                <Play className="w-12 h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="px-2 pb-2">
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Game</span>
                                <h4 className="text-lg font-bold text-slate-900 mt-1">Team-Up Quest</h4>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 6. SAFETY SECTION */}
            <section className="py-16 md:py-20 bg-gradient-to-br from-cg-sage to-[#2C4A3B] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                        <Shield className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold font-serif mb-6">
                        Built for safety form the ground up
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-10">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" />
                                <p className="font-medium">ARIA screens messages before they hit send</p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" />
                                <p className="font-medium">Keeps children supported and protected</p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" />
                                <p className="font-medium">Encourages calm, structured coordination</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-white/70 text-sm font-medium">
                        Safety tools run across CommonGround. KidsCom builds the bonding layer.
                    </p>
                </div>
            </section>

            {/* 7. PRICING GATE ("KidsCom starts with Plus") */}
            <section id="pricing" className="py-16 md:py-24 bg-[#F4F8F7]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold font-serif text-slate-900 mb-4">
                            KidsCom starts with Plus
                        </h2>
                        <p className="text-lg text-slate-600">
                            Invest in peace of mind and happier memories.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">

                        {/* Free Plan */}
                        <Card className="bg-white/50 border-2 border-slate-200 shadow-none rounded-3xl opacity-70 hover:opacity-100 transition-opacity">
                            <CardContent className="p-8 text-center">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Free</h3>
                                <div className="text-3xl font-bold text-slate-900 mb-4">$0</div>
                                <div className="py-6 border-t border-slate-200">
                                    <span className="inline-flex items-center gap-2 text-slate-500 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                        No KidsCom
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Plus Plan (Highlighted) */}
                        <Card className="bg-white border-2 border-cg-sage shadow-xl rounded-3xl relative overflow-hidden transform md:-translate-y-4">
                            <div className="absolute top-0 inset-x-0 bg-cg-sage py-1 text-center">
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Most Popular</span>
                            </div>
                            <CardContent className="p-8 text-center pt-10">
                                <h3 className="text-lg font-bold text-cg-sage mb-2">Plus</h3>
                                <div className="text-4xl font-bold text-slate-900 mb-1">$17<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                                <div className="py-6 border-t border-slate-100 mt-4 space-y-3">
                                    <div className="flex items-center gap-3 justify-center text-slate-800 font-medium bg-emerald-50 py-2 px-4 rounded-full">
                                        <Check className="w-5 h-5 text-emerald-600" />
                                        Includes KidsCom
                                    </div>
                                    <div className="flex items-center gap-3 justify-center text-slate-600 text-sm">
                                        <Check className="w-4 h-4 text-emerald-600" />
                                        ARIA basics
                                    </div>
                                </div>
                                <Button className="w-full rounded-full bg-cg-sage hover:bg-cg-sage-dark text-white font-bold py-6 mt-4 shadow-lg text-lg" asChild>
                                    <Link href="/register?plan=plus">Start Trial</Link>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Complete Plan */}
                        <Card className="bg-white border text-center border-slate-200 shadow-md rounded-3xl">
                            <CardContent className="p-8">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Complete</h3>
                                <div className="text-3xl font-bold text-slate-900 mb-1">$34.99<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                                <div className="py-6 border-t border-slate-100 mt-4 space-y-3">
                                    <div className="flex items-center gap-3 justify-center text-slate-800 font-medium">
                                        <Check className="w-5 h-5 text-emerald-600" />
                                        Includes KidsCom
                                    </div>
                                    <div className="flex items-center gap-3 justify-center text-slate-600 text-sm">
                                        <Check className="w-4 h-4 text-emerald-600" />
                                        Advanced support tools
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-6 mt-4" asChild>
                                    <Link href="/register?plan=complete">Start Trial</Link>
                                </Button>
                            </CardContent>
                        </Card>

                    </div>

                    <div className="text-center mt-8">
                        <p className="text-sm text-slate-500">
                            KidsCom is not available on the free plan.
                        </p>
                    </div>
                </div>
            </section>

            {/* 8. TESTIMONIALS */}
            <section className="py-16 bg-white rounded-[3rem] mx-4 md:mx-8 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Testimonial 1 */}
                        <div className="bg-[#F4F8F7] p-8 rounded-3xl relative">
                            <div className="text-amber-400 text-4xl font-serif absolute top-6 left-6 opacity-30">"</div>
                            <p className="text-slate-700 italic mb-4 relative z-10 font-medium leading-relaxed">
                                Since we started doing the Milo stories, bedtime at Dad's house feels peaceful now. He actually sleeps.
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">SM</div>
                                <span className="font-bold text-slate-900 text-sm">Sarah M.</span>
                            </div>
                        </div>

                        {/* Testimonial 2 */}
                        <div className="bg-[#F4F8F7] p-8 rounded-3xl relative">
                            <div className="text-amber-400 text-4xl font-serif absolute top-6 left-6 opacity-30">"</div>
                            <p className="text-slate-700 italic mb-4 relative z-10 font-medium leading-relaxed">
                                Scheduling movie night used to start arguments. Now we just tap a button in KidsCom and it's handled.
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">DJ</div>
                                <span className="font-bold text-slate-900 text-sm">David J.</span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 9. FAQ */}
            <section className="py-16 md:py-24 bg-[#F4F8F7]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold font-serif text-slate-900 mb-10 text-center">
                        Common Questions
                    </h2>

                    <Accordion type="single" collapsible className="w-full space-y-4">
                        <AccordionItem value="item-1" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-slate-900 hover:no-underline py-6">
                                Is KidsCom for toddlers or older kids?
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 leading-relaxed">
                                KidsCom creates content suitable for ages 3-10. Stories are simpler for younger ones, while games and episodes can engage older children.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-slate-900 hover:no-underline py-6">
                                Do both parents need an account?
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 leading-relaxed">
                                Yes, for the full experience (like messaging and shared scheduling), both parents should have an account. However, one parent can still use the content features solo.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-slate-900 hover:no-underline py-6">
                                How does ARIA keep messages safe?
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 leading-relaxed">
                                ARIA reviews messages before they are sent, suggesting gentler alternatives to keep communication constructive and child-friendly.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-slate-900 hover:no-underline py-6">
                                Can I cancel anytime?
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 leading-relaxed">
                                Absolutely. There are no contracts. You can upgrade, downgrade, or cancel your Plus subscription at any time.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>

            {/* 10. FINAL CTA BAND */}
            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold font-serif text-slate-900 mb-8">
                        Create a calmer week for your child.
                    </h2>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 py-6 text-lg border-slate-300 hover:bg-slate-50" asChild>
                            <Link href="#pricing">View Plans</Link>
                        </Button>
                        <Button size="lg" className="w-full sm:w-auto rounded-full px-10 py-6 text-lg bg-cg-sage hover:bg-cg-sage-dark shadow-lg shadow-emerald-900/10" asChild>
                            <Link href="/register?plan=plus">Start Plus Trial</Link>
                        </Button>
                    </div>

                    <p className="text-sm text-slate-500">
                        KidsCom included with Plus and above (from $17/mo).
                    </p>
                </div>
            </section>

        </div>
    );
}
