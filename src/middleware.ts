import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PAGES = ["/dashboard", "/preferences", "/onboarding"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ochrana pouze stránek (ne API — ty mají vlastní auth check)
  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname.startsWith(p));
  if (!isProtectedPage) return NextResponse.next();

  // Zkontroluj session cookie od NextAuth v5
  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/preferences/:path*", "/onboarding/:path*"],
};
