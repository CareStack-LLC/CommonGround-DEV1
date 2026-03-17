'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ARIAMood = 'happy' | 'thinking' | 'cheering' | 'watching' | 'waving';
type ARIAPosition = 'bottom-right' | 'bottom-left' | 'inline' | 'center';

interface ARIAHelperProps {
  message: string;
  mood?: ARIAMood;
  position?: ARIAPosition;
  autoDismiss?: boolean;
  dismissDelay?: number;
  size?: 'sm' | 'md';
  className?: string;
  onDismiss?: () => void;
}

const MOOD_EMOJI: Record<ARIAMood, string> = {
  happy: '',
  thinking: '🤔',
  cheering: '🎉',
  watching: '👀',
  waving: '👋',
};

export function ARIAHelper({
  message,
  mood = 'happy',
  position = 'bottom-right',
  autoDismiss = true,
  dismissDelay = 4000,
  size = 'sm',
  className,
  onDismiss,
}: ARIAHelperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!autoDismiss) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setIsDismissed(true);
        onDismiss?.();
      }, 400);
    }, dismissDelay);
    return () => clearTimeout(timer);
  }, [autoDismiss, dismissDelay, onDismiss]);

  if (isDismissed) return null;

  const imageSize = size === 'sm' ? 36 : 48;

  const positionClasses: Record<ARIAPosition, string> = {
    'bottom-right': 'fixed bottom-20 right-4 z-40',
    'bottom-left': 'fixed bottom-20 left-4 z-40',
    'inline': 'relative',
    'center': 'flex justify-center',
  };

  return (
    <div
      className={cn(
        positionClasses[position],
        'transition-all duration-400',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      onClick={() => {
        setIsVisible(false);
        setTimeout(() => {
          setIsDismissed(true);
          onDismiss?.();
        }, 300);
      }}
    >
      <div className="flex items-end gap-2">
        <div className="flex-shrink-0 animate-[aria-float_3s_ease-in-out_infinite]">
          <Image
            src="/images/Aria.png"
            alt="ARIA"
            width={imageSize}
            height={imageSize}
            className="drop-shadow-lg"
          />
        </div>
        <div
          className={cn(
            'px-3 py-2 rounded-2xl rounded-bl-sm shadow-lg max-w-[220px]',
            'bg-[var(--portal-surface)] border border-[var(--portal-border)]'
          )}
        >
          <p
            className="text-[var(--portal-text)] text-xs leading-relaxed"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {MOOD_EMOJI[mood] && <span className="mr-1">{MOOD_EMOJI[mood]}</span>}
            {message}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes aria-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
