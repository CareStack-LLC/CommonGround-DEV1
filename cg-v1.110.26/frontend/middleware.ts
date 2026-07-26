/**
 * Edge middleware — refreshes the Supabase SSR session on each request so the
 * server always sees a valid session cookie (Supabase's recommended pattern).
 *
 * NOTE the `matcher` at the bottom deliberately EXCLUDES static assets AND the
 * public marketing/auth pages (/, /features, /pricing, /login, …). Those are
 * excluded to avoid the ~200ms `getUser()` round-trip on first paint — their
 * auth state is resolved client-side by AuthProvider instead. If you add a new
 * page that needs the server-side session, make sure it isn't excluded here.
 *
 * Runs in the EDGE runtime: use Web APIs only (fetch, crypto, btoa) — Node
 * globals like `Buffer` are undefined here and will throw on every request.
 *
 * (A per-request nonce-based CSP was attempted here and reverted — Next 16's
 * App Router requires nonce+dynamic-rendering to drop script-src 'unsafe-inline',
 * which crashed the Edge runtime and forced app-wide dynamic rendering. The
 * static CSP lives in next.config.ts; the real XSS sink is closed by DOMPurify
 * in lib/sanitize.ts.)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Skip Supabase session refresh if env vars are missing (local dev without Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - this sets the cookies correctly
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public marketing pages (/, /features, /pricing, /about, /help/contact, /blog, /professionals)
     *   are excluded to avoid the ~200ms Supabase getUser() latency on first paint.
     *   Auth state for those pages is handled client-side by AuthProvider.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$)(?!$)(?!features$|pricing$|about$|contact$|help/contact$|blog$|professionals$|auth/callback|auth/sync|login$|register$|forgot-password$|reset-password$).*)',
  ],
}
