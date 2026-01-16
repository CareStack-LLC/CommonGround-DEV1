import { createClient, Provider } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are missing! Realtime features will not work.');
}

// Create the client only if we have the URL, otherwise create a mock or throw a controlled error
// For now, we'll let it create but it might fail on calls if empty.
// Supabase createClient might throw if URL is empty, so let's safeguard.

export const supabase = createClient(
    supabaseUrl || 'https://qqttugwxmkbnrgzgqbkz.supabase.co',
    supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdHR1Z3d4bWtibnJnemdxYmt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzY1NDEsImV4cCI6MjA4MjY1MjU0MX0.JfzKDV-8yhW3ThFz1wHIXL2uJmjCl7yhS_R_yBt5pNE'
);

// OAuth helper functions

/**
 * Sign in with an OAuth provider (Google, Apple, etc.)
 * Redirects to the provider's auth page.
 */
export async function signInWithOAuth(provider: Provider) {
    const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    });

    if (error) {
        throw error;
    }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
    return signInWithOAuth('google');
}

/**
 * Sign in with Apple OAuth
 */
export async function signInWithApple() {
    return signInWithOAuth('apple');
}

/**
 * Get the current Supabase session
 */
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        throw error;
    }
    return data.session;
}

/**
 * Exchange OAuth code for session (called from callback page)
 */
export async function exchangeCodeForSession(code: string) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        throw error;
    }
    return data;
}
