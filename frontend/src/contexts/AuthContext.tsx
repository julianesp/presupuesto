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

async function fetchMe(
  token: string | null,
  onTokenExpired?: () => void,
): Promise<UserInfo | null> {
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

  // Si el token está expirado (401), llamar al callback
  if (res.status === 401 && onTokenExpired) {
    onTokenExpired();
    return null;
  }

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
      // Limpiar el token cuando el usuario no está autenticado
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("clerk_token");
      }
      return;
    }

    const handleTokenExpired = () => {
      // Limpiar el token expirado
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("clerk_token");
      }
      // Cerrar sesión automáticamente
      signOut();
      setUser(null);
    };

    const updateToken = async () => {
      const token = await getToken();
      // Guardar el token en sessionStorage para que el cliente de API pueda usarlo
      if (typeof window !== "undefined" && token) {
        sessionStorage.setItem("clerk_token", token);
      }
      return token;
    };

    // Actualizar el token inicialmente
    updateToken()
      .then((token) => fetchMe(token, handleTokenExpired))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));

    // Refrescar el token cada 1 minuto para mantenerlo actualizado
    const intervalId = setInterval(() => {
      if (isSignedIn) {
        updateToken()
          .then((token) => fetchMe(token, handleTokenExpired))
          .then((userData) => {
            if (userData) setUser(userData);
          })
          .catch(() => {
            // Ignorar errores silenciosamente
          });
      }
    }, 60 * 1000); // 1 minuto

    return () => clearInterval(intervalId);
  }, [clerkLoaded, isSignedIn, getToken, signOut]);

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
