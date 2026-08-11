import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { PERIOD_COOKIE, PERIOD_COOKIE_MAX_AGE, isValidPeriod } from '@/lib/period';

// Pages with a "Month / Year" selector — the selected period should carry
// over between them instead of each one defaulting back to the current month.
const PERIOD_AWARE_PATHS = ['/dashboard', '/commissions', '/hotspot', '/expenses', '/reports'];

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname, searchParams } = request.nextUrl;

  const publicPaths = ['/login', '/api/auth'];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  // Whenever the user views a period-aware page with an explicit ?year=&month=,
  // remember it so navigating to a different page (which links without those
  // params) still opens on the same month instead of resetting.
  if (PERIOD_AWARE_PATHS.includes(pathname)) {
    const year = parseInt(searchParams.get('year') || '', 10);
    const month = parseInt(searchParams.get('month') || '', 10);
    if (isValidPeriod(year, month)) {
      response.cookies.set(PERIOD_COOKIE, `${year}-${month}`, {
        path: '/',
        maxAge: PERIOD_COOKIE_MAX_AGE,
        sameSite: 'lax',
      });
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
