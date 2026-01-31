"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, User, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";

export function AppHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<{ email: string } | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            // Decode JWT to get user info (simple base64 decode)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                // Fetch user details if needed, for now just show logged in state
                setUser({ email: "User" });
            } catch (e) {
                localStorage.removeItem("token");
            }
        }
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        setUser(null);
        router.push("/auth/login");
    };

    const isAuthPage = pathname?.startsWith("/auth");

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                    <Dumbbell className="h-6 w-6" />
                    <span className="font-bold">Workout Tracker</span>
                </Link>
                {!isAuthPage && (
                    <div className="flex items-center space-x-2">
                        {user ? (
                            <>
                                <Button variant="ghost" onClick={() => router.push("/profile")}>
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </Button>
                                <Button variant="ghost" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => router.push("/auth/login")}>
                                    Login
                                </Button>
                                <Button asChild>
                                    <Link href="/auth/register">Get Started</Link>
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
