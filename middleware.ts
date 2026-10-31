import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Protect /host/* (except /host/login) and /screen/*: requires operator session
  const isHostProtected =
    (pathname.startsWith('/host') && pathname !== '/host/login') ||
    pathname.startsWith('/screen');

  if (!isHostProtected) {
    return response;
  }

  // 1. Check for hardcoded operator session cookie
  const operatorCookie = request.cookies.get('operator_session');
  if (operatorCookie?.value === '1') {
    return response;
  }

  // 2. Check Supabase Auth user if Supabase is configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (url && anonKey) {
    try {
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isAnonymous = user?.is_anonymous ?? true;
      if (user && !isAnonymous) {
        return response;
      }
    } catch {
      // Ignore auth fetch errors and redirect to login
    }
  }

  const loginUrl = new URL('/host/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/host/:path*', '/screen/:path*'],
};
