import { FirmDirectoryEntry } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ShieldCheck, Star, Video, ArrowRight, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProfessionalCardProps {
    firm: FirmDirectoryEntry;
    onViewProfile?: (firm: FirmDirectoryEntry) => void;
    onInvite?: (firm: FirmDirectoryEntry) => void;
}

export function ProfessionalCard({ firm, onViewProfile, onInvite }: ProfessionalCardProps) {
    const router = useRouter();

    const handleViewProfile = () => {
        if (onViewProfile) {
            onViewProfile(firm);
        } else {
            // Navigate to the firm's profile page using its slug
            router.push(`/directory/${firm.slug}`);
        }
    };

    return (
        <Card className="overflow-hidden bg-white rounded-3xl border-2 border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
            {/* Media Header */}
            <div className="relative h-48 sm:h-52 bg-slate-50 overflow-hidden cursor-pointer" onClick={handleViewProfile}>
                {firm.video_url ? (
                    <div className="absolute inset-0">
                        {/* Autoplay preview video */}
                        <video
                            src={firm.video_url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Premium Glass Overlay */}
                        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] group-hover:bg-black/20 transition-colors duration-300 z-10" />

                        {/* Play Icon Decorative Overlay */}
                        <div className="absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/50 shadow-sm group-hover:scale-110 transition-transform duration-300">
                            <Video className="w-5 h-5 text-white fill-current" />
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-6">
                        {firm.logo_url ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <Image
                                    src={firm.logo_url}
                                    alt={firm.name}
                                    fill
                                    className="object-contain hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center shadow-inner">
                                <span className="text-4xl font-bold text-slate-400" style={{ fontFamily: 'DM Serif Display, serif' }}>
                                    {firm.name.charAt(0)}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 z-30 flex flex-col gap-2">
                    {firm.safety_vetted && (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 border-0 shadow-sm">
                            <ShieldCheck className="w-3 h-3" />
                            Safety Vetted
                        </Badge>
                    )}
                    {firm.firm_type === 'mediation_practice' && (
                        <Badge variant="outline" className="bg-white/90 dark:bg-black/90 backdrop-blur-sm border-white/20">
                            Mediator
                        </Badge>
                    )}
                </div>
            </div>

            <CardContent className="flex-1 p-6 space-y-4">
                <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-xl leading-tight group-hover:text-[var(--portal-primary)] transition-colors cursor-pointer text-slate-900" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                            {firm.name}
                        </h3>
                    </div>

                    {firm.headline && (
                        <p className="text-sm font-bold text-[var(--portal-primary)]/90 mb-3 tracking-wide uppercase">
                            {firm.headline}
                        </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mb-4">
                        <div className="w-5 h-5 rounded-full bg-cg-sage-subtle flex items-center justify-center">
                            <MapPin className="w-3 h-3 text-cg-sage" />
                        </div>
                        <span>{firm.city}, {firm.state}</span>
                        {firm.zip_code && <span className="text-slate-300 text-[10px]">|</span>}
                        {firm.zip_code && <span>{firm.zip_code}</span>}
                    </div>

                    {firm.description && (
                        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed font-medium">
                            {firm.description}
                        </p>
                    )}
                </div>

                {firm.practice_areas && firm.practice_areas.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {firm.practice_areas.slice(0, 3).map((area) => (
                            <span key={area} className="px-3 py-1 rounded-full bg-cg-sage-subtle text-cg-sage text-[10px] font-bold border border-cg-sage/10 tracking-tight">
                                {area}
                            </span>
                        ))}
                        {firm.practice_areas.length > 3 && (
                            <span className="px-3 py-1 rounded-full bg-cg-sand-dark text-slate-500 text-[10px] font-bold">
                                +{firm.practice_areas.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-5 pt-0 mt-auto flex flex-row gap-2">
                <Button
                    variant="default"
                    className="flex-1 rounded-full bg-[#3DAA8A] hover:bg-[#3A5646] text-white shadow-sm transition-all duration-300 font-bold h-11"
                    onClick={handleViewProfile}
                >
                    View Profile
                </Button>
                {onInvite && (
                    <Button
                        variant="outline"
                        className="flex-shrink-0 px-6 rounded-full border-2 border-[#3DAA8A] text-[#3DAA8A] hover:bg-[#E8F0EC] font-bold h-11"
                        onClick={(e) => { e.stopPropagation(); onInvite(firm); }}
                    >
                        Invite
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
