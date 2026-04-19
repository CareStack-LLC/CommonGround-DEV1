import { NextRequest, NextResponse } from 'next/server';

/**
 * Google OAuth callback handler.
 *
 * Google redirects here with ?code=... after the user grants consent.
 * Both the Gmail inbox flow and the GA4 analytics flow use the same
 * redirect URI (required by Google OAuth — you can only register one
 * per consent), so we disambiguate on the `state` query param:
 *
 *   state=ga4  → bounce to /superadmin/marketing-analytics?ga4_code=…
 *   anything else → bounce to /superadmin/inbox?oauth_code=… (Gmail default)
 *
 * The receiving page POSTs the code to the correct exchange endpoint
 * (/admin/ga4/oauth/callback vs /admin/inbox/oauth/callback) using the
 * admin's auth token, which we don't have here on the server.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const state = request.nextUrl.searchParams.get('state');

  const isGa4 = state === 'ga4';
  const target = new URL(
    isGa4 ? '/superadmin/marketing-analytics' : '/superadmin/inbox',
    request.url,
  );
  const codeParam = isGa4 ? 'ga4_code' : 'oauth_code';
  const errorParam = isGa4 ? 'ga4_error' : 'oauth_error';

  if (error) {
    target.searchParams.set(errorParam, error);
    return NextResponse.redirect(target);
  }

  if (!code) {
    target.searchParams.set(errorParam, 'no_code');
    return NextResponse.redirect(target);
  }

  target.searchParams.set(codeParam, code);
  return NextResponse.redirect(target);
}
