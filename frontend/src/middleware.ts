import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const isAuth = !!token
        const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
        const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard")

        if (isAuthPage) {
            if (isAuth) {
                return NextResponse.redirect(new URL("/dashboard", req.url))
            }
            return null
        }

        if (!isAuth && isDashboardPage) {
            let from = req.nextUrl.pathname;
            if (req.nextUrl.search) {
                from += req.nextUrl.search;
            }
            return NextResponse.redirect(
                new URL(`/auth/login?from=${encodeURIComponent(from)}`, req.url)
            );
        }
    },
    {
        callbacks: {
            authorized: async ({ req, token }) => {
                // Simple check: if trying to access dashboard, must have token
                if (req.nextUrl.pathname.startsWith("/dashboard")) {
                    return !!token
                }
                return true
            },
        },
    }
)

export const config = {
    matcher: ["/dashboard/:path*", "/auth/:path*", "/api/trpc/:path*"],
}
