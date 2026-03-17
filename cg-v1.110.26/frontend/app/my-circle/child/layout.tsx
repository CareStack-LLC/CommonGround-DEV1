'use client';

import { ChildIncomingCallBanner } from '@/components/kidcoms/child-incoming-call-banner';
import { KidSpaceThemeProvider } from '@/components/kidcoms/kidspace-theme-provider';

export default function ChildLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <KidSpaceThemeProvider>
            <ChildIncomingCallBanner />
            {children}
        </KidSpaceThemeProvider>
    );
}
