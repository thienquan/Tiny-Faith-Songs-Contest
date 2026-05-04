import { NextResponse } from 'next/server';

function isVietnamesePreferred(acceptLanguage = '') {
  return acceptLanguage
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .some((lang) => lang.startsWith('vi'));
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // For Vietnamese browsers, make root URL explicit as /vi.
  // But respect explicit user preference stored in cookie (set by i18n-context).
  if (pathname === '/') {
    const cookieLocale = request.cookies.get('tfs-locale')?.value;
    // If user has explicitly chosen a locale, respect it — no server redirect.
    if (cookieLocale === 'en') return NextResponse.next();
    if (cookieLocale === 'vi') {
      const url = request.nextUrl.clone();
      url.pathname = '/vi';
      const response = NextResponse.redirect(url);
      response.headers.set('Location', `/vi${url.search || ''}`);
      return response;
    }
    // No saved preference — fall back to Accept-Language detection (first visit).
    const acceptLanguage = request.headers.get('accept-language') || '';
    if (isVietnamesePreferred(acceptLanguage)) {
      const url = request.nextUrl.clone();
      url.pathname = '/vi';
      const response = NextResponse.redirect(url);
      response.headers.set('Location', `/vi${url.search || ''}`);
      return response;
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
