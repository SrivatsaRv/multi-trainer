"use client";

import { useAuth } from "@/contexts/auth-context";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

const NO_LAYOUT_PATHS = ["/dashboard", "/admin", "/profile", "/auth"];

export function PageLayout({ children }: { children: React.ReactNode }) {
    const { loading } = useAuth();
    const pathname = usePathname();
    const showNav = !NO_LAYOUT_PATHS.some(path => pathname.startsWith(path));

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <Loader2 className="animate-spin mr-2" /> Loading...
            </div>
        );
    }

    if (!showNav) return <>{children}</>;

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}
