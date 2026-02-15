"use client";

import { useProfessionalAuth } from "../../layout";
import { FirmAnalyticsDashboard } from "@/components/professional/firm/firm-analytics-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function FirmAnalyticsPage() {
    const { token, activeFirm, isLoading } = useProfessionalAuth();

    if (isLoading) return <div>Loading...</div>;
    if (!activeFirm) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-8 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h2 className="text-lg font-semibold mb-2">No Firm Selected</h2>
                        <p className="text-gray-500 mb-4">Select a firm from the header to view analytics.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/professional/firm">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Firm Analytics</h1>
                    <p className="text-muted-foreground">{activeFirm.name} Performance Overview</p>
                </div>
            </div>

            <FirmAnalyticsDashboard firmId={activeFirm.id} token={token || ""} />
        </div>
    );
}
