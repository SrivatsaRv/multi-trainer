import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    async function middleware(req) {
        const _token = req.nextauth.token

        // Industry Standard: Middleware should handle PROTECTION (authorized).
        // Application logic (Layouts/Pages) or AuthProvider should handle 
        // redirecting authenticated users away from /auth/login.
        // Doing it here causes loops when a session is revoked but the JWT still exists.

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: async ({ req, token }) => {
                const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard")

                if (isDashboardPage) {
                    if (!token) return false

                    // Stateful Backend Revalidation
                    // We verify the token against the DB session store.
                    try {
                        const backendUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                        const url = backendUrl.startsWith('http') ? backendUrl : `http://localhost:8000${backendUrl}`;
                        const endpoint = url.endsWith('/api/v1') ? url : `${url}/api/v1`;

                        const response = await fetch(`${endpoint}/users/me`, {
                            headers: {
                                Authorization: `Bearer ${token.accessToken}`,
                            },
                        });

                        if (response.status === 401) {
                            console.warn("Middleware: Session revoked. Denying access.");
                            return false;
                        }

                        // We only care about explicit revocation (401).
                        // If backend is returning 500s or is briefly unreachable, we fail open.
                        return response.status !== 401;
                    } catch (e) {
                        console.error("Middleware: Auth verification fetch failed (Network/DNS). Failing open:", e);
                        // Industry standard: Constraint-First Logic.
                        // Failing closed here on a network error (e.g., DNS failure for backend:8000 locally) 
                        // creates an infinite redirect loop because the valid JWT still exists.
                        // We fail open and rely on the client-side data-fetcher to catch 401s and enact logout.
                        return true;
                    }
                }

                return true
            },
        },
    }
)

export const config = {
    matcher: ["/dashboard/:path*", "/auth/:path*"],
}
