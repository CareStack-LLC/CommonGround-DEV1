"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search,
    MapPin,
    Star,
    Shield,
    CheckCircle2,
    Filter,
    Users,
    Briefcase,
    Globe,
    DollarSign,
    Award,
    LayoutGrid,
    List as ListIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DirectoryProfile {
    id: string;
    professional_type: string;
    headline: string | null;
    bio: string | null;
    license_state: string | null;
    license_verified: boolean;
    practice_areas: string[] | null;
    languages: string[] | null;
    hourly_rate: string | null;
    years_experience: number | null;
    consultation_fee: string | null;
    is_featured: boolean;
    office_address: string | null;
    jurisdictions: string[] | null;
}

const PROFESSIONAL_TYPE_INFO: Record<string, { label: string; color: string }> = {
    attorney: { label: "Attorney", color: "bg-emerald-100 text-emerald-700" },
    paralegal: { label: "Paralegal", color: "bg-blue-100 text-blue-700" },
    mediator: { label: "Mediator", color: "bg-purple-100 text-purple-700" },
    parenting_coordinator: { label: "Parenting Coordinator", color: "bg-amber-100 text-amber-700" },
    intake_coordinator: { label: "Intake Coordinator", color: "bg-cyan-100 text-cyan-700" },
    practice_admin: { label: "Practice Admin", color: "bg-slate-100 text-slate-700" },
};

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
    "VA", "WA", "WV", "WI", "WY",
];

export default function ProfessionalDirectoryPage() {
    const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [stateFilter, setStateFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [featuredOnly, setFeaturedOnly] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const fetchProfiles = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set("query", searchQuery);
            if (stateFilter) params.set("state", stateFilter);
            if (typeFilter) params.set("professional_type", typeFilter);
            if (featuredOnly) params.set("featured_only", "true");
            params.set("limit", "50");

            const res = await fetch(`${API_BASE}/api/v1/professional/directory/professionals?${params}`, {});
            if (res.ok) {
                const data = await res.json();
                setProfiles(data.items || []);
            }
        } catch (err) {
            console.error("Error fetching directory:", err);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, stateFilter, typeFilter, featuredOnly]);

    useEffect(() => {
        const timer = setTimeout(fetchProfiles, 300);
        return () => clearTimeout(timer);
    }, [fetchProfiles]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-xl shadow-lg shadow-teal-500/20">
                        <Users className="h-6 w-6" />
                    </div>
                    Professional Directory
                </h1>
                <p className="text-slate-500 mt-1">
                    Find verified family law professionals for your case
                </p>
            </div>

            {/* Search Bar */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, headline, or specialty..."
                        className="pl-10 h-11"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    className={`border-slate-200 ${showFilters ? "bg-slate-100" : ""}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters {showFilters ? "▴" : "▾"}
                </Button>
                <div className="hidden sm:flex border rounded-lg overflow-hidden">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-none px-3 ${viewMode === "grid" ? "bg-slate-100" : ""}`}
                        onClick={() => setViewMode("grid")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-none px-3 ${viewMode === "list" ? "bg-slate-100" : ""}`}
                        onClick={() => setViewMode("list")}
                    >
                        <ListIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <Card className="bg-slate-50/50">
                    <CardContent className="pt-4 pb-4">
                        <div className="grid sm:grid-cols-4 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1.5">License State</label>
                                <Select value={stateFilter} onValueChange={setStateFilter}>
                                    <SelectTrigger className="bg-white"><SelectValue placeholder="All states" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All States</SelectItem>
                                        {US_STATES.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1.5">Professional Type</label>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="bg-white"><SelectValue placeholder="All types" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {Object.entries(PROFESSIONAL_TYPE_INFO).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    variant={featuredOnly ? "default" : "outline"}
                                    size="sm"
                                    className={featuredOnly ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                                    onClick={() => setFeaturedOnly(!featuredOnly)}
                                >
                                    <Star className="h-3.5 w-3.5 mr-1.5" />
                                    Featured Only
                                </Button>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setStateFilter("");
                                        setTypeFilter("");
                                        setFeaturedOnly(false);
                                        setSearchQuery("");
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                </div>
            ) : profiles.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No professionals found</h3>
                        <p className="text-muted-foreground">
                            Try adjusting your search criteria or removing some filters.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <p className="text-sm text-muted-foreground">
                        {profiles.length} professional{profiles.length !== 1 ? "s" : ""} found
                    </p>

                    {viewMode === "grid" ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {profiles.map((p) => (
                                <ProfileCard key={p.id} profile={p} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {profiles.map((p) => (
                                <ProfileListItem key={p.id} profile={p} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ---- Profile Card (Grid View) ----
function ProfileCard({ profile }: { profile: DirectoryProfile }) {
    const typeInfo = PROFESSIONAL_TYPE_INFO[profile.professional_type] || {
        label: profile.professional_type,
        color: "bg-slate-100 text-slate-700",
    };

    return (
        <Card className={`group hover:shadow-lg transition-all ${profile.is_featured ? "ring-2 ring-amber-300 bg-gradient-to-br from-amber-50/30 to-white" : ""}`}>
            <CardContent className="pt-5">
                {/* Featured Badge */}
                {profile.is_featured && (
                    <div className="flex items-center gap-1.5 mb-3">
                        <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 text-[10px] font-semibold shadow-sm">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Featured Professional
                        </Badge>
                    </div>
                )}

                {/* Profile Header */}
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500">
                        <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <Badge className={`${typeInfo.color} text-[10px] border-0 mb-1`}>
                            {typeInfo.label}
                        </Badge>
                        {profile.headline && (
                            <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-tight">
                                {profile.headline}
                            </h3>
                        )}
                    </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                    <p className="text-xs text-slate-500 line-clamp-3 mb-3 leading-relaxed">
                        {profile.bio}
                    </p>
                )}

                {/* Details */}
                <div className="space-y-1.5">
                    {profile.license_state && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span>{profile.license_state}</span>
                            {profile.license_verified && (
                                <span className="flex items-center gap-0.5 text-green-600">
                                    <CheckCircle2 className="h-3 w-3" /> Verified
                                </span>
                            )}
                        </div>
                    )}
                    {profile.years_experience && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Award className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span>{profile.years_experience} years experience</span>
                        </div>
                    )}
                    {profile.hourly_rate && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <DollarSign className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span>{profile.hourly_rate}/hr</span>
                            {profile.consultation_fee && (
                                <span className="text-muted-foreground">· {profile.consultation_fee} consult</span>
                            )}
                        </div>
                    )}
                    {profile.languages && profile.languages.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Globe className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span>{profile.languages.join(", ")}</span>
                        </div>
                    )}
                </div>

                {/* Practice Areas */}
                {profile.practice_areas && profile.practice_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                        {profile.practice_areas.slice(0, 3).map((area) => (
                            <Badge key={area} variant="outline" className="text-[10px] px-2 py-0.5">
                                {area}
                            </Badge>
                        ))}
                        {profile.practice_areas.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                                +{profile.practice_areas.length - 3} more
                            </Badge>
                        )}
                    </div>
                )}

                {/* Action */}
                <div className="mt-4 pt-3 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs border-teal-200 text-teal-700 hover:bg-teal-50"
                    >
                        <Users className="h-3.5 w-3.5 mr-1.5" />
                        Invite to Case
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ---- Profile List Item (List View) ----
function ProfileListItem({ profile }: { profile: DirectoryProfile }) {
    const typeInfo = PROFESSIONAL_TYPE_INFO[profile.professional_type] || {
        label: profile.professional_type,
        color: "bg-slate-100 text-slate-700",
    };

    return (
        <Card className={`hover:shadow-md transition-all ${profile.is_featured ? "ring-1 ring-amber-200 bg-amber-50/30" : ""}`}>
            <CardContent className="py-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 flex-shrink-0">
                        <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge className={`${typeInfo.color} text-[10px] border-0`}>{typeInfo.label}</Badge>
                            {profile.is_featured && (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                                    <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> Featured
                                </Badge>
                            )}
                            {profile.license_verified && (
                                <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                                    <CheckCircle2 className="h-3 w-3" /> Verified
                                </span>
                            )}
                        </div>
                        {profile.headline && (
                            <p className="text-sm font-medium text-slate-900 mt-0.5 truncate">{profile.headline}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {profile.license_state && (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.license_state}</span>
                            )}
                            {profile.years_experience && (
                                <span>{profile.years_experience} yrs exp</span>
                            )}
                            {profile.hourly_rate && <span>{profile.hourly_rate}/hr</span>}
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-teal-200 text-teal-700 hover:bg-teal-50 flex-shrink-0">
                        <Users className="h-3.5 w-3.5 mr-1.5" />
                        Invite
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
