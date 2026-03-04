'use client';

import { Suspense, lazy } from 'react';
import { Gamepad2 } from 'lucide-react';

// Lazy load the heavy Phaser game component
const MiniMegaGame = lazy(() => import('@/components/mini-mega/MiniMegaGame'));

interface ArcadeModeProps {
    isActive: boolean;
    userId: string;
    onExit: () => void;
    // We can pass more session context here
}

export function ArcadeMode({ isActive, userId, onExit }: ArcadeModeProps) {
    if (!isActive) return null;

    // Determine if parent based on some logic, or just random/prop for now
    // Ideally this comes from the user object or session participant list
    // For now, let's assume if userId exists, we pass it.
    const isParent = false; // logic placeholder

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
            <Suspense fallback={<div className="text-white">Loading Arcade...</div>}>
                <MiniMegaGame
                    sessionId="demo-session"
                    userId={userId}
                    isParent={isParent}
                    onClose={onExit}
                />
            </Suspense>
        </div>
    );
}
