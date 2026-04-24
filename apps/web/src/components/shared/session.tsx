"use client";

import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const TOKEN_KEY = "abo-al-abed-token";
const USER_KEY = "abo-al-abed-user";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    const storedUser = window.localStorage.getItem(USER_KEY);
    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(JSON.parse(storedUser) as SessionUser);
    setLoading(false);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      token,
      user,
      loading,
      async login(email: string, password: string) {
        const payload = await apiRequest<{ accessToken: string; user: SessionUser }>(
          "/auth/login",
          {
            method: "POST",
            body: JSON.stringify({ email, password }),
          },
        );

        window.localStorage.setItem(TOKEN_KEY, payload.accessToken);
        window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
        setToken(payload.accessToken);
        setUser(payload.user);
        startTransition(() => {
          router.push(payload.user.roles.includes("super_admin") || payload.user.roles.includes("ops_manager") ? "/admin" : "/ops");
        });
        return payload.user;
      },
      logout() {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
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
