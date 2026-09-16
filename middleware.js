import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

const ALLOWED_EMAILS = [
  'liran@incubatorlab.ai',
  'karen.hardwick@resilia.shop',
  'deric@resilia.shop',
  'deric@incubatorlab.ai',
  'ilanmussaffi@gmail.com',
  'ilan@incubatorlab.ai',
  'zaydpe@gmail.com',
  'zaydzayd@resilia.shop',
  'moises@incubatorlab.ai',
  'jsack010@gmail.com',
  'johnathan@resilia.shop',
  'karenhardwick@incubatorlab.ai',
  'zara@incubatorlab.ai',
  'farwa@incubatorlab.ai',
  'david@incubatorlab.ai',
  'will@resilia.shop',
  'kacie@resilia.shop',
  'ezra@incubatorlab.ai',
  'ezra@resilia.shop',
  'mia.leitch@resilia.shop',
  'lucas.correia@resilia.shop',
  'oliver.hybholt@resilia.shop',
  'marco.fernandez.delaorden@gmail.com',
  'abdullah.sakhi@resilia.shop',
];

export async function middleware(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!token.email || !ALLOWED_EMAILS.includes(token.email)) {
    const loginUrl = new URL('/login?error=AccessDenied', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
