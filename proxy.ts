import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { verifySigned } from '@/lib/auth/cookie';
import { ACTIVE_KID_COOKIE } from '@/lib/auth/activeKid';

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);
const isKidRoute = createRouteMatcher(['/k/(.*)']);
const isApiRoute = createRouteMatcher(['/api/(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  const url = req.nextUrl;
  const cookieValue = req.cookies.get(ACTIVE_KID_COOKIE)?.value;
  const activeKidId = await verifySigned(cookieValue);

  if (cookieValue && !activeKidId) {
    const res = NextResponse.redirect(new URL('/profiles', url));
    res.cookies.delete(ACTIVE_KID_COOKIE);
    return res;
  }

  if (isApiRoute(req)) return;

  if (isKidRoute(req)) {
    if (!activeKidId) return NextResponse.redirect(new URL('/profiles', url));
    const match = url.pathname.match(/^\/k\/([^/]+)/);
    if (!match || match[1] !== activeKidId) {
      return new NextResponse(null, { status: 404 });
    }
    return;
  }

  if (url.pathname === '/pin-verify' || url.pathname.startsWith('/pin-verify/')) {
    if (!activeKidId) return NextResponse.redirect(new URL('/dashboard', url));
    return;
  }

  if (activeKidId) {
    return NextResponse.redirect(new URL('/pin-verify', url));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
