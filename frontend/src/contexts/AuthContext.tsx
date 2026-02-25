"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";
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

async function fetchMe(token: string | null): Promise<UserInfo | null> {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isDev) {
    headers["X-Dev-Email"] = "admin@localhost";
  } else if (token) {
    // Usar el JWT de Clerk
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/api/auth/me`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, signOut } = useClerkAuth();
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isSignedIn) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    getToken()
      .then((token) => fetchMe(token))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [clerkLoaded, isSignedIn, getToken]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, [signOut]);

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
