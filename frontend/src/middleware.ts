import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token
        const isAuth = !!token
        const isAuthPage = req.nextUrl.pathname.startsWith("/auth")

        // If the user is authenticated and tries to access an auth page (login/register),
        // we redirect them to the dashboard. 
        // 
        // NOTE: We don't perform stateful validation here to avoid 
        // expensive pings on every login page load. The 'authorized' callback 
        // below handles the heavy lifting for protected dashboard routes.
        if (isAuthPage && isAuth) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

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
                        const response = await fetch(`${process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'}/api/v1/users/me`, {
                            headers: {
                                Authorization: `Bearer ${token.accessToken}`,
                            },
                        });

                        if (response.status === 401) {
                            console.warn("Middleware: Session revoked. Denying access.");
                            return false;
                        }

                        return response.ok;
                    } catch (e) {
                        console.error("Middleware: Auth verification failed:", e);
                        // Industry standard: Fail closed for high security, 
                        // but here we might want to fail open if the backend is briefly unreachable
                        // to avoid global lockout. However, for "Hardened Revocation", 
                        // failing closed is more consistent with the user's requirements.
                        return false;
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
