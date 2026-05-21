import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_COOKIE_KEY = "abo_al_abed_token";
const ROLES_COOKIE_KEY = "abo_al_abed_roles";
const ADMIN_ROLES = new Set(["super_admin", "branch_manager", "kitchen_manager", "support_readonly"]);
const KITCHEN_ROLES = new Set(["super_admin", "kitchen_manager", "kitchen_staff", "branch_manager", "cashier"]);

function parseRoleCookie(raw: string | undefined) {
  if (!raw) return [] as string[];
  try {
    return decodeURIComponent(raw)
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function panelMode() {
  return (process.env.PANEL_MODE ?? process.env.NEXT_PUBLIC_PANEL_MODE ?? "unified").toLowerCase();
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const mode = panelMode();
  const token = request.cookies.get(TOKEN_COOKIE_KEY)?.value;
  const roles = parseRoleCookie(request.cookies.get(ROLES_COOKIE_KEY)?.value);
  const hasAdminRole = roles.some((role) => ADMIN_ROLES.has(role));
  const hasKitchenRole = roles.some((role) => KITCHEN_ROLES.has(role));

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

  if (token && isProtected) {
    if (isAdminRoute && !hasAdminRole) {
      if (hasKitchenRole && mode !== "admin") {
        return NextResponse.redirect(new URL("/kitchen", request.url));
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", "/admin");
      return NextResponse.redirect(loginUrl);
    }

    if (isKitchenRoute && !hasKitchenRole) {
      if (hasAdminRole && mode !== "kitchen") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", "/kitchen");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (token && pathname === "/login") {
    if (mode === "admin") {
      if (!hasAdminRole) return NextResponse.next();
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (mode === "kitchen") {
      if (!hasKitchenRole) return NextResponse.next();
      return NextResponse.redirect(new URL("/kitchen", request.url));
    }
    if (hasAdminRole) return NextResponse.redirect(new URL("/admin", request.url));
    if (hasKitchenRole) return NextResponse.redirect(new URL("/kitchen", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/kitchen/:path*"],
};
