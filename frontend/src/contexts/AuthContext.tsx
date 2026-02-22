"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserInfo } from "@/lib/types/auth";

interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: () => {},
});

async function fetchMe(): Promise<UserInfo | null> {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isDev) {
    headers["X-Dev-Email"] = "admin@localhost";
  } else {
    // Leer el JWT de Cloudflare Access desde la cookie
    const match =
      typeof document !== "undefined"
        ? document.cookie.match(/CF_Authorization=([^;]+)/)
        : null;
    if (match) {
      headers["Authorization"] = `Bearer ${match[1]}`;
    }
  }

  const res = await fetch(`${BASE_URL}/api/auth/me`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(() => {
    const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";
    if (isDev) {
      setUser(null);
      window.location.href = "/login";
    } else {
      const cfUrl = process.env.NEXT_PUBLIC_CF_ACCESS_URL || "";
      window.location.href = `${cfUrl}/cdn-cgi/access/logout`;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
