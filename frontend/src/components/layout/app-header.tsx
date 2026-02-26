"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, User, Dumbbell, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { decodeToken, getAuthToken, clearAuthToken } from "@/lib/session";
import { useAuth } from "@/contexts/auth-context";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";

export function AppHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, profile, logout } = useAuth();

    const handleLogout = () => {
        logout();
    };

    const isAuthPage = pathname?.startsWith("/auth");

    // Dynamic profile link for quick settings
    const getProfileLink = () => {
        if (user?.role === "TRAINER" && profile?.id) {
            return `/dashboard/trainer/${profile.id}/profile`;
        }
        return "/dashboard/settings";
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="mr-2 md:hidden" aria-label="Toggle Sidebar">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle Sidebar</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[240px] p-0 sm:w-[300px]">
                        <Sidebar className="px-6 py-6 flex-col space-x-0 space-y-1" />
                    </SheetContent>
                </Sheet>
                <Link href="/" className="flex items-center gap-2 font-bold focus-visible:outline-none">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                        M
                    </div>
                    <span className="text-xl text-foreground">MultiTrainer</span>
                </Link>
                {!isAuthPage && (
                    <div className="flex items-center space-x-2">
                        {user ? (
                            <>
                                <Button variant="ghost" asChild>
                                    <Link href={getProfileLink()}>
                                        <User className="mr-2 h-4 w-4" />
                                        Profile
                                    </Link>
                                </Button>
                                <Button variant="ghost" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="ghost" asChild>
                                    <Link href="/auth/login">Login</Link>
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
