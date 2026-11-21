import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { PERIOD_COOKIE, PERIOD_COOKIE_MAX_AGE, isValidPeriod } from '@/lib/period';
import { safeCallbackUrl } from '@/lib/auth-redirect';

// Pages with a "Month / Year" selector — the selected period should carry
// over between them instead of each one defaulting back to the current month.
const PERIOD_AWARE_PATHS = ['/monthly', '/commissions', '/hotspot', '/expenses', '/reports', '/partners'];

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // NextAuth writes `__Secure-next-auth.session-token` when the site is served
  // over HTTPS and `next-auth.session-token` otherwise. getToken only guesses
  // the prefix from NEXTAUTH_URL, so on a host where that is unset or still
  // points at http (a common deploy slip) it reads the wrong cookie name,
  // returns null for a signed-in user, and bounces them back to /login forever.
  const secureCookie =
    request.nextUrl.protocol === 'https:' ||
    (process.env.NEXTAUTH_URL?.startsWith('https://') ?? false);

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie,
  });

  const isLoginPath = pathname === '/login' || pathname.startsWith('/login/');

  // Already signed in and staring at the login form: send them where they were
  // originally headed, or to the dashboard.
  if (token && isLoginPath) {
    const target = safeCallbackUrl(searchParams.get('callbackUrl'));
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (isLoginPath || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (!token) {
    const url = new URL('/login', request.url);
    // `searchParams.set` encodes the value itself — encoding it again here
    // produced double-escaped callbacks like `%252Freports`.
    url.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  // Whenever the user views a period-aware page with an explicit ?year=&month=,
  // remember it so navigating to a different page (which links without those
  // params) still opens on the same month instead of resetting.
  if (PERIOD_AWARE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    const year = parseInt(searchParams.get('year') || '', 10);
    const month = parseInt(searchParams.get('month') || '', 10);
    if (isValidPeriod(year, month)) {
      response.cookies.set(PERIOD_COOKIE, `${year}-${month}`, {
        path: '/',
        maxAge: PERIOD_COOKIE_MAX_AGE,
        sameSite: 'lax',
      });
      request.cookies.set(PERIOD_COOKIE, `${year}-${month}`);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every route except:
     * - `_next/static` / `_next/image` — build output
     * - `api/auth` — NextAuth's own endpoints must stay reachable
     * - anything containing a dot — files served from `public/` live at the
     *   root (`/logo.png`, `/favicon-16.png`), so the previous `public`
     *   exclusion never matched and every image was redirected to /login.
     */
    '/((?!_next/static|_next/image|api/auth|.*\\..*).*)',
  ],
};
