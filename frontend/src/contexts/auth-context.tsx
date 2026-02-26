"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { getAuthToken, clearAuthToken, setAuthToken } from "@/lib/session";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";

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
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    clearAuthToken();
    setUser(null);
    setProfile(null);
    setToken(null);
    await nextAuthSignOut({ callbackUrl: "/auth/login" });
  };

  const login = async (newToken: string, newUser?: User) => {
    // This is now mostly a no-op because NextAuth handles session
    // But we might keep it for manual overrides if needed
    setAuthToken(newToken);
    setToken(newToken);
    if (newUser) setUser(newUser);
    window.location.href = "/dashboard";
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const data = await api.users.me();
      setProfile(data.gym || data.trainer);
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  };

  // Sync session with local state
  useEffect(() => {
    if (status === "loading" || (status === "authenticated" && user)) return;

    if (status === "authenticated" && session?.user) {
      const accessToken = (session.user as any).accessToken;
      const isAuthPage = pathname.startsWith("/auth");

      if (accessToken) {
        setAuthToken(accessToken);
        setToken(accessToken);

        // If we are on an auth page, and we just had a session error, 
        // don't immediately try to fetch /me again.
        if (isAuthPage && pathname.includes("session_expired")) {
          setLoading(false);
          return;
        }

        api.users.me().then(data => {
          setUser(data.user);
          setProfile(data.gym || data.trainer);
          setLoading(false);
        }).catch(err => {
          console.error("Failed to fetch user details", err);
          // If 401, the fetcher will calling signOut(), 
          // but we should stop loading here.
          setLoading(false);
          setUser(null);
        });
      } else {
        setLoading(false);
      }
    } else if (status === "unauthenticated") {
      setUser(null);
      setProfile(null);
      setToken(null);
      clearAuthToken();
      setLoading(false);
    }
  }, [session, status, pathname, user]);


  // Route protection logic
  useEffect(() => {
    if (loading || status === "loading") return;

    // Isolate pure auth entry pages, distinct from /auth/onboarding
    const isAuthEntryPage = pathname === "/auth/login" || pathname === "/auth/register";
    // Define base public access rules (handles password resets, etc later)
    const isPublicPage = pathname === "/" || pathname.startsWith("/auth");
    const isProtectedPage = !isPublicPage;

    if (user) {
      if (isAuthEntryPage || pathname === "/") {
        router.replace("/dashboard");
      }
    } else if (isProtectedPage) {
      router.replace("/auth/login");
    }
  }, [user, loading, status, pathname, router]);

  const value = {
    user,
    profile,
    loading: loading || status === "loading",
    token,
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
