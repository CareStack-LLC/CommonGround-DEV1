'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authAPI } from '@/lib/api';
import { Loader2 } from 'lucide-react';

/**
 * Auth Sync Page
 *
 * After the server-side PKCE code exchange in /auth/callback (route.ts),
 * the Supabase session is stored in cookies. This page:
 *  1. Reads the session from cookies via supabase.auth.getSession()
 *  2. Calls our backend oauthSync() to create/update the user record
 *  3. Stores backend tokens in localStorage
 *  4. Redirects to the dashboard (or `next` param)
 */
function AuthSyncContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Setting up your account...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const next = searchParams.get('next') || '/dashboard';

        async function syncUser() {
            try {
                setStatus('Verifying session...');

                // Session should already be in cookies from the Route Handler
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;
                if (!session) {
                    throw new Error('No session found after authentication. Please try again.');
                }

                const { user } = session;
                setStatus('Setting up your account...');

                // Sync user with our backend
                const response = await authAPI.oauthSync({
                    supabase_id: user.id,
                    email: user.email || '',
                    first_name:
                        (user.user_metadata?.full_name as string)?.split(' ')[0] ||
                        (user.user_metadata?.name as string)?.split(' ')[0] ||
                        user.email?.split('@')[0] ||
                        'User',
                    last_name:
                        (user.user_metadata?.full_name as string)?.split(' ').slice(1).join(' ') ||
                        (user.user_metadata?.name as string)?.split(' ').slice(1).join(' ') ||
                        '',
                    avatar_url:
                        (user.user_metadata?.avatar_url as string) ||
                        (user.user_metadata?.picture as string) ||
                        undefined,
                });

                // Store backend tokens
                if (response.access_token) {
                    localStorage.setItem('access_token', response.access_token);
                }
                if (response.refresh_token) {
                    localStorage.setItem('refresh_token', response.refresh_token);
                }
                if (response.user) {
                    localStorage.setItem('user', JSON.stringify(response.user));
                }

                setStatus('Success! Redirecting...');
                await new Promise(resolve => setTimeout(resolve, 400));
                router.push(next);

            } catch (err) {
                console.error('[auth/sync] error:', err);
                const msg = err instanceof Error ? err.message : 'Authentication sync failed';
                // If the backend sync fails but we have a session, still try to forward
                // the user. They might already exist or the backend might not be critical.
                if (!msg.includes('No session')) {
                    console.warn('[auth/sync] Backend sync failed, redirecting anyway:', msg);
                    router.push(next);
                } else {
                    setError(msg);
                }
            }
        }

        void syncUser();
    }, [router, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">{status}</h2>
                <p className="mt-2 text-gray-600">Please wait while we complete your sign in.</p>
            </div>
        </div>
    );
}

export default function AuthSyncPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                </div>
            }
        >
            <AuthSyncContent />
        </Suspense>
    );
}
