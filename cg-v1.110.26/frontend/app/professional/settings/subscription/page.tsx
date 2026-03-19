"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SubscriptionRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/professional/settings?tab=subscription");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#3DAA8A]" />
    </div>
  );
}
