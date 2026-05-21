import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_COOKIE_KEY = "abo_al_abed_token";

function panelMode() {
  return (process.env.PANEL_MODE ?? process.env.NEXT_PUBLIC_PANEL_MODE ?? "unified").toLowerCase();
}

function defaultDashboardPath(mode: string) {
  if (mode === "admin") return "/admin";
  if (mode === "kitchen") return "/kitchen";
  return "/admin";
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const mode = panelMode();
  const token = request.cookies.get(TOKEN_COOKIE_KEY)?.value;

  const isAdminRoute = pathname.startsWith("/admin");
  const isKitchenRoute = pathname.startsWith("/kitchen");
  const isProtected = isAdminRoute || isKitchenRoute;

  if (mode === "admin" && isKitchenRoute) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (mode === "kitchen" && isAdminRoute) {
    return NextResponse.redirect(new URL("/kitchen", request.url));
  }

  if (!token && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (token && pathname === "/login" && mode !== "unified") {
    return NextResponse.redirect(new URL(defaultDashboardPath(mode), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/kitchen/:path*"],
};
