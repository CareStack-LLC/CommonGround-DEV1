'use client';

import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  childName: string;
  avatarUrl?: string;
  className?: string;
}

export function HeroSection({ childName, avatarUrl, className }: HeroSectionProps) {
  // Get time-based greeting
  const hour = new Date().getHours();
  let greeting = 'Good Morning';
  if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon';
  } else if (hour >= 17) {
    greeting = 'Good Evening';
  }

  return (
    <div className={cn(
      "relative bg-gradient-to-br from-teal-500 via-violet-500 to-purple-600 rounded-2xl p-6 overflow-hidden shadow-lg",
      className
    )}>
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Content */}
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <div className="text-white/80 text-sm font-medium mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            {greeting}
          </div>
          <h1 className="text-white text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Hey, {childName}
          </h1>
          <p className="text-white/90 text-base" style={{ fontFamily: 'Inter, sans-serif' }}>
            Welcome Back
          </p>
        </div>

        {/* Profile Avatar */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40 overflow-hidden flex items-center justify-center shadow-xl">
            {avatarUrl ? (
              <img src={avatarUrl} alt={childName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-white" strokeWidth={2} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
