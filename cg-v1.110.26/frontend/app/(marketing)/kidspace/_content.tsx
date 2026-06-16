'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    Shield,
    Gamepad2,
    Film,
    BookOpen,
    Video,
    CalendarDays,
    Check,
    ArrowRight,
    Lock,
    Eye,
    Gift,
    Flag,
    PhoneCall,
    Sparkles,
    PencilRuler,
    Cake,
    Wallet,
} from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * KidSpace Landing Page
 *
 * Fun, collaborative, and safe — the page should make a parent (or
 * grandparent) want to recommend it. KidSpace is more than a call: kids
 * play games, watch shows, read, text and call their parents, and keep a
 * calendar — all protected by ARIA call monitoring and full parent control.
 */

/* Zig-zag "things you can do together" rows */
const DO_TOGETHER = [
    {
        eyebrow: 'Play',
        icon: Gamepad2,
        title: 'Play games together — really together',
        body: "Cooperative games, two-player Tic-Tac-Toe, and a shared whiteboard where moves and doodles sync live. Beat Grandma at a game from two homes away. It's connection that feels like fun, not a scheduled “call.”",
        image: '/images/marketing/cg_kidspace_play.jpg',
        alt: 'Two siblings laughing while playing a game together in KidSpace',
        accent: 'sage' as const,
    },
    {
        eyebrow: 'Watch',
        icon: Film,
        title: 'Family movie night, from anywhere',
        body: 'Start an age-appropriate movie or show with one tap and watch it together in sync. No scheduling fights, no “whose night is it” — just press play and share the moment across both homes.',
        image: '/images/marketing/cg_kidspace_movie.jpg',
        alt: 'A child cozy under a blanket watching a family movie in KidSpace',
        accent: 'amber' as const,
    },
    {
        eyebrow: 'Connect',
        icon: Video,
        title: 'Call, text, and stay close every day',
        body: 'Kids get their own safe space to video call, voice call, and text the parents and family members you approve — so a quick “goodnight” is always one tap away, even on the other parent’s week.',
        image: '/images/marketing/cg_kidspace_call.jpg',
        alt: 'A child happily video-calling a parent from KidSpace',
        accent: 'sage' as const,
    },
];

/* Smaller "more to love" feature cards */
const MORE_FEATURES = [
    { icon: BookOpen, title: 'Read together', body: 'Bedtime stories across two homes — kids pick the book, both parents can co-read.', color: 'bg-orange-100 text-orange-600' },
    { icon: PencilRuler, title: 'Shared whiteboard', body: 'Draw in real time — homework help or silly doodles on the same canvas.', color: 'bg-indigo-100 text-indigo-600' },
    { icon: CalendarDays, title: "Their own calendar", body: 'Kids see their week, school events, and which parent they’re with — less anxiety, more confidence.', color: 'bg-blue-100 text-blue-600' },
    { icon: Cake, title: 'Birthdays built in', body: 'Family birthdays show up automatically so no one ever misses the big day.', color: 'bg-pink-100 text-pink-600' },
    { icon: Wallet, title: 'Chores & rewards', body: 'Assign chores with an optional allowance; kids earn a wallet balance for a reward you curate.', color: 'bg-emerald-100 text-emerald-600' },
    { icon: Gift, title: 'Rewards store', body: 'Kids spend earned balance on rewards you set — an ice-cream trip, a new book, your call.', color: 'bg-amber-100 text-amber-600' },
];

/* ARIA safety guarantees */
const SAFETY = [
    { icon: Eye, title: 'ARIA monitors every call & message', body: 'Calls and chats are watched in real time for unwanted or unsafe behavior — so you don’t have to hover.' },
    { icon: PhoneCall, title: 'End any call instantly', body: 'You can drop into or end a video call at any moment, right from your phone.' },
    { icon: Flag, title: 'One-tap flag & block', body: 'Flag a contact for any concern. Severe reports auto-block immediately.' },
    { icon: Lock, title: 'Everything is recorded', body: 'Every call and message is logged and timestamped — a private, court-grade record.' },
];

export function KidSpaceContent() {
    return (
        <div className="min-h-screen bg-cg-sand">

            {/* HERO */}
            <section className="pt-12 pb-14 lg:pt-16 lg:pb-20">
                <div className="max-w-6xl mx-auto px-6 grid items-center gap-10 lg:gap-14 lg:grid-cols-2">
                    <div className="text-center lg:text-left">
                        <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 mb-6">
                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 text-sm font-medium rounded-full">
                                <Shield className="w-3.5 h-3.5" /> COPPA compliant
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 text-sm font-medium rounded-full">
                                Ages 3–12
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 px-3 py-1 text-sm font-medium rounded-full">
                                <Eye className="w-3.5 h-3.5" /> Parent-controlled
                            </span>
                        </div>

                        <h1
                            className="text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 leading-[1.08]"
                            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                        >
                            Way more than a video call.{' '}
                            <span className="text-cg-sage">It&apos;s their happy place.</span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            In KidSpace, kids play games, watch movies, and read <em>together</em> with you — plus call, text, and keep their own calendar. Every call is protected by ARIA, so you stay close without hovering over every conversation.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <Link
                                href="/early-access"
                                className="inline-flex items-center justify-center px-8 py-4 bg-cg-sage text-white font-semibold rounded-full hover:bg-[#2D8A6A] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group text-lg"
                            >
                                Try KidSpace
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center justify-center px-8 py-4 bg-white text-foreground font-semibold rounded-full border-2 border-gray-200 hover:border-cg-sage/40 transition-all text-lg"
                            >
                                View plans
                            </Link>
                        </div>

                        <p className="mt-4 text-sm text-gray-500">
                            Included with Plus ($17/mo) and Complete. 14-day free trial — no card.
                        </p>
                    </div>

                    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
                        <Image
                            src="/images/marketing/cg_kidspace_hero.jpg"
                            alt="A delighted child playing in KidSpace on a tablet"
                            width={1200}
                            height={800}
                            priority
                            className="w-full h-auto rounded-3xl shadow-xl object-cover"
                        />
                    </div>
                </div>
            </section>

            {/* THINGS YOU CAN DO TOGETHER — zig-zag */}
            <section className="py-14 md:py-20 bg-white">
                <div className="max-w-5xl mx-auto px-6 text-center mb-12 md:mb-16">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cg-sage mb-3">
                        Built for bonding
                    </p>
                    <h2
                        className="text-3xl md:text-4xl text-foreground mb-4"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                        Do real things together, <span className="text-cg-sage">across two homes</span>
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Bedtime stories from Dad&apos;s house. Movie night at Grandma&apos;s. A game between weeks. KidSpace keeps the relationship alive — not just the logistics.
                    </p>
                </div>

                <div className="max-w-6xl mx-auto px-6 space-y-16 lg:space-y-24">
                    {DO_TOGETHER.map((row, i) => {
                        const imageLeft = i % 2 === 1;
                        const Icon = row.icon;
                        const gold = row.accent === 'amber';
                        return (
                            <div key={row.title} className="grid items-center gap-10 lg:gap-16 lg:grid-cols-2">
                                <div className={imageLeft ? 'lg:order-1' : 'lg:order-2'}>
                                    <Image
                                        src={row.image}
                                        alt={row.alt}
                                        width={1000}
                                        height={667}
                                        className="w-full h-auto rounded-3xl shadow-xl object-cover"
                                    />
                                </div>
                                <div className={imageLeft ? 'lg:order-2' : 'lg:order-1'}>
                                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-5 ${gold ? 'bg-cg-amber/15' : 'bg-cg-sage/15'}`}>
                                        <Icon className={`h-6 w-6 ${gold ? 'text-cg-amber' : 'text-cg-sage'}`} />
                                    </div>
                                    <p className={`text-xs font-bold uppercase tracking-[0.18em] mb-3 ${gold ? 'text-cg-amber' : 'text-cg-sage'}`}>
                                        {row.eyebrow}
                                    </p>
                                    <h3
                                        className="text-2xl md:text-3xl text-foreground leading-tight mb-4"
                                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                                    >
                                        {row.title}
                                    </h3>
                                    <p className="text-lg text-gray-600 leading-relaxed">{row.body}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* MORE TO LOVE — colorful grid */}
            <section className="py-16 md:py-20 bg-cg-sand">
                <div className="max-w-5xl mx-auto px-6">
                    <h2
                        className="text-3xl md:text-4xl text-foreground mb-3 text-center"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                        And there&apos;s <span className="text-cg-sage">so much more</span>
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto text-center mb-12">
                        Little touches that make a kid&apos;s world feel steady — and make staying close effortless.
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {MORE_FEATURES.map((f) => {
                            const Icon = f.icon;
                            return (
                                <div key={f.title} className="bg-white rounded-3xl p-7 shadow-sm">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${f.color}`}>
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                                        {f.title}
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">{f.body}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* SAFETY — protected by ARIA */}
            <section className="py-16 md:py-24 bg-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cg-sage/10 rounded-full mb-5">
                            <Sparkles className="w-4 h-4 text-cg-sage" />
                            <span className="text-sm font-semibold text-cg-sage">Protected by ARIA</span>
                        </div>
                        <h2
                            className="text-3xl md:text-4xl text-foreground mb-4"
                            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                        >
                            Stay close without hovering over every word
                        </h2>
                        <p className="text-lg text-gray-600">
                            KidSpace isn&apos;t unsupervised screen time. ARIA quietly watches every video call and message for unwanted behavior, you can step in or end a call anytime, and everything is recorded — so you get peace of mind and your kids get room to just be kids.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {SAFETY.map((s) => {
                            const Icon = s.icon;
                            return (
                                <div key={s.title} className="bg-cg-sand rounded-3xl p-6 text-center">
                                    <div className="w-14 h-14 bg-cg-sage/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Icon className="w-7 h-7 text-cg-sage" />
                                    </div>
                                    <h3 className="font-bold text-foreground mb-2">{s.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* PARENTS CONTROL EVERYTHING */}
            <section className="py-16 md:py-20 bg-gradient-to-br from-foreground to-cg-slate text-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full mb-6">
                                <Lock className="w-4 h-4" />
                                <span className="text-sm font-medium">Full parental control</span>
                            </div>
                            <h2
                                className="text-3xl md:text-4xl mb-6"
                                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                            >
                                You decide who, when, and how long
                            </h2>
                            <p className="text-lg text-white/80 mb-8">
                                Think of it like a supervised visit: you approve every contact through My Circle, set calling hours, control screen time, and see every activity log. Kids get freedom to bond — inside boundaries you set.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                'Approve every contact',
                                'Set calling hours',
                                'Control screen time',
                                'ARIA monitors calls',
                                'End calls anytime',
                                'View activity logs',
                            ].map((feature) => (
                                <div key={feature} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                    <Check className="w-5 h-5 text-cg-sage mb-2" />
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
                    <div className="bg-cg-amber-subtle rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Gift className="w-10 h-10 text-amber-600" />
                        </div>
                        <div>
                            <h3
                                className="text-2xl md:text-3xl text-foreground mb-3"
                                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                            >
                                The gift the whole family will love
                            </h3>
                            <p className="text-gray-600 text-lg mb-4">
                                A grandparent might pay for KidSpace just for weekly movie nights with their grandchild. An aunt across the country might gift it for bedtime stories. KidSpace keeps families close when life pulls them apart — and it&apos;s the kind of thing parents recommend to other parents.
                            </p>
                            <Link
                                href="/early-access"
                                className="inline-flex items-center text-cg-amber font-semibold hover:text-[#D4910F] transition-colors group"
                            >
                                Gift KidSpace
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 md:py-24 bg-cg-sand">
                <div className="max-w-3xl mx-auto px-6">
                    <h2
                        className="text-3xl text-foreground mb-10 text-center"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                        Common questions
                    </h2>

                    <Accordion type="single" collapsible className="w-full space-y-4">
                        <AccordionItem value="age" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-foreground hover:no-underline py-6">
                                What age range is KidSpace for?
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                                KidSpace is designed for children ages 3–12. Stories and games are visual and simple for younger kids, while older kids enjoy more interactive games, shows, texting, and their own calendar.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="safety" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-foreground hover:no-underline py-6">
                                How does ARIA keep video calls safe?
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                                ARIA monitors calls and messages in real time for unwanted or unsafe behavior. You can drop in or end any call instantly, flag or block a contact in one tap, and every interaction is recorded and timestamped. You approve every contact, and KidSpace is fully COPPA compliant.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="both" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-foreground hover:no-underline py-6">
                                Do both parents need an account?
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                                For the full experience, yes. But one parent can still use KidSpace solo with their child for stories, movies, games, and calls.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="family" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-foreground hover:no-underline py-6">
                                Can grandparents or extended family use it?
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 leading-relaxed">
                                Absolutely. Parents add approved contacts through My Circle. Grandparents, aunts, uncles — anyone you approve can enjoy story time, movie nights, games, and calls with your child.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="cost" className="bg-white rounded-2xl px-6 border-none shadow-sm data-[state=open]:pb-4">
                            <AccordionTrigger className="text-lg font-medium text-foreground hover:no-underline py-6">
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
                        className="text-3xl md:text-4xl text-foreground mb-6"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                        Your child doesn&apos;t need to feel the distance
                    </h2>
                    <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto">
                        KidSpace turns tough transitions into bonding moments — fun for the kids, safe for you. Start your free trial and see what a calmer, closer week looks like.
                    </p>
                    <Link
                        href="/early-access"
                        className="inline-flex items-center justify-center px-10 py-5 bg-cg-sage text-white font-bold text-lg rounded-full hover:bg-[#2D8A6A] transition-all shadow-xl hover:-translate-y-1 group"
                    >
                        Start free trial
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
