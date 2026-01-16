'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authAPI } from '@/lib/api';

/**
 * OAuth Callback Page
 *
 * Handles the callback from OAuth providers (Google, Apple, etc.)
 * After successful OAuth authentication:
 * 1. Exchanges the code for a Supabase session
 * 2. Syncs the OAuth user with the backend
 * 3. Redirects to the dashboard
 */
export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('Processing sign in...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get the code from URL params
                const code = searchParams.get('code');
                const errorParam = searchParams.get('error');
                const errorDescription = searchParams.get('error_description');

                if (errorParam) {
                    throw new Error(errorDescription || errorParam);
                }

                if (!code) {
                    // No code means the OAuth flow redirected with session in hash
                    // Check for existing session
                    setStatus('Verifying session...');
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                    if (sessionError) {
                        throw sessionError;
                    }

                    if (!session) {
                        throw new Error('No authentication code or session found');
                    }

                    // We have a session from OAuth
                    await syncOAuthUser(session);
                    return;
                }

                // Exchange the code for a session
                setStatus('Authenticating...');
                const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                if (exchangeError) {
                    throw exchangeError;
                }

                if (!data.session) {
                    throw new Error('Failed to create session');
                }

                await syncOAuthUser(data.session);

            } catch (err) {
                console.error('OAuth callback error:', err);
                setError(err instanceof Error ? err.message : 'Authentication failed');
            }
        };

        /**
         * Sync the OAuth user with our backend
         * Creates or updates the user record in our database
         */
        async function syncOAuthUser(session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> }; access_token: string }) {
            setStatus('Setting up your account...');

            try {
                // Extract user info from Supabase session
                const { user } = session;

                // Call our backend to sync/create the user
                // The backend will check if this OAuth user exists and create if needed
                const response = await authAPI.oauthSync({
                    supabase_id: user.id,
                    email: user.email || '',
                    first_name: (user.user_metadata?.full_name as string)?.split(' ')[0] ||
                               (user.user_metadata?.name as string)?.split(' ')[0] ||
                               user.email?.split('@')[0] || 'User',
                    last_name: (user.user_metadata?.full_name as string)?.split(' ').slice(1).join(' ') ||
                              (user.user_metadata?.name as string)?.split(' ').slice(1).join(' ') ||
                              '',
                    avatar_url: user.user_metadata?.avatar_url as string || user.user_metadata?.picture as string || undefined,
                });

                // Store the tokens from our backend
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

                // Small delay for UX
                await new Promise(resolve => setTimeout(resolve, 500));

                // Redirect to dashboard
                router.push('/dashboard');

            } catch (err) {
                console.error('OAuth sync error:', err);
                // If sync fails, still try to redirect - the user might already exist
                router.push('/dashboard');
            }
        }

        handleCallback();
    }, [router, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
                    <div className="text-center">
                        <div className="mx-auto h-12 w-12 text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h2 className="mt-4 text-xl font-semibold text-gray-900">
                            Authentication Failed
                        </h2>
                        <p className="mt-2 text-gray-600">
                            {error}
                        </p>
                        <div className="mt-6 space-y-3">
                            <button
                                onClick={() => router.push('/login')}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Return to Login
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-gray-900">
                        {status}
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Please wait while we complete your sign in.
                    </p>
                </div>
            </div>
        </div>
    );
}
