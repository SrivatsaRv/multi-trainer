import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// Drizzle imports removed

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const baseUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                // Ensure we have a full URL for server-side fetch
                const apiUrl = baseUrl.startsWith("http") ? baseUrl : `http://localhost:8000${baseUrl}`;
                const endpoint = apiUrl.endsWith("/api/v1") ? apiUrl : `${apiUrl}/api/v1`;

                try {
                    console.log(`[Auth] Attempting login for ${credentials.email} to ${endpoint}`);
                    const res = await fetch(`${endpoint}/auth/access-token`, {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            username: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    console.log(`[Auth] Token response status: ${res.status}`);

                    if (!res.ok) {
                        const errorText = await res.text();
                        console.error(`[Auth] Token fetch failed: ${errorText}`);
                        return null;
                    }

                    const data = await res.json();
                    console.log("[Auth] Token received, fetching user details...");

                    // Decode JWT or fetch user profile if needed. 
                    const meRes = await fetch(`${endpoint}/users/me`, {
                        headers: { Authorization: `Bearer ${data.access_token}` },
                    });

                    console.log(`[Auth] /users/me response status: ${meRes.status}`);

                    if (!meRes.ok) {
                        const errorText = await meRes.text();
                        console.error(`[Auth] /users/me failed: ${errorText}`);
                        return null;
                    }

                    const userData = await meRes.json();
                    const user = userData.user;
                    console.log(`[Auth] User fetched successfully: ${user.email} (${user.role})`);

                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.full_name,
                        role: user.role,
                        accessToken: data.access_token, // Store token if needed, though session usually handles it
                    };
                } catch (e) {
                    console.error("[Auth] Login Check Exception:", e);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.accessToken = (user as any).accessToken;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                // @ts-ignore
                session.user.role = token.role;
                // @ts-ignore
                session.user.id = token.id as string;
                // @ts-ignore
                (session.user as any).accessToken = token.accessToken;
            }
            return session;
        },
    },
};
