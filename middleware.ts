import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get('ftp_session')?.value;

  if (req.nextUrl.pathname.startsWith('/files/')) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/ftp', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/files/:path*'],
};