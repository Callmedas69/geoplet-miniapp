import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

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
    '/og-image.png',
    '/icon.webp',
    '/splash.webp',
    '/spalsh.webp', // Handle typo in filename
    '/:path*.png',
    '/:path*.webp',
    '/:path*.jpg',
    '/:path*.jpeg',
  ],
};
