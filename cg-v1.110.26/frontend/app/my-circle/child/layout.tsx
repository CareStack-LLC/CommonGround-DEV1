'use client';

import { ChildIncomingCallBanner } from '@/components/kidcoms/child-incoming-call-banner';
import { KidSpaceThemeProvider } from '@/components/kidcoms/kidspace-theme-provider';
import { ChildSosButton } from '@/components/kidcoms/child-sos-button';

export default function ChildLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <KidSpaceThemeProvider>
            <ChildIncomingCallBanner />
            {children}
            <ChildSosButton />
        </KidSpaceThemeProvider>
    );
}
