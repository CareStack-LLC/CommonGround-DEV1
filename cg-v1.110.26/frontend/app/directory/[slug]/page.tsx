"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { familyFilesAPI, FirmPublicProfile, getImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    MapPin,
    Globe,
    Mail,
    Phone,
    ShieldCheck,
    Video,
    Award,
    BookOpen,
    Clock,
    DollarSign,
    CreditCard,
    CheckCircle2,
    ArrowLeft
} from "lucide-react";
import Image from "next/image";

// Helper to safely format pricing values from the JSON structure
const formatPrice = (value: any): string => {
    if (value === null || value === undefined) return 'Contact Firm';
    if (typeof value === 'boolean') return value ? 'Available' : 'No';
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === 'yes') return 'Available';
        if (lower === 'false' || lower === 'no') return 'No';
        if (value.startsWith('$')) return value;
        if (!isNaN(Number(value))) return `$${value}`;
        return value;
    }
    if (typeof value === 'number') return `$${value}`;
    if (typeof value === 'object') {
        if (Array.isArray(value)) return value.join(', ');

        // Handle common object structures like { min: 100, max: 200 }
        if (value.min && value.max) return `$${value.min} - $${value.max}`;
        if (value.min) return `From $${value.min}`;
        if (value.max) return `Up to $${value.max}`;

        // Generic fallback for objects
        return Object.entries(value)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
    }
    return String(value);
};

export default function ProfessionalProfilePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const slug = params.slug as string;
    const familyFileId = searchParams?.get('familyFileId');

    const [firm, setFirm] = useState<FirmPublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        async function fetchFirm() {
            try {
                setLoading(true);
                const data = await familyFilesAPI.getFirmProfile(slug);
                setFirm(data);
            } catch (err) {
                console.error("Failed to fetch firm profile:", err);
                setError("Failed to load profile. It may not exist or has been removed.");
            } finally {
                setLoading(false);
            }
        }

        if (slug) {
            fetchFirm();
        }
    }, [slug]);

    const handleInviteKey = async () => {
        if (!familyFileId || !firm) return;
        try {
            setInviting(true);
            await familyFilesAPI.inviteProfessional(familyFileId, {
                firm_id: firm.id,
            });
            // Redirect back to directory with success flag
            router.push(`/find-professionals?familyFileId=${familyFileId}&invited=true`);
        } catch (error) {
            console.error("Failed to invite:", error);
            alert("Failed to send invitation. Please try again.");
        } finally {
            setInviting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !firm) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Profile Not Found</h2>
                <p className="text-gray-500 mb-6">{error || "The requested profile could not be found."}</p>
                <Button onClick={() => router.push('/find-professionals')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Hero Section */}
            <div className="relative h-72 md:h-80 w-full overflow-hidden bg-gradient-to-br from-[#4A6C58] via-[#4A6C58]/95 to-[#1a4746]">
                {firm.video_url && (
                    <div className="absolute inset-0">
                        {/* Use actual HTML5 video for autoplay background */}
                        <video
                            src={firm.video_url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-black/40 z-10" />
                    </div>
                )}

                {/* Back Button */}
                <div className="absolute top-6 left-6 z-30">
                    <Button
                        variant="ghost"
                        className="text-white hover:bg-white/20 rounded-full"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                </div>

                <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-12 container mx-auto">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
                        <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-white p-3 shadow-2xl shrink-0 overflow-hidden border-2 border-slate-100">
                            {firm.logo_url ? (
                                <Image
                                    src={firm.logo_url}
                                    alt={firm.name}
                                    fill
                                    className="object-contain p-3"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-4xl font-bold text-slate-300">
                                    {firm.name.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-white pb-2">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>{firm.name}</h1>
                                {firm.safety_vetted && (
                                    <Badge className="bg-emerald-500 text-white border-0">
                                        <ShieldCheck className="w-3 h-3 mr-1" /> Vetted
                                    </Badge>
                                )}
                            </div>

                            {firm.headline && (
                                <p className="text-xl text-gray-200 font-medium mb-4 max-w-2xl">
                                    {firm.headline}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" />
                                    {firm.city}, {firm.state}
                                </div>
                                {firm.firm_type && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 uppercase text-xs tracking-wider">
                                        {firm.firm_type.replace('_', ' ')}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="hidden md:flex gap-3 pb-2">
                            {familyFileId ? (
                                <Button
                                    size="lg"
                                    className="bg-[#4A6C58] hover:bg-[#3A5646] text-white border-2 border-white/20 shadow-xl rounded-full font-bold px-8"
                                    onClick={handleInviteKey}
                                    disabled={inviting}
                                >
                                    {inviting ? "Sending Invite..." : "Invite to Case"}
                                </Button>
                            ) : (
                                <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-full font-bold px-8 shadow-xl">
                                    Contact Firm
                                </Button>
                            )}
                            {firm.website && (
                                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm rounded-full font-bold px-6" asChild>
                                    <a href={firm.website} target="_blank" rel="noopener noreferrer">
                                        <Globe className="w-4 h-4 mr-2" /> Website
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 md:flex gap-8">
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                            <TabsTrigger
                                value="overview"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-3 font-medium bg-transparent"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="team"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-3 font-medium bg-transparent"
                            >
                                Our Team <Badge variant="secondary" className="ml-2 h-5 px-1.5 min-w-[1.25rem]">{firm.professionals?.length || 0}</Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="services"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-3 font-medium bg-transparent"
                            >
                                Programs & Services
                            </TabsTrigger>
                        </TabsList>

                        {/* OVERVIEW TAB */}
                        <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-300">
                            <Card className="bg-white rounded-3xl border-2 border-slate-100 shadow-md">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-2xl text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>About Us</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                                        {firm.description ? (
                                            <p className="whitespace-pre-line leading-relaxed">{firm.description}</p>
                                        ) : (
                                            <p className="italic text-gray-400">No description available.</p>
                                        )}
                                    </div>

                                    {firm.practice_areas && firm.practice_areas.length > 0 && (
                                        <div className="pt-4 border-t">
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-primary" /> Practice Areas
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {firm.practice_areas.map((area) => (
                                                    <Badge key={area} variant="secondary" className="px-3 py-1 font-normal text-sm">
                                                        {area}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {firm.social_links && Object.keys(firm.social_links).length > 0 && (
                                        <div className="pt-4 border-t">
                                            <h4 className="font-semibold mb-3">Connect</h4>
                                            <div className="flex gap-4">
                                                {Object.entries(firm.social_links).map(([platform, url]) => (
                                                    <a
                                                        key={platform}
                                                        href={typeof url === 'string' ? url : '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-500 hover:text-primary transition-colors capitalize text-sm flex items-center gap-1"
                                                    >
                                                        <Globe className="w-4 h-4" /> {platform}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TEAM TAB */}
                        <TabsContent value="team" className="space-y-6 animate-in fade-in-50 duration-300">
                            <div className="grid grid-cols-1 gap-6">
                                {firm.professionals && firm.professionals.length > 0 ? (
                                    firm.professionals.map((pro) => (
                                        <Card key={pro.id} className="overflow-hidden bg-white rounded-3xl border-2 border-slate-100 shadow-md group">
                                            <div className="flex flex-col sm:flex-row">
                                                <div className="w-full sm:w-56 bg-slate-50 flex flex-col items-center justify-center p-8 border-b sm:border-b-0 sm:border-r border-slate-100">
                                                    <Avatar className="w-28 h-28 mb-4 border-4 border-white shadow-md">
                                                        {pro.headshot_url ? (
                                                            <AvatarImage src={getImageUrl(pro.headshot_url) || undefined} />
                                                        ) : null}
                                                        <AvatarFallback className="bg-[#E8F0EC] text-[#4A6C58] text-3xl font-bold font-serif">
                                                            {pro.user_first_name?.charAt(0)}{pro.user_last_name?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {pro.license_verified && (
                                                        <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-200 text-[10px] gap-1 px-2">
                                                            <CheckCircle2 className="w-3 h-3" /> Licensed
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex-1 p-8">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h3 className="font-bold text-2xl text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                                                                {pro.user_first_name} {pro.user_last_name}
                                                            </h3>
                                                            <p className="text-sm text-[#4A6C58] font-bold tracking-wide uppercase mt-1">{pro.headline || pro.professional_type.replace('_', ' ')}</p>
                                                        </div>
                                                        {pro.hourly_rate && (
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{pro.hourly_rate}</div>
                                                                <div className="text-xs text-gray-500">per hour</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                                                        {pro.bio || "No biography available."}
                                                    </p>

                                                    <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-gray-500">
                                                        {pro.years_experience && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-4 h-4 text-gray-400" />
                                                                {pro.years_experience} Years Exp.
                                                            </div>
                                                        )}
                                                        {pro.languages && pro.languages.length > 0 && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Globe className="w-4 h-4 text-gray-400" />
                                                                {pro.languages.join(", ")}
                                                            </div>
                                                        )}
                                                        {pro.awards && pro.awards.length > 0 && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Award className="w-4 h-4 text-amber-500" />
                                                                {pro.awards.length} Awards
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                                        <p className="text-gray-500">No professionals listed publicly.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* PROGRAMS & SERVICES TAB */}
                        <TabsContent value="services" className="space-y-6 animate-in fade-in-50 duration-300">
                            <Card className="bg-white rounded-3xl border-2 border-slate-100 shadow-md">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-2xl text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Programs & Financials</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex flex-col gap-2">
                                            <span className="font-bold text-slate-700">Payment Plans</span>
                                            <span className="text-slate-600 font-medium">
                                                {firm.payment_plans_available ? "Available upon request" : "Please inquire"}
                                            </span>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex flex-col gap-2">
                                            <span className="font-bold text-slate-700">Nonprofit Collaborations</span>
                                            <span className="text-slate-600 font-medium">
                                                {firm.works_with_nonprofits ? "Active programs available" : "Not specified"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-2">
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-primary" /> Supported Payment Methods
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {firm.accepted_payment_methods && firm.accepted_payment_methods.length > 0 ? (
                                                firm.accepted_payment_methods.map(method => (
                                                    <Badge key={method} variant="outline" className="text-gray-600">{method}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-slate-500 italic text-sm">Contact firm for options</span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="w-full md:w-80 space-y-6 mt-8 md:mt-0 shrink-0">
                    <Card className="bg-white rounded-3xl border-2 border-slate-100 shadow-md">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {firm.phone && (
                                <div className="flex items-start gap-3">
                                    <Phone className="w-4 h-4 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Phone</p>
                                        <a href={`tel:${firm.phone}`} className="text-sm font-medium hover:text-primary">{firm.phone}</a>
                                    </div>
                                </div>
                            )}

                            {firm.email && (
                                <div className="flex items-start gap-3">
                                    <Mail className="w-4 h-4 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</p>
                                        <a href={`mailto:${firm.email}`} className="text-sm font-medium hover:text-primary truncate block w-full">{firm.email}</a>
                                    </div>
                                </div>
                            )}

                            {firm.website && (
                                <div className="flex items-start gap-3">
                                    <Globe className="w-4 h-4 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Website</p>
                                        <a href={firm.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary break-all">{firm.website.replace(/^https?:\/\//, '')}</a>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 mt-2 border-t border-slate-100">
                                {familyFileId ? (
                                    <Button
                                        className="w-full bg-[#4A6C58] hover:bg-[#3A5646] text-white rounded-full font-bold h-12 shadow-md"
                                        onClick={handleInviteKey}
                                        disabled={inviting}
                                    >
                                        {inviting ? "Sending..." : "Invite to Case"}
                                    </Button>
                                ) : (
                                    <Button className="w-full rounded-full font-bold h-12 shadow-md border-2 border-[#4A6C58] text-[#4A6C58] bg-transparent hover:bg-[#E8F0EC]">
                                        Send Message
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#E8F0EC]/50 border-2 border-[#E8F0EC] rounded-3xl shadow-sm">
                        <CardContent className="p-5 flex items-start gap-4">
                            <ShieldCheck className="w-6 h-6 text-[#4A6C58] shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <h4 className="font-bold text-[#2D3A35] mb-1">Data Protection</h4>
                                <p className="text-[#4A6C58] font-medium text-xs leading-relaxed">
                                    This firm is bound by confidentiality agreements. Communications via CommonGround are encrypted.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Mobile Bottom Action Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-2xl z-40">
                {familyFileId ? (
                    <Button
                        className="w-full bg-[#4A6C58] hover:bg-[#3A5646] text-white rounded-full font-bold h-12 shadow-lg"
                        onClick={handleInviteKey}
                        disabled={inviting}
                    >
                        {inviting ? "Sending..." : "Invite to Case"}
                    </Button>
                ) : (
                    <Button className="w-full rounded-full font-bold h-12 shadow-lg bg-[#4A6C58] hover:bg-[#3A5646] text-white">
                        Contact Firm
                    </Button>
                )}
            </div>
        </div>
    );
}
