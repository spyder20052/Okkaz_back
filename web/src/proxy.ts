import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const role = request.cookies.get("okkaz_session_role")?.value;
  const { pathname, search } = request.nextUrl;
  const isAdmin = role === "ADMIN";
  const isSeller = role === "SELLER" || role === "SELLER_PRO" || isAdmin;

  if ((pathname.startsWith("/admin") && !isAdmin) || (pathname.startsWith("/vendeur") && !isSeller)) {
    const loginUrl = new URL("/connexion", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/vendeur/:path*"],
};
