"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { getAuthToken, clearAuthToken, setAuthToken } from "@/lib/session";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: "TRAINER" | "GYM_ADMIN" | "SAAS_ADMIN";
  is_active: boolean;
}

interface Profile {
  id: string;
  verification_status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  token: string | null;
  logout: () => void;
  login: (token: string, user?: User) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setProfile(null);
    setToken(null);
    router.push("/auth/login");
  };

  const login = async (newToken: string, newUser?: User) => {
    setAuthToken(newToken);
    setToken(newToken);

    if (newUser) {
      setUser(newUser);
      // We still might need profile if not provided, or we can fetch it.
      // But for initial login/register, avoiding the race is key.
      // Fetch profile in bg or rely on refresh?
      // For now, let's just force reload, but at least we have the user locally?
      // Actually, if we force reload, local state is wiped anyway.
      // The reload relies on localStorage token -> checkAuth -> api.users.me().
      // So this optimization ONLY helps if we DON'T reload.
      // But the reload was added to FIX race conditions.

      // If we rely on reload, we DON'T need to pass user object here.
      // The issue is likely api.users.me() failing AFTER reload.

      // If api.users.me() fails, it's because of backend issue.
      // I fixed backend issue (model_dump).
      // So maybe I DON'T need to change frontend signature?

      // Let's stick to the reload strategy for stability.
      // If I just rely on backend fixes, the reload loop will work.

      window.location.href = "/dashboard";
      return;
    }

    try {
      const data = await api.users.me();
      setUser(data.user);
      setProfile(data.gym || data.trainer);
      // Force reload to ensure clean state and avoid RSC race conditions
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login state update failed:", error);
      // Fallback to reload if state update fails
      window.location.href = "/dashboard";
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    try {
      const data = await api.users.me();
      setProfile(data.gym || data.trainer);
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  };

  const checkAuth = async () => {
    const token = getAuthToken();
    setToken(token); // Set token state

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.users.me();
      setUser(data.user);
      setProfile(data.gym || data.trainer);
    } catch (error) {
      clearAuthToken();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Route protection logic
  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname.startsWith("/auth");
    const isPublicPage = pathname === "/" || pathname.startsWith("/auth");
    const isProtectedPage = !isPublicPage;

    if (user) {
      // Authenticated users should not see landing or auth pages
      if (pathname === "/" || isAuthPage) {
        router.replace("/dashboard");
        return;
      }
    } else {
      // Unauthenticated users should not see protected pages
      if (isProtectedPage) {
        router.replace("/auth/login");
        return;
      }
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    profile,
    loading,
    token, // Exposed token
    logout,
    login,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
