import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create a Supabase server client for use in Route Handlers and Server Components.
 * This reads and writes the PKCE code verifier + session tokens via cookies,
 * which is required for the PKCE flow to work across the OAuth redirect.
 */
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // Can be called from Server Components where cookies are read-only.
                    // Route Handlers and middleware handle the write path.
                }
            },
        },
    });
}
