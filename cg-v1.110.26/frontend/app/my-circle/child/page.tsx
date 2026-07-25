'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Delete, LogIn } from 'lucide-react';
import { myCircleAPI, ChildAvatar } from '@/lib/api';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
import { KidSpaceThemeToggle } from '@/components/kidcoms/kidspace-theme-toggle';
import { useKidSpaceTheme } from '@/components/kidcoms/kidspace-theme-provider';
import { ARIAHelper } from '@/components/kidcoms/aria-helper';

const DEFAULT_AVATARS: ChildAvatar[] = [
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'panda', emoji: '🐼', name: 'Panda' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn' },
  { id: 'bear', emoji: '🐻', name: 'Bear' },
  { id: 'cat', emoji: '🐱', name: 'Cat' },
  { id: 'dog', emoji: '🐶', name: 'Dog' },
  { id: 'rabbit', emoji: '🐰', name: 'Rabbit' },
  { id: 'fox', emoji: '🦊', name: 'Fox' },
  { id: 'koala', emoji: '🐨', name: 'Koala' },
  { id: 'penguin', emoji: '🐧', name: 'Penguin' },
  { id: 'monkey', emoji: '🐵', name: 'Monkey' },
  { id: 'dragon', emoji: '🐉', name: 'Dragon' },
];

function ChildLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('family');

  const [step, setStep] = useState<'username' | 'pin'>('username');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatars, setAvatars] = useState<ChildAvatar[]>(DEFAULT_AVATARS);

  useEffect(() => {
    loadAvatars();
  }, []);

  async function loadAvatars() {
    try {
      const data = await myCircleAPI.getAvatars();
      setAvatars(data);
    } catch {
      // Use defaults
    }
  }

  function handleUsernameSelect(name: string) {
    setUsername(name);
    setStep('pin');
    setPin('');
    setError(null);
  }

  function handlePinDigit(digit: string) {
    if (pin.length < 6) {
      setPin(pin + digit);
      setError(null);
    }
  }

  function handlePinBackspace() {
    setPin(pin.slice(0, -1));
    setError(null);
  }

  function handlePinClear() {
    setPin('');
    setError(null);
  }

  async function handleLogin() {
    if (!familyFileId) {
      setError('Family code is missing. Please scan the QR code again.');
      return;
    }

    if (pin.length < 4) {
      setError('Please enter your full PIN');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await myCircleAPI.childUserLogin(familyFileId, username, pin);

      // Store the token and user info
      localStorage.setItem('child_token', response.access_token);
      localStorage.setItem('child_user', JSON.stringify({
        userId: response.user_id,
        childId: response.child_id,
        childName: response.child_name,
        avatarId: response.avatar_id,
        familyFileId: response.family_file_id,
      }));

      // Store contacts from login response
      if (response.contacts && response.contacts.length > 0) {
        localStorage.setItem('child_contacts', JSON.stringify(response.contacts));
      }

      // Redirect to child dashboard
      router.push('/my-circle/child/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Wrong PIN. Try again!';
      setError(errorMessage);
      setPin('');
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === 4 && !isLoading) {
      handleLogin();
    }
  }, [pin]);

  if (!familyFileId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, var(--portal-background), var(--portal-surface), var(--portal-background))' }}>
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
          <div className="absolute top-32 left-0 w-full h-px" style={{ background: 'var(--portal-border)' }} />
          <div className="absolute top-64 right-0 w-3/4 h-px" style={{ background: 'var(--portal-border)' }} />
        </div>

        <div className="relative z-10 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full text-center" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', boxShadow: 'var(--portal-shadow-lg)' }}>
          <KidComsLogo size="lg" className="mb-6 justify-center" />
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--portal-muted)', fontFamily: 'Inter, sans-serif' }}>
            KidSpace by CommonGround
          </p>
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--portal-text-heading)', fontFamily: 'Space Grotesk, sans-serif' }}>Oops!</h1>
          <p className="mb-6" style={{ color: 'var(--portal-muted)', fontFamily: 'Inter, sans-serif' }}>
            We need your family code to log you in. Ask a parent to help you scan the QR code.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 text-white rounded-full font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)', fontFamily: 'Inter, sans-serif' }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, var(--portal-background), var(--portal-surface), var(--portal-background))' }}>
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
        <div className="absolute top-32 left-0 w-full h-px" style={{ background: 'var(--portal-border)' }} />
        <div className="absolute top-64 right-0 w-3/4 h-px" style={{ background: 'var(--portal-border)' }} />
        <div className="absolute bottom-32 left-0 w-2/3 h-px" style={{ background: 'var(--portal-border)' }} />
      </div>

      {/* Large KidComsLogo at top */}
      <div className="relative z-10 text-center mb-8">
        <KidComsLogo size="lg" showText={true} className="mb-3 justify-center" />
        <p
          className="text-sm font-medium tracking-wide"
          style={{
            color: 'var(--portal-muted)',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.05em',
          }}
        >
          KidSpace by CommonGround
        </p>
      </div>

      <div className="relative z-10 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', boxShadow: 'var(--portal-shadow-lg)' }}>
        {step === 'username' ? (
          <>
            {/* Username Selection */}
            <div className="text-center mb-6">
              <h1
                className="text-3xl font-bold"
                style={{ color: 'var(--portal-text-heading)', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Hi there!
              </h1>
              <p className="mt-1" style={{ color: 'var(--portal-muted)', fontFamily: 'Inter, sans-serif' }}>
                Who are you?
              </p>
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {avatars.slice(0, 8).map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleUsernameSelect(avatar.name)}
                  className="flex flex-col items-center p-3 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: 'var(--portal-background)', border: '1px solid transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--portal-border)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <span className="text-4xl">{avatar.emoji}</span>
                  <span
                    className="text-xs mt-1 truncate w-full text-center"
                    style={{ color: 'var(--portal-muted)', fontFamily: 'Inter, sans-serif' }}
                  >
                    {avatar.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Manual Entry */}
            <div className="relative">
              <input
                type="text"
                placeholder="Or type your name..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && username) {
                    setStep('pin');
                  }
                }}
                className="w-full px-4 py-3 rounded-xl focus:outline-none text-lg transition-all duration-200"
                style={{
                  background: 'var(--portal-background)',
                  border: '2px solid var(--portal-border)',
                  color: 'var(--portal-text)',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#14b8a6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--portal-border)'; }}
              />
              {username && (
                <button
                  onClick={() => setStep('pin')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}
                >
                  <LogIn className="h-5 w-5" />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* PIN Entry */}
            <div className="text-center mb-6">
              <button aria-label="Back"
                onClick={() => {
                  setStep('username');
                  setPin('');
                  setError(null);
                }}
                className="absolute top-4 left-4 p-2 transition-all duration-200 hover:scale-110 active:scale-95"
                style={{ color: 'var(--portal-muted)' }}
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--portal-text-heading)', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Hi {username}!
              </h1>
              <p className="mt-1" style={{ color: 'var(--portal-muted)', fontFamily: 'Inter, sans-serif' }}>
                Enter your secret PIN
              </p>
            </div>

            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all duration-300"
                  style={
                    pin[i]
                      ? {
                          background: 'linear-gradient(135deg, #06b6d4, #14b8a6)',
                          border: '3px solid #14b8a6',
                          color: '#ffffff',
                          transform: 'scale(1.05)',
                        }
                      : {
                          background: 'var(--portal-background)',
                          border: '3px solid var(--portal-border)',
                        }
                  }
                >
                  {pin[i] ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div
                className="mb-4 p-3 rounded-xl text-center text-sm transition-all duration-300"
                style={{
                  background: 'color-mix(in srgb, var(--portal-surface) 90%, #ef4444)',
                  color: '#ef4444',
                  border: '1px solid color-mix(in srgb, var(--portal-border) 80%, #ef4444)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {error}
              </div>
            )}

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinDigit(digit.toString())}
                  disabled={isLoading}
                  className="p-4 text-2xl font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 hover:brightness-95"
                  style={{
                    background: 'var(--portal-background)',
                    border: '1px solid var(--portal-border)',
                    color: 'var(--portal-text)',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handlePinClear}
                disabled={isLoading}
                className="p-4 text-sm font-semibold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50"
                style={{
                  background: 'color-mix(in srgb, var(--portal-surface) 85%, #ef4444)',
                  color: '#ef4444',
                  border: '1px solid var(--portal-border)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Clear
              </button>
              <button
                onClick={() => handlePinDigit('0')}
                disabled={isLoading}
                className="p-4 text-2xl font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 hover:brightness-95"
                style={{
                  background: 'var(--portal-background)',
                  border: '1px solid var(--portal-border)',
                  color: 'var(--portal-text)',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                0
              </button>
              <button aria-label="Backspace"
                onClick={handlePinBackspace}
                disabled={isLoading}
                className="p-4 rounded-2xl transition-all duration-200 active:scale-95 flex items-center justify-center disabled:opacity-50"
                style={{
                  background: 'color-mix(in srgb, var(--portal-surface) 85%, #f59e0b)',
                  color: '#f59e0b',
                  border: '1px solid var(--portal-border)',
                }}
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="mt-6 flex items-center justify-center gap-2" style={{ color: 'var(--portal-text-heading)' }}>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span style={{ fontFamily: 'Inter, sans-serif' }}>Logging in...</span>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm" style={{ color: 'var(--portal-muted)', fontFamily: 'Inter, sans-serif' }}>
          Need help? Ask a grown-up!
        </div>
      </div>

      {/* ARIA Helper */}
      <ARIAHelper message="Welcome back! Enter your PIN to get started" mood="waving" position="bottom-right" />
    </div>
  );
}

export default function ChildLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--portal-background)' }}>
          <Loader2 className="h-12 w-12 animate-spin" style={{ color: 'var(--portal-text-heading)' }} />
        </div>
      }
    >
      <ChildLoginContent />
    </Suspense>
  );
}
