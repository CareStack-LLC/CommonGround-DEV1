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
        <div className="font-sans text-foreground">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-primary py-24 text-primary-foreground lg:py-32">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-50"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-black/10 to-transparent opacity-30"></div>
                <div className="container relative mx-auto px-4 text-center">
                    <h1 className="mx-auto mb-6 max-w-4xl font-serif text-5xl font-bold leading-tight md:text-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                        Grant Partnership Program
                    </h1>
                    <p className="mx-auto mb-10 max-w-2xl text-xl font-light text-primary-foreground/90 md:text-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                        Extend your impact beyond your walls. Empower the families you serve with AI-powered co-parenting tools—at zero cost to your organization.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        <Button size="lg" variant="secondary" className="h-14 font-semibold px-8 text-lg shadow-lg hover:shadow-xl transition-all" asChild>
                            <Link href="#apply">Become a Partner</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground transition-all" asChild>
                            <Link href="#how-it-works">Learn More</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <div className="relative z-10 -mt-12 px-4">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 gap-6 rounded-2xl bg-card p-8 shadow-xl md:grid-cols-2 lg:grid-cols-4 border border-border/50">
                        <div className="text-center">
                            <div className="mb-2 font-serif text-4xl font-bold text-primary">$5,249</div>
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Value Per Partner (25 codes)</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-2 font-serif text-4xl font-bold text-primary">68%</div>
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Conflict Reduction</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-2 font-serif text-4xl font-bold text-primary">24/7</div>
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">AI Mediation Support</div>
                        </div>
                        <div className="text-center">
                            <div className="mb-2 font-serif text-4xl font-bold text-primary">Zero</div>
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Cost to Your Organization</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Value Proposition Section */}
            <section className="py-24">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-foreground">Why Partner with CommonGround?</h2>
                        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
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
                            <Card key={i} className="group border-t-4 border-t-accent transition-all hover:-translate-y-1 hover:shadow-lg">
                                <CardContent className="pt-6">
                                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/20 text-primary group-hover:from-primary group-hover:to-accent group-hover:text-primary-foreground transition-all duration-300">
                                        <item.icon className="h-7 w-7" />
                                    </div>
                                    <h3 className="mb-3 font-serif text-2xl font-bold text-foreground">{item.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Partnership Model Section */}
            <section className="bg-muted/30 py-24">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-foreground">How the Partnership Works</h2>
                        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                            A true partnership where we both contribute to family success.
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Your Organization Provides */}
                        <Card className="border-0 shadow-md">
                            <CardContent className="p-8 md:p-10">
                                <h3 className="mb-6 border-b-2 border-primary/20 pb-4 font-serif text-3xl font-bold text-primary">Your Organization Provides</h3>
                                <ul className="space-y-4">
                                    {[
                                        "Distribute grant codes to eligible families",
                                        "Conduct 15-minute orientation session",
                                        "Include CommonGround in program materials",
                                        "Share anonymized success stories (optional)",
                                        "Provide feedback for continuous improvement",
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <Check className="h-4 w-4" />
                                            </div>
                                            <span className="text-lg text-foreground/80">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* CommonGround Provides */}
                        <Card className="border-0 shadow-md bg-white">
                            <CardContent className="p-8 md:p-10">
                                <h3 className="mb-6 border-b-2 border-primary/20 pb-4 font-serif text-3xl font-bold text-primary">CommonGround Provides</h3>
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
                                            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                <Check className="h-4 w-4" />
                                            </div>
                                            <span className="text-lg text-foreground/80">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Grant Value Box */}
                    <div className="mt-12 overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-[#c99943] text-accent-foreground shadow-lg">
                        <div className="p-8 text-center md:p-12">
                            <h3 className="mb-2 font-serif text-2xl font-bold text-primary-foreground/90">Total Partnership Value</h3>
                            <div className="my-4 font-serif text-5xl font-bold text-white md:text-6xl">$5,249</div>
                            <p className="mx-auto max-w-2xl text-lg text-primary-foreground/90 font-medium">
                                Complete tier ($34.99/month × 6 months) × 25 families = $5,248.50 in professional co-parenting tools provided free to your clients
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Showcase */}
            <section className="py-24">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-foreground">Complete Tier Features</h2>
                        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                            Your clients receive our most comprehensive plan with all premium features included.
                        </p>
                    </div>

                    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                icon: BrainCircuit,
                                title: "ARIA AI Mediation",
                                desc: "Real-time message analysis prevents 80% of hostile exchanges before they're sent",
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
                            <div key={i} className="flex gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                                    <item.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="mb-2 font-serif text-xl font-bold text-primary">{item.title}</h4>
                                    <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Outcomes Section */}
            <section className="bg-primary text-primary-foreground py-24">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-white">Measurable Impact for Grant Reports</h2>
                        <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80">
                            Prove your program's effectiveness with concrete, trackable outcomes.
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            { title: "Activation Rate", desc: "Track how many families activated their grant codes and began using the platform—demonstrating engagement." },
                            { title: "Conflict Reduction", desc: "Measure the percentage decrease in hostile communication over time, showing tangible behavioral change." },
                            { title: "Sustained Engagement", desc: "Monitor 30-day and 90-day retention rates to prove families continue benefiting long after your program ends." },
                            { title: "Legal Fee Savings", desc: "Calculate estimated legal costs prevented through reduced conflict and better documentation." },
                            { title: "Feature Utilization", desc: "See how families use schedules, expense tracking, and agreements—proving comprehensive support." },
                            { title: "Client Satisfaction", desc: "Access Net Promoter Scores and anonymized testimonials demonstrating service quality." },
                        ].map((item, i) => (
                            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-colors hover:bg-white/10">
                                <h4 className="mb-3 font-serif text-2xl font-bold text-accent">{item.title}</h4>
                                <p className="leading-relaxed text-primary-foreground/90">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Process Section */}
            <section id="how-it-works" className="py-24">
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 font-serif text-4xl font-bold text-foreground">Partnership Process</h2>
                        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                            From application to active partnership in 3-4 weeks.
                        </p>
                    </div>

                    <div className="relative grid gap-8 md:grid-cols-5">
                        {/* Connecting Line (Desktop) */}
                        <div className="absolute left-0 top-10 hidden h-0.5 w-full bg-border md:block" />

                        {[
                            { num: "1", title: "Apply", desc: "Complete our partnership application with information about your organization." },
                            { num: "2", title: "Discovery Call", desc: "30-minute conversation to ensure program fit and answer any questions." },
                            { num: "3", title: "Setup", desc: "We create your co-branded landing page and generate grant codes." },
                            { num: "4", title: "Training", desc: "45-minute staff training session plus materials for orienting your clients." },
                            { num: "5", title: "Launch", desc: "Begin distributing codes. Access your dashboard to track real-time engagement." },
                        ].map((item, i) => (
                            <div key={i} className="relative z-10 text-center bg-background md:bg-transparent md:p-0 p-6 rounded-xl border md:border-0 border-border">
                                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-bold text-primary-foreground shadow-lg shadow-primary/20 font-serif">
                                    {item.num}
                                </div>
                                <h4 className="mb-3 font-serif text-xl font-bold text-primary">{item.title}</h4>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section id="apply" className="bg-foreground text-background py-24 text-center">
                <div className="container mx-auto px-4">
                    <h2 className="mb-6 font-serif text-4xl font-bold md:text-5xl text-background">Ready to Amplify Your Impact?</h2>
                    <p className="mx-auto mb-10 max-w-3xl text-xl text-background/80 font-light">
                        Join nonprofits across Southern California who are transforming how they support families through divorce and co-parenting challenges.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Button size="lg" className="h-14 bg-background text-foreground hover:bg-background/90 font-semibold px-8 text-lg" asChild>
                            <a href="mailto:partnerships@commonground.app?subject=Grant Partnership Application">Apply for Partnership</a>
                        </Button>
                        <Button size="lg" variant="outline" className="h-14 border-background text-background hover:bg-background hover:text-foreground px-8 text-lg bg-transparent" asChild>
                            <a href="mailto:partnerships@commonground.app?subject=Grant Partnership Questions">Schedule Discovery Call</a>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
