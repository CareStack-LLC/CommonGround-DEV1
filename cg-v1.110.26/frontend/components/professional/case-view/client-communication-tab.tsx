"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Phone, FileCheck, Bot, FileText } from "lucide-react";
import { CaseCommunicationsTab } from "@/components/professional/case-view/case-communications-tab";
import { CallsTab } from "@/components/professional/case-view/client-communication/calls-tab";
import { ReportsTab } from "@/components/professional/case-view/client-communication/reports-tab";
import { AriaTab } from "@/components/professional/case-view/client-communication/aria-tab";

interface ClientCommunicationTabProps {
    familyFileId: string;
    token: string;
}

export function ClientCommunicationTab({ familyFileId, token }: ClientCommunicationTabProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-slate-900">Client Communication</h2>
                <p className="text-sm text-slate-500">
                    Central hub for all client interactions, call logs, compliance reports, and AI agent controls.
                </p>
            </div>

            <Tabs defaultValue="messages" className="w-full">
                <TabsList className="bg-slate-100 p-1 w-full justify-start overflow-x-auto">
                    <TabsTrigger value="messages" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Messages
                    </TabsTrigger>
                    <TabsTrigger value="calls" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Phone className="h-4 w-4 mr-2" />
                        Calls & Logs
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Compliance Reports
                    </TabsTrigger>
                    <TabsTrigger value="aria" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Bot className="h-4 w-4 mr-2" />
                        ARIA Controls
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="messages" className="mt-6 outline-none">
                    <CaseCommunicationsTab familyFileId={familyFileId} token={token} />
                </TabsContent>

                <TabsContent value="calls" className="mt-6 outline-none">
                    <CallsTab familyFileId={familyFileId} token={token} />
                </TabsContent>

                <TabsContent value="reports" className="mt-6 outline-none">
                    <ReportsTab familyFileId={familyFileId} token={token} />
                </TabsContent>

                <TabsContent value="aria" className="mt-6 outline-none">
                    <AriaTab familyFileId={familyFileId} token={token} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
