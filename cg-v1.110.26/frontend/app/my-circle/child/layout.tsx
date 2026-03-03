'use client';

import { ChildIncomingCallBanner } from '@/components/kidcoms/child-incoming-call-banner';

export default function ChildLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <ChildIncomingCallBanner />
            {children}
        </>
    );
}
