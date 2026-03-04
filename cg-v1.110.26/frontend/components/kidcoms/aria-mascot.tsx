'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ARIAMascotProps {
  greeting?: string;
  state?: 'idle' | 'greeting' | 'loading' | 'success';
  className?: string;
}

export function ARIAMascot({
  greeting,
  state = 'idle',
  className
}: ARIAMascotProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (greeting) {
      setShowGreeting(true);
    }
  }, [greeting]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8",
        className
      )}
    >
      {/* Greeting bubble */}
      {greeting && (
        <div
          className={cn(
            "mb-4 px-6 py-3 bg-white rounded-full shadow-xl border-2 border-purple-200",
            "transform transition-all duration-500",
            showGreeting
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-4"
          )}
        >
          <p className="text-sm md:text-base font-bold text-gray-700 whitespace-nowrap">
            {greeting}
          </p>
        </div>
      )}

      {/* ARIA mascot with floating animation */}
      <div className="relative">
        {/* Main ARIA image */}
        <div
          className={cn(
            "relative z-10",
            state === 'idle' && "animate-aria-float",
            state === 'greeting' && "animate-aria-bounce",
            state === 'loading' && "animate-aria-pulse",
            state === 'success' && "animate-aria-success"
          )}
        >
          <Image
            src="/images/Aria.png"
            alt="ARIA"
            width={180}
            height={180}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* Orbital decoration dots - animated around ARIA */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top right green dot */}
          <div
            className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full shadow-lg"
            style={{
              animation: 'aria-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)'
            }}
          />

          {/* Top left small dot */}
          <div
            className="absolute top-8 left-4 w-2 h-2 bg-green-300 rounded-full"
            style={{
              animation: 'aria-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
            }}
          />

          {/* Bottom right sparkle */}
          <div
            className="absolute bottom-12 right-8 w-2 h-2 bg-purple-300 rounded-full"
            style={{
              animation: 'aria-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 1s',
              boxShadow: '0 0 8px rgba(167, 139, 250, 0.4)'
            }}
          />
        </div>

        {/* Success sparkles */}
        {state === 'success' && (
          <>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-3xl animate-aria-sparkle">
              ✨
            </div>
            <div className="absolute top-1/4 -left-4 text-2xl animate-aria-sparkle" style={{ animationDelay: '0.2s' }}>
              🌟
            </div>
            <div className="absolute top-1/4 -right-4 text-2xl animate-aria-sparkle" style={{ animationDelay: '0.4s' }}>
              ⭐
            </div>
          </>
        )}
      </div>

      {/* Shadow beneath ARIA for grounding */}
      <div
        className={cn(
          "w-32 h-3 bg-gradient-to-r from-transparent via-gray-300/40 to-transparent rounded-full blur-sm mt-2 transition-all duration-1000",
          state === 'idle' && "animate-aria-shadow-pulse"
        )}
      />

      {/* Hidden style tag for custom animations */}
      <style>{`
        @keyframes aria-float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes aria-bounce {
          0%, 100% {
            transform: translateY(0px);
          }
          25% {
            transform: translateY(-15px);
          }
          50% {
            transform: translateY(-5px);
          }
          75% {
            transform: translateY(-10px);
          }
        }

        @keyframes aria-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        @keyframes aria-success {
          0% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.1) rotate(-5deg);
          }
          50% {
            transform: scale(1.05) rotate(5deg);
          }
          75% {
            transform: scale(1.08) rotate(-3deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes aria-ping {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
        }

        @keyframes aria-shadow-pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scaleX(1);
          }
          50% {
            opacity: 0.6;
            transform: scaleX(1.1);
          }
        }

        @keyframes aria-sparkle {
          0% {
            transform: translateY(0px) scale(0);
            opacity: 0;
          }
          50% {
            transform: translateY(-20px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-40px) scale(0.5);
            opacity: 0;
          }
        }

        .animate-aria-float {
          animation: aria-float 3s ease-in-out infinite;
        }

        .animate-aria-bounce {
          animation: aria-bounce 0.8s ease-in-out;
        }

        .animate-aria-pulse {
          animation: aria-pulse 2s ease-in-out infinite;
        }

        .animate-aria-success {
          animation: aria-success 0.6s ease-in-out;
        }

        .animate-aria-shadow-pulse {
          animation: aria-shadow-pulse 3s ease-in-out infinite;
        }

        .animate-aria-sparkle {
          animation: aria-sparkle 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
