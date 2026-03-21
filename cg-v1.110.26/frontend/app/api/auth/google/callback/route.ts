import { NextRequest, NextResponse } from 'next/server';

/**
 * Google OAuth callback handler.
 *
 * Google redirects here with ?code=... after the user grants consent.
 * We redirect to the inbox page with the code as a query param,
 * where the client-side JS can exchange it using the admin's auth token.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  const inboxUrl = new URL('/superadmin/inbox', request.url);

  if (error) {
    inboxUrl.searchParams.set('oauth_error', error);
    return NextResponse.redirect(inboxUrl);
  }

  if (!code) {
    inboxUrl.searchParams.set('oauth_error', 'no_code');
    return NextResponse.redirect(inboxUrl);
  }

  // Pass the code to the frontend to exchange with the admin's auth token
  inboxUrl.searchParams.set('oauth_code', code);
  return NextResponse.redirect(inboxUrl);
}
