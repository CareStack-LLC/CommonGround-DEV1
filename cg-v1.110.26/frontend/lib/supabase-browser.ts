import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create a Supabase browser client that stores the PKCE code verifier
 * in cookies so it survives the OAuth redirect (unlike localStorage).
 * Use this in Client Components instead of the plain supabase client
 * for anything auth-related.
 */
export function createSupabaseBrowserClient() {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Singleton for convenience — mirrors the old `supabase` import
export const supabaseBrowser = createSupabaseBrowserClient();
