import { NextResponse } from 'next/server';

function isVietnamesePreferred(acceptLanguage = '') {
  return acceptLanguage
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .some((lang) => lang.startsWith('vi'));
}

// Use relative Location header so the redirect works correctly behind
// reverse proxies (Nginx) that forward to localhost:3000 internally.
function redirectToVi(request) {
  const response = NextResponse.redirect(new URL('/vi', request.url));
  response.headers.set('Location', '/vi');
  return response;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only handle root path. Locale rewrites (/vi -> /) are in next.config.js
  // to avoid middleware rewrite loops that cause HTTP 500.
  if (pathname !== '/') return NextResponse.next();

  const cookieLocale = request.cookies.get('tfs-locale')?.value;
  if (cookieLocale === 'vi') return redirectToVi(request);
  if (cookieLocale === 'en') return NextResponse.next();

  // No saved preference — detect from browser Accept-Language (first visit).
  const acceptLanguage = request.headers.get('accept-language') || '';
  if (isVietnamesePreferred(acceptLanguage)) return redirectToVi(request);

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
