'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Delete, LogIn } from 'lucide-react';
import { myCircleAPI, ChildAvatar } from '@/lib/api';

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
      <div className="min-h-screen bg-gradient-to-b from-purple-400 via-pink-400 to-orange-300 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600 mb-6">
            We need your family code to log you in. Ask a parent to help you scan the QR code.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-500 text-white rounded-full font-semibold hover:bg-purple-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400 via-pink-400 to-orange-300 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        {step === 'username' ? (
          <>
            {/* Username Selection */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-2">👋</div>
              <h1 className="text-3xl font-bold text-gray-800">Hi there!</h1>
              <p className="text-gray-500 mt-1">Who are you?</p>
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {avatars.slice(0, 8).map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleUsernameSelect(avatar.name)}
                  className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 hover:bg-purple-100 hover:scale-105 transition-all"
                >
                  <span className="text-4xl">{avatar.emoji}</span>
                  <span className="text-xs text-gray-600 mt-1 truncate w-full text-center">
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none text-lg"
              />
              {username && (
                <button
                  onClick={() => setStep('pin')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
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
              <button
                onClick={() => {
                  setStep('username');
                  setPin('');
                  setError(null);
                }}
                className="absolute top-4 left-4 p-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="text-6xl mb-2">🔐</div>
              <h1 className="text-2xl font-bold text-gray-800">Hi {username}!</h1>
              <p className="text-gray-500 mt-1">Enter your secret PIN</p>
            </div>

            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-2xl border-3 flex items-center justify-center text-2xl font-bold transition-all ${
                    pin[i]
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-gray-100 border-gray-200'
                  }`}
                >
                  {pin[i] ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-xl text-center text-sm">
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
                  className="p-4 text-2xl font-bold bg-gray-100 hover:bg-purple-100 rounded-2xl transition-colors disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handlePinClear}
                disabled={isLoading}
                className="p-4 text-sm font-semibold bg-red-100 hover:bg-red-200 text-red-600 rounded-2xl transition-colors disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={() => handlePinDigit('0')}
                disabled={isLoading}
                className="p-4 text-2xl font-bold bg-gray-100 hover:bg-purple-100 rounded-2xl transition-colors disabled:opacity-50"
              >
                0
              </button>
              <button
                onClick={handlePinBackspace}
                disabled={isLoading}
                className="p-4 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-2xl transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="mt-6 flex items-center justify-center gap-2 text-purple-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Logging in...</span>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Need help? Ask a grown-up!
        </div>
      </div>
    </div>
  );
}

export default function ChildLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
        </div>
      }
    >
      <ChildLoginContent />
    </Suspense>
  );
}
