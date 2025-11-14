import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers (prevent red flags from browsers/scanners)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://mainnet.base.org https://base-mainnet.g.alchemy.com https://api.onchain.fi"
  );

  // Add headers for social media crawlers and image optimization
  const pathname = request.nextUrl.pathname;

  if (pathname.endsWith('.png') ||
      pathname.endsWith('.webp') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.jpeg')) {
    // CORS headers for social media crawlers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    // Cache control for images
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Help social media crawlers identify as images
    response.headers.set('Content-Type', getContentType(pathname));
  }

  return response;
}

function getContentType(pathname: string): string {
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export const config = {
  matcher: [
    '/icon.png',
    '/splash.webp',
    '/spalsh.webp', // Handle typo in filename
    '/og-hero-1200x630.png',
    '/embed-1200x800.webp',
    '/:path*.png',
    '/:path*.webp',
    '/:path*.jpg',
    '/:path*.jpeg',
  ],
};
