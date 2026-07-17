"use client";

// Contexte d'authentification global.
// Source de vérité: localStorage (clé okkaz_auth) + événement okkaz-auth-updated,
// même pattern que platformEvents.ts / searchRequests.ts.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, AUTH_UPDATED_EVENT, readAuth, writeAuth } from "./api";
import type { ApiUser, UserRole } from "./types";

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: "BUYER" | "SELLER";
}

interface AuthContextValue {
  user: ApiUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<ApiUser>;
  register: (input: RegisterInput) => Promise<ApiUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthPayload {
  user: ApiUser;
  tokens: { accessToken: string; refreshToken: string };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sync = () => setUser(readAuth()?.user ?? null);
    sync();
    setIsLoading(false);
    window.addEventListener(AUTH_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const isEmail = identifier.includes("@");
    const body = isEmail
      ? { email: identifier.trim().toLowerCase(), password }
      : { phone: identifier.trim(), password };
    const res = await api.post<AuthPayload>("/auth/login", body, false);
    writeAuth({ user: res.data.user, tokens: res.data.tokens });
    return res.data.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.post<AuthPayload>("/auth/register", input, false);
    writeAuth({ user: res.data.user, tokens: res.data.tokens });
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    const stored = readAuth();
    if (stored?.tokens?.refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken: stored.tokens.refreshToken });
      } catch {
        // La session locale est purgée même si l'appel échoue.
      }
    }
    writeAuth(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = readAuth();
    if (!stored) return;
    try {
      const res = await api.get<{ user: ApiUser }>("/users/me");
      writeAuth({ user: res.data.user, tokens: stored.tokens });
    } catch {
      // Token invalide → readAuth/writeAuth gèrent la purge via apiFetch.
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}

// Garde d'accès simple côté client pour /vendeur* et /admin*.
export function useRequireRole(roles: UserRole[]): {
  user: ApiUser | null;
  isAllowed: boolean;
  isLoading: boolean;
} {
  const { user, isLoading } = useAuth();
  const isAllowed = !!user && roles.includes(user.role);
  return { user, isAllowed, isLoading };
}
