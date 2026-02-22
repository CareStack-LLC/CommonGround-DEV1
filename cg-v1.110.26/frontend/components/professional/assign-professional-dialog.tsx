"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FirmMember {
    id: string;
    user_id: string;
    display_name: string;
    role: string;
    specializations: string[];
}

export function AssignProfessionalDialog({
    token,
    firmId,
    invitationId,
    onAccept,
    isAccepting,
    onCancel,
}: {
    token: string | null;
    firmId: string;
    invitationId: string;
    onAccept: (professionalId: string) => void;
    isAccepting: boolean;
    onCancel: () => void;
}) {
    const [members, setMembers] = useState<FirmMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentProfessionalId, setCurrentProfessionalId] = useState<string>("");
    const [selectedProfessional, setSelectedProfessional] = useState<string>("self");

    useEffect(() => {
        fetchFirmMembers();
        fetchCurrentProfessionalId();
    }, [token, firmId]);

    const fetchCurrentProfessionalId = async () => {
        if (!token) return;

        try {
            const response = await fetch(
                `${API_BASE}/api/v1/professional/profile`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setCurrentProfessionalId(data.id || "");
            }
        } catch (error) {
            console.error("Error fetching professional profile:", error);
        }
    };

    const fetchFirmMembers = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE}/api/v1/professional/firms/${firmId}/members`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setMembers(data || []);
            }
        } catch (error) {
            console.error("Error fetching firm members:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (selectedProfessional === "self") {
            onAccept(currentProfessionalId);
        } else {
            onAccept(selectedProfessional);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>Accept & Assign Case</DialogTitle>
                <DialogDescription>
                    Accept this case invitation and assign it to a professional in your firm
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Assign To</Label>
                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
                        </div>
                    ) : (
                        <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select professional" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="self">Assign to Myself</SelectItem>
                                {members.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.display_name} ({member.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-foreground mb-1">What happens next:</p>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                        <li>The selected professional will be assigned to this case</li>
                        <li>They will have access based on the requested scopes</li>
                        <li>The family will be notified of the acceptance</li>
                    </ul>
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isAccepting || loading || (selectedProfessional === "self" && !currentProfessionalId)}
                    className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20"
                >
                    {isAccepting ? "Accepting..." : "Accept & Assign"}
                </Button>
            </DialogFooter>
        </>
    );
}
