import { NextResponse } from 'next/server';

function isVietnamesePreferred(acceptLanguage = '') {
  return acceptLanguage
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .some((lang) => lang.startsWith('vi'));
}

function buildPublicOrigin(request) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');

  const proto = forwardedProto || request.nextUrl.protocol.replace(':', '') || 'https';
  const hostname = (forwardedHost || host || request.nextUrl.host || '').split(',')[0].trim();

  if (!hostname) return null;
  return `${proto}://${hostname}`;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // For Vietnamese browsers, make root URL explicit as /vi.
  if (pathname === '/') {
    const acceptLanguage = request.headers.get('accept-language') || '';
    if (isVietnamesePreferred(acceptLanguage)) {
      const publicOrigin = buildPublicOrigin(request);
      const url = request.nextUrl.clone();
      if (publicOrigin) {
        const nextUrl = new URL('/vi', publicOrigin);
        nextUrl.search = url.search;
        return NextResponse.redirect(nextUrl);
      }
      url.pathname = '/vi';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Rewrite locale-prefixed routes to existing app routes.
  if (pathname === '/vi' || pathname.startsWith('/vi/') || pathname === '/en' || pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/(vi|en)(?=\/|$)/i, '') || '/';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
