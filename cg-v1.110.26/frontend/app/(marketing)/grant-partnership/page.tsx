import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Check, Star, BarChart3, Users, Shield, TrendingUp, Handshake, FileText, Calendar, DollarSign, BrainCircuit } from "lucide-react";

export const metadata = {
    title: "Grant Partnership Program | CommonGround",
    description: "Empower the families you serve with AI-powered co-parenting tools—at zero cost to your organization.",
};

export default function GrantPartnershipPage() {
    return (
        <div className="font-sans text-[#1E3A4A] bg-[#F4F8F7]">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-24 pb-32 lg:pt-32 lg:pb-40">
                {/* Background Blobs - matching Pricing page */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--portal-primary)] rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl"></div>
                </div>

                <div className="container relative mx-auto px-4 text-center z-10">
                    <h1 className="mx-auto mb-6 max-w-4xl font-serif text-5xl font-bold leading-tight md:text-6xl animate-in fade-in slide-in-from-bottom-4 duration-700 text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                        Grant Partnership Program
                    </h1>
                    <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-600 md:text-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 leading-relaxed">
                        Extend your impact beyond your walls. Empower the families you serve with AI-powered co-parenting tools—at zero cost to your organization.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        <Link
                            href="#apply"
                            className="px-8 py-4 bg-[var(--portal-primary)] text-white rounded-full font-medium text-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Become a Partner
                        </Link>
                        <Link
                            href="#how-it-works"
                            className="px-8 py-4 bg-white text-[var(--portal-primary)] border-2 border-[var(--portal-primary)] rounded-full font-medium text-lg hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Learn More
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <div className="relative z-20 -mt-20 px-4">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 gap-8 rounded-2xl bg-white p-8 shadow-xl md:grid-cols-2 lg:grid-cols-4 border border-gray-100">
                        <div className="text-center">
                            <div className="mb-2 font-serif text-4xl font-bold text-[var(--portal-primary)]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>$5,249</div>
                            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Value Per Partner (25 codes)</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-2 font-serif text-4xl font-bold text-[var(--portal-primary)]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>68%</div>
                            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Conflict Reduction</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-2 font-serif text-4xl font-bold text-[var(--portal-primary)]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>24/7</div>
                            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">AI Mediation Support</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-2 font-serif text-4xl font-bold text-[var(--portal-primary)]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Zero</div>
                            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Cost to Your Organization</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Value Proposition Section */}
            <section className="py-24">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Why Partner with CommonGround?</h2>
                        <p className="mx-auto max-w-2xl text-lg text-gray-600">
                            We help nonprofits create lasting impact for families navigating divorce and co-parenting challenges.
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                icon: Star,
                                title: "Ongoing Support",
                                desc: "Your clients receive 24/7 AI-powered support long after they complete your program, ensuring lasting impact.",
                            },
                            {
                                icon: BarChart3,
                                title: "Automated Outcomes",
                                desc: "Access real-time, anonymized metrics that prove your impact. Generate grant-ready reports with one click.",
                            },
                            {
                                icon: Handshake,
                                title: "Co-Branded Experience",
                                desc: "Your clients access CommonGround through a custom landing page featuring your logo, colors, and mission.",
                            },
                            {
                                icon: Users,
                                title: "Legal Network Connection",
                                desc: "Connect your clients to vetted family law attorneys in our network, adding value to your services.",
                            },
                            {
                                icon: TrendingUp,
                                title: "Scalable Impact",
                                desc: "Serve 10x more families without adding staff. Our AI handles the ongoing mediation and support work.",
                            },
                            {
                                icon: Shield,
                                title: "Privacy Protected",
                                desc: "All client data is anonymized before partners see it. We handle HIPAA-level security so you can focus on outcomes.",
                            },
                        ].map((item, i) => (
                            <div key={i} className="group bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[#F5A623]/20 text-[var(--portal-primary)] group-hover:from-[var(--portal-primary)] group-hover:to-[#F5A623] group-hover:text-white transition-all duration-300">
                                    <item.icon className="h-7 w-7" />
                                </div>
                                <h3 className="mb-3 font-serif text-2xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>{item.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Partnership Model Section */}
            <section className="bg-white py-24">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>How the Partnership Works</h2>
                        <p className="mx-auto max-w-2xl text-lg text-gray-600">
                            A true partnership where we both contribute to family success.
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Your Organization Provides */}
                        <div className="rounded-2xl bg-[#F4F8F7] p-8 md:p-10 border border-gray-100 shadow-sm">
                            <h3 className="mb-6 border-b-2 border-[var(--portal-primary)]/20 pb-4 font-serif text-3xl font-bold text-[var(--portal-primary)]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Your Organization Provides</h3>
                            <ul className="space-y-4">
                                {[
                                    "Distribute grant codes to eligible families",
                                    "Conduct 15-minute orientation session",
                                    "Include CommonGround in program materials",
                                    "Share anonymized success stories (optional)",
                                    "Provide feedback for continuous improvement",
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--portal-primary)]/10 text-[var(--portal-primary)]">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <span className="text-lg text-gray-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* CommonGround Provides */}
                        <div className="rounded-2xl bg-white p-8 md:p-10 border border-gray-200 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--portal-primary)]/5 rounded-bl-full pointer-events-none"></div>
                            <h3 className="mb-6 border-b-2 border-[var(--portal-primary)]/20 pb-4 font-serif text-3xl font-bold text-[var(--portal-primary)]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>CommonGround Provides</h3>
                            <ul className="space-y-4">
                                {[
                                    "Free Complete tier for 180 days ($210 value per family)",
                                    "Co-branded landing page with your logo and mission",
                                    "Real-time outcomes dashboard",
                                    "Grant-ready impact reports",
                                    "Marketing and training support",
                                    "Priority customer support for your clients",
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--portal-primary)] text-white">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <span className="text-lg text-gray-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Grant Value Box */}
                    <div className="mt-12 overflow-hidden rounded-2xl bg-gradient-to-br from-[#F5A623] to-[#c99943] text-white shadow-xl relative">
                        <div className="absolute inset-0 bg-[url('/assets/grain.png')] opacity-20 hover:opacity-10 transition-opacity"></div>
                        <div className="p-8 text-center md:p-12 relative z-10">
                            <h3 className="mb-2 font-serif text-3xl font-bold text-white/90" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Total Partnership Value</h3>
                            <div className="my-6 font-serif text-6xl md:text-7xl font-bold text-white drop-shadow-sm" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>$5,249</div>
                            <div className="mx-auto max-w-3xl bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
                                <p className="text-lg text-white font-medium">
                                    Complete tier ($34.99/month × 6 months) × 25 families = <span className="font-bold underline md:no-underline">$5,248.50</span> in professional tools provided free.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Showcase */}
            <section className="py-24 bg-[#F4F8F7]">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Complete Tier Features</h2>
                        <p className="mx-auto max-w-2xl text-lg text-gray-600">
                            Your clients receive our most comprehensive plan with all premium features included.
                        </p>
                    </div>

                    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                icon: BrainCircuit,
                                title: "ARIA AI Mediation",
                                desc: "Real-time message analysis helps keep 80% of conversations constructive",
                            },
                            {
                                icon: Users,
                                title: "Organized Communication",
                                desc: "Secure messaging platform with threaded conversations and search",
                            },
                            {
                                icon: Calendar,
                                title: "Custody Calendar",
                                desc: "Shared schedules, exchange coordination, and GPS handoff verification",
                            },
                            {
                                icon: DollarSign,
                                title: "ClearFund Expenses",
                                desc: "Track child-related expenses with receipts, splits, and zero-fee payments",
                            },
                            {
                                icon: FileText,
                                title: "Quick Accords",
                                desc: "Digital agreement builder for parenting plans and modifications",
                            },
                            {
                                icon: Shield,
                                title: "Court-Ready Records",
                                desc: "SHA-256 hashed, timestamped documentation accepted in all 50 states",
                            },
                            {
                                icon: Users,
                                title: "KidsComs Protection",
                                desc: "Age-appropriate messaging that keeps children out of adult conflict",
                            },
                            {
                                icon: BarChart3,
                                title: "Custody Analytics",
                                desc: "Track time-sharing, response rates, and conflict trends over time",
                            },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-white/50 transition-colors">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-[var(--portal-primary)] border border-gray-100">
                                    <item.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="mb-2 font-serif text-xl font-bold text-[var(--portal-primary)]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>{item.title}</h4>
                                    <p className="text-sm leading-relaxed text-gray-600">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Outcomes Section */}
            <section className="bg-[var(--portal-primary)] text-white py-24 relative overflow-hidden">
                {/* Background blobs for visual interest */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50"></div>

                <div className="container relative mx-auto px-4 z-10">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-white" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Measurable Impact for Grant Reports</h2>
                        <p className="mx-auto max-w-2xl text-lg text-white/80">
                            Prove your program's effectiveness with concrete, trackable outcomes.
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            { title: "Activation Rate", desc: "Track how many families activated their grant codes and began using the platform—demonstrating engagement." },
                            { title: "Communication Improvement", desc: "Measure the percentage increase in constructive communication over time, showing tangible behavioral change." },
                            { title: "Sustained Engagement", desc: "Monitor 30-day and 90-day retention rates to prove families continue benefiting long after your program ends." },
                            { title: "Legal Fee Savings", desc: "Calculate estimated legal costs prevented through improved communication and better documentation." },
                            { title: "Feature Utilization", desc: "See how families use schedules, expense tracking, and agreements—proving comprehensive support." },
                            { title: "Client Satisfaction", desc: "Access Net Promoter Scores and anonymized testimonials demonstrating service quality." },
                        ].map((item, i) => (
                            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:bg-white/10 hover:-translate-y-1">
                                <h4 className="mb-3 font-serif text-2xl font-bold text-[#F5A623]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>{item.title}</h4>
                                <p className="leading-relaxed text-blue-50/90">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Process Section */}
            <section id="how-it-works" className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Partnership Process</h2>
                        <p className="mx-auto max-w-2xl text-lg text-gray-600">
                            From application to active partnership in 3-4 weeks.
                        </p>
                    </div>

                    <div className="relative grid gap-8 md:grid-cols-5">
                        {/* Connecting Line (Desktop) */}
                        <div className="absolute left-0 top-10 hidden h-0.5 w-full bg-gray-100 md:block" />

                        {[
                            { num: "1", title: "Apply", desc: "Complete our partnership application with information about your organization." },
                            { num: "2", title: "Discovery Call", desc: "30-minute conversation to ensure program fit and answer any questions." },
                            { num: "3", title: "Setup", desc: "We create your co-branded landing page and generate grant codes." },
                            { num: "4", title: "Training", desc: "45-minute staff training session plus materials for orienting your clients." },
                            { num: "5", title: "Launch", desc: "Begin distributing codes. Access your dashboard to track real-time engagement." },
                        ].map((item, i) => (
                            <div key={i} className="relative z-10 text-center bg-white md:bg-transparent md:p-0 p-6 rounded-xl border md:border-0 border-gray-100 shadow-sm md:shadow-none">
                                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--portal-primary)] to-[#2C5F5D] text-3xl font-bold text-white shadow-xl shadow-[var(--portal-primary)]/20 font-serif" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                                    {item.num}
                                </div>
                                <h4 className="mb-3 font-serif text-xl font-bold text-[var(--portal-primary)]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>{item.title}</h4>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section id="apply" className="py-24 text-center bg-gradient-to-br from-[var(--portal-primary)] to-[#234846] text-white relative overflow-hidden">
                {/* Abstract shapes matching pricing page */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <h2 className="mb-6 font-serif text-4xl font-bold md:text-5xl text-white" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Ready to Amplify Your Impact?</h2>
                    <p className="mx-auto mb-10 max-w-3xl text-xl text-white/80 leading-relaxed">
                        Join nonprofits across Southern California who are transforming how they support families through divorce and co-parenting challenges.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link
                            href="mailto:partnerships@find-commonground.com?subject=Grant Partnership Application"
                            className="px-8 py-4 bg-white text-[var(--portal-primary)] rounded-full font-medium text-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Apply for Partnership
                        </Link>
                        <Link
                            href="mailto:partnerships@find-commonground.com?subject=Grant Partnership Questions"
                            className="px-8 py-4 bg-transparent border-2 border-white/30 hover:bg-white/10 text-white rounded-full font-medium text-lg transition-all duration-200"
                        >
                            Schedule Discovery Call
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
