"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If user is authenticated, redirect to dashboard
        if (user) {
            router.replace("/dashboard");
        }
    }, [user, router]);

    // If user is authenticated, don't render anything (redirect handles it)
    if (user) {
        return null;
    }

    // Original landing page content for unauthenticated users
    return (
        <div className="flex flex-col bg-black text-white selection:bg-zinc-800">
            {/* Landing page content remains the same */}
        </div>
    );
}
