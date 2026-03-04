"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCourtAuth } from "./layout";

export default function CourtPortalPage() {
  const router = useRouter();
  const { professional, isLoading } = useCourtAuth();

  useEffect(() => {
    if (!isLoading) {
      if (professional) {
        router.push("/court-portal/dashboard");
      } else {
        router.push("/court-portal/login");
      }
    }
  }, [professional, isLoading, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto" />
        <p className="mt-3 text-muted-foreground text-sm">Redirecting...</p>
      </div>
    </div>
  );
}
