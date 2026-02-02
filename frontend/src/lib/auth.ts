import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// Drizzle imports removed

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/signin",
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

                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/login/access-token`, {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            username: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    if (!res.ok) return null;

                    const data = await res.json();

                    // Decode JWT or fetch user profile if needed. 
                    // For now, assuming the login endpoint returns token.
                    // We might need to fetch /users/me to get the role/id if not in token response.
                    // Let's assume we fetch /users/me with the token.

                    const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/users/me`, {
                        headers: { Authorization: `Bearer ${data.access_token}` },
                    });

                    if (!meRes.ok) return null;

                    const user = await meRes.json();

                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.full_name,
                        role: user.role,
                        accessToken: data.access_token, // Store token if needed, though session usually handles it
                    };
                } catch (e) {
                    console.error("Login Check Failed", e);
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
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.id = token.id as string;
            }
            return session;
        },
    },
};
