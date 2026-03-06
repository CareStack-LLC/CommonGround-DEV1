import { createClient, Provider } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (typeof window !== 'undefined') {
        console.error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing! Please check your .env file.');
    }
}

/**
 * Plain supabase client (uses localStorage). Keep for non-auth usage (DB queries,
 * realtime, etc.). For OAuth sign-in, use signInWithOAuth() below which uses
 * the SSR browser client that stores the PKCE verifier in cookies.
 */
export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            flowType: 'pkce',
        },
    }
);

/**
 * SSR-aware browser client. Stores the PKCE code_verifier in a cookie so it
 * survives the server-side OAuth redirect (unlike localStorage which is
 * cleared between the initiation redirect and the callback).
 */
function getOAuthClient() {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// OAuth helper functions

/**
 * Sign in with an OAuth provider (Google, Apple, etc.)
 * Uses @supabase/ssr so the PKCE code_verifier is stored in a cookie.
 */
export async function signInWithOAuth(provider: Provider) {
    const client = getOAuthClient();

    // Explicitly construct the redirect URL to guarantee Next.js and Vercel
    // routing matches the cookie domain precisely.
    const redirectUrl = new URL('/auth/callback', window.location.origin);

    const { error } = await client.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: redirectUrl.toString(),
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
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
