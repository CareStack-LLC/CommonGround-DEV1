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

// ============================================================================
// MFA (Multi-Factor Authentication) Functions
// ============================================================================

/**
 * Get the current MFA assurance level and enrolled factors
 */
export async function getMFAStatus() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
        throw error;
    }
    return data;
}

/**
 * List all enrolled MFA factors for the current user
 */
export async function listMFAFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
        throw error;
    }
    return data;
}

/**
 * Enroll a new TOTP factor (start the enrollment process)
 * Returns a QR code to scan with an authenticator app
 */
export async function enrollMFA(friendlyName: string = 'Authenticator App') {
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
    });
    if (error) {
        throw error;
    }
    return data;
}

/**
 * Verify and activate an enrolled TOTP factor
 */
export async function verifyMFA(factorId: string, code: string) {
    // First create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
    });
    if (challengeError) {
        throw challengeError;
    }

    // Then verify the code
    const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
    });
    if (error) {
        throw error;
    }
    return data;
}

/**
 * Unenroll (remove) an MFA factor
 */
export async function unenrollMFA(factorId: string) {
    const { error } = await supabase.auth.mfa.unenroll({
        factorId,
    });
    if (error) {
        throw error;
    }
}

/**
 * Challenge and verify MFA in one step (for login flows)
 */
export async function challengeAndVerifyMFA(factorId: string, code: string) {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
    });
    if (error) {
        throw error;
    }
    return data;
}
