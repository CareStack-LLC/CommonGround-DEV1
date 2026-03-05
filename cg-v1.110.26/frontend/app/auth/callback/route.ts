import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Auth Callback Route Handler
 *
 * Handles two distinct Supabase auth flows:
 *
 * 1. PKCE OAuth flow (Google sign-in):
 *    Google redirects back with ?code=... 
 *    We call exchangeCodeForSession(code) which reads the PKCE verifier from cookies.
 *
 * 2. Email OTP / token_hash flow (email confirmation after registration):
 *    Supabase sends a confirmation email with a link containing ?token_hash=...&type=signup
 *    We call verifyOtp({ token_hash, type }) to confirm the email.
 *
 * Both flows store the session in cookies and then redirect to /auth/sync
 * where the backend user record is created/updated.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);

    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as 'signup' | 'recovery' | 'email' | 'invite' | null;
    const next = searchParams.get('next') ?? '/dashboard';
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // OAuth provider returned an error
    if (errorParam) {
        const errorMsg = encodeURIComponent(errorDescription || errorParam);
        return NextResponse.redirect(`${origin}/login?error=${errorMsg}`);
    }

    const supabase = await createSupabaseServerClient();

    // ── Flow 1: Email OTP / token_hash (email confirmation, password reset) ──
    if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
            console.error('[auth/callback] verifyOtp error:', error.message);
            const errorMsg = encodeURIComponent(error.message);
            return NextResponse.redirect(`${origin}/login?error=${errorMsg}`);
        }
        // For password recovery, send to reset-password page
        if (type === 'recovery') {
            return NextResponse.redirect(`${origin}/reset-password`);
        }
        // For signup confirmation, sync user and go to dashboard
        return NextResponse.redirect(`${origin}/auth/sync?next=${encodeURIComponent(next)}`);
    }

    // ── Flow 2: PKCE code exchange (Google / Apple OAuth) ──
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error('[auth/callback] exchangeCodeForSession error:', error.message);
            const errorMsg = encodeURIComponent(error.message);
            return NextResponse.redirect(`${origin}/login?error=${errorMsg}`);
        }
        // Session stored in cookies — hand off to client-side sync page
        return NextResponse.redirect(`${origin}/auth/sync?next=${encodeURIComponent(next)}`);
    }

    // Neither code nor token_hash — something went wrong
    return NextResponse.redirect(`${origin}/login?error=No+authorization+parameters+found`);
}
