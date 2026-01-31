"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dumbbell, LogOut, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { isAuthenticated, clearAuthToken } from "@/lib/session";

export function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        setIsLoggedIn(isAuthenticated());
    }, [pathname]);

    const handleLogout = () => {
        clearAuthToken();
        setIsLoggedIn(false);
        router.push("/auth/login");
    };

    return (
        <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-2 font-bold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                        M
                    </div>
                    <span className="text-xl text-foreground">MultiTrainer</span>
                </div>

                <nav className="hidden md:flex gap-8">
                    <Link
                        href="#gyms"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        For Gyms
                    </Link>
                    <Link
                        href="#trainers"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        For Trainers
                    </Link>
                </nav>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" asChild className="text-sm">
                        <Link href="/auth/login">
                            Log in
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/auth/register">
                            Get Started
                        </Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
