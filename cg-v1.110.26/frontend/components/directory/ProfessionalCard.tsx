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
        <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col h-full">
            {/* Media Header */}
            <div className="relative h-48 bg-gray-100 dark:bg-gray-900 overflow-hidden cursor-pointer" onClick={handleViewProfile}>
                {firm.video_url ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-colors">
                        {/* Show video thumbnail if available, else usage placeholder overlay */}
                        {/* Note: In real auth, use Mux thumbnail. For now, we use a placeholder or logo generic background */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                        {/* Play Button Overlay */}
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center z-20 group-hover:scale-110 transition-transform duration-300 border border-white/40">
                            <Video className="w-8 h-8 text-white fill-current" />
                        </div>
                        {firm.logo_url && (
                            <Image
                                src={firm.logo_url}
                                alt={firm.name}
                                fill
                                className="object-cover opacity-50 blur-sm"
                            />
                        )}
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                        {firm.logo_url ? (
                            <div className="relative w-full h-full p-8">
                                <Image
                                    src={firm.logo_url}
                                    alt={firm.name}
                                    fill
                                    className="object-contain p-8"
                                />
                            </div>
                        ) : (
                            <div className="text-4xl font-bold text-gray-300 dark:text-gray-700">
                                {firm.name.charAt(0)}
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

            <CardContent className="flex-1 p-5 space-y-4">
                <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors cursor-pointer" onClick={handleViewProfile}>
                            {firm.name}
                        </h3>
                    </div>

                    {firm.headline && (
                        <p className="text-sm font-medium text-primary/90 mb-2">
                            {firm.headline}
                        </p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <MapPin className="w-3 h-3" />
                        <span>{firm.city}, {firm.state}</span>
                        {firm.zip_code && <span>• {firm.zip_code}</span>}
                    </div>

                    {firm.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {firm.description}
                        </p>
                    )}
                </div>

                {firm.practice_areas && firm.practice_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {firm.practice_areas.slice(0, 3).map((area) => (
                            <span key={area} className="px-2 py-1 rounded-md bg-secondary/50 text-secondary-foreground text-[10px] font-medium border border-secondary">
                                {area}
                            </span>
                        ))}
                        {firm.practice_areas.length > 3 && (
                            <span className="px-2 py-1 rounded-md bg-secondary/30 text-muted-foreground text-[10px] font-medium">
                                +{firm.practice_areas.length - 3} more
                            </span>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-5 pt-0 flex gap-2">
                <Button
                    variant="default"
                    className="flex-1"
                    onClick={handleViewProfile}
                >
                    View Profile
                </Button>
                {onInvite && (
                    <Button
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); onInvite(firm); }}
                    >
                        Invite
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
