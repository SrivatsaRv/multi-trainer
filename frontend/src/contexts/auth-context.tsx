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
    if (status === "loading") return;

    if (status === "authenticated" && session?.user) {
      const accessToken = (session.user as any).accessToken;

      if (accessToken) {
        setAuthToken(accessToken);
        setToken(accessToken);

        // Fetch full user details if needed, or trust session
        // We trust session for id/role, but might need full profile for verification_status
        api.users.me().then(data => {
          setUser(data.user);
          setProfile(data.gym || data.trainer);
          setLoading(false);
        }).catch(err => {
          console.error("Failed to fetch user details", err);
          setLoading(false);
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
  }, [session, status]);


  // Route protection logic
  useEffect(() => {
    if (loading || status === "loading") return;

    const isAuthPage = pathname.startsWith("/auth");
    const isPublicPage = pathname === "/" || pathname.startsWith("/auth");
    const isProtectedPage = !isPublicPage;

    if (user) {
      // Authenticated users should not see landing or auth pages
      if (pathname === "/" || isAuthPage) {
        router.replace("/dashboard");
      }
    } else {
      // Unauthenticated users should not see protected pages
      if (isProtectedPage) {
        router.replace("/auth/login");
      }
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
