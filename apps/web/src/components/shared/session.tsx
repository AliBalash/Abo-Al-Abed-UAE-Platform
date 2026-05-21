"use client";

import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

type SessionUser = {
  id: string;
  email: string;
  roles: string[];
  customerProfile?: { firstName?: string; lastName?: string } | null;
  staffProfile?: { firstName?: string; lastName?: string; primaryBranch?: { id: string; code: string; nameEn: string } | null } | null;
};

type SessionContextValue = {
  token: string | null;
  user: SessionUser | null;
  login: (email: string, password: string, redirectTo?: string | null) => Promise<SessionUser>;
  logout: () => void;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const TOKEN_KEY = "abo-al-abed-token";
const USER_KEY = "abo-al-abed-user";
const TOKEN_COOKIE_KEY = "abo_al_abed_token";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const found = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : null;
}

function setAuthCookie(token: string) {
  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Max-Age=${7 * 24 * 60 * 60}; Path=/; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = `${TOKEN_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY) || readCookie(TOKEN_COOKIE_KEY);
    const storedUser = window.localStorage.getItem(USER_KEY);
    if (storedToken) {
      setToken(storedToken);
      setAuthCookie(storedToken);
      window.localStorage.setItem(TOKEN_KEY, storedToken);
    }
    if (storedUser) setUser(JSON.parse(storedUser) as SessionUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    const protectedRoute = pathname.startsWith("/admin") || pathname.startsWith("/kitchen");
    if (!token && protectedRoute) {
      startTransition(() => router.replace("/login"));
    }
  }, [loading, pathname, router, token]);

  const value = useMemo<SessionContextValue>(
    () => ({
      token,
      user,
      loading,
      async login(email: string, password: string, redirectTo?: string | null) {
        const payload = await apiRequest<{ accessToken: string; user: SessionUser }>(
          "/auth/login",
          {
            method: "POST",
            body: JSON.stringify({ email, password }),
          },
        );

        window.localStorage.setItem(TOKEN_KEY, payload.accessToken);
        window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
        setAuthCookie(payload.accessToken);
        setToken(payload.accessToken);
        setUser(payload.user);
        const panelMode = (process.env.NEXT_PUBLIC_PANEL_MODE ?? "unified").toLowerCase();
        startTransition(() => {
          if (redirectTo && redirectTo.startsWith("/")) {
            router.push(redirectTo);
            return;
          }
          if (panelMode === "admin") {
            router.push("/admin");
            return;
          }
          if (panelMode === "kitchen") {
            router.push("/kitchen");
            return;
          }
          router.push(payload.user.roles.includes("super_admin") || payload.user.roles.includes("kitchen_manager") ? "/admin" : "/kitchen");
        });
        return payload.user;
      },
      logout() {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
        clearAuthCookie();
        setToken(null);
        setUser(null);
        startTransition(() => router.push("/login"));
      },
    }),
    [loading, router, token, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("SessionProvider is required");
  }
  return context;
}
