"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfessionalPortalPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/professional/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
    </div>
  );
}
