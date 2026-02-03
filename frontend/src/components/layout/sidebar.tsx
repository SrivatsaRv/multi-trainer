"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
    LayoutDashboard,
    Users,
    Calendar,
    Settings,
    LineChart,
    Shield,
    Clock
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
    const pathname = usePathname();
    // For MVP, checking if URL contains 'gym' or 'trainer' might be safer fallback 
    const { user, profile } = useAuth();

    // Extract ID from path if possible, fallback to profile id
    const gymIdMatch = pathname?.match(/\/gym\/(\d+)/);
    const trainerIdMatch = pathname?.match(/\/trainer\/(\d+)/);

    const gymId = gymIdMatch ? gymIdMatch[1] : (user?.role === "GYM_ADMIN" ? profile?.id : null);
    const trainerId = trainerIdMatch ? trainerIdMatch[1] : (user?.role === "TRAINER" ? profile?.id : null);

    let items = [
        {
            title: "Overview",
            href: "/dashboard",
            icon: LayoutDashboard,
        }
    ];

    if (gymId) {
        items = [
            {
                title: "Analytics",
                href: `/dashboard/gym/${gymId}/analytics`,
                icon: LineChart,
            },
            {
                title: "Trainers",
                href: `/dashboard/gym/${gymId}/trainers`,
                icon: Users,
            },
            {
                title: "Bookings",
                href: `/dashboard/gym/${gymId}/bookings`,
                icon: Calendar,
            },
            {
                title: "Settings",
                href: `/dashboard/gym/${gymId}/settings`,
                icon: Settings,
            },
        ];
    } else if (trainerId) {
        items = [
            {
                title: "Schedule",
                href: `/dashboard/trainer/${trainerId}/schedule`,
                icon: Calendar,
            },
            {
                title: "Sessions",
                href: `/dashboard/trainer/${trainerId}/sessions`,
                icon: Users,
            },
            {
                title: "Availability",
                href: `/dashboard/trainer/${trainerId}/availability`,
                icon: Clock,
            },
            {
                title: "Analytics",
                href: `/dashboard/trainer/${trainerId}/analytics`,
                icon: LineChart,
            },
            {
                title: "Profile",
                href: `/dashboard/trainer/${trainerId}/profile`,
                icon: Users,
            },
        ];
    } else if (user?.role === "SAAS_ADMIN") {
        items = [
            {
                title: "Dashboard",
                href: "/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Verifications",
                href: "/dashboard/admin/verifications",
                icon: Shield,
            }
        ];
    } else {
        // Fallback or Root Dashboard
        items = [
            {
                title: "Dashboard",
                href: "/dashboard",
                icon: LayoutDashboard,
            }
        ];
    }

    return (
        <nav className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", className)}>
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        buttonVariants({ variant: "ghost" }),
                        pathname === item.href
                            ? "bg-muted hover:bg-muted"
                            : "hover:bg-transparent hover:underline",
                        "justify-start"
                    )}
                >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                </Link>
            ))}
        </nav>
    );
}
