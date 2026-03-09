"use client";

import { useAuth } from "@/contexts/auth-context";
import { GymDashboard } from "@/components/dashboard/gym-dashboard";
import { TrainerDashboard } from "@/components/dashboard/trainer-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default function Dashboard() {
    const { user } = useAuth();

    if (!user) return null; // Auth context handles redirect

    const isGym = user.role === "GYM_ADMIN";
    const isTrainer = user.role === "TRAINER";
    const isAdmin = user.role === "SAAS_ADMIN";

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, {user.full_name}
                    </p>
                </div>
            </div>

            {/* Role-specific dashboard content */}
            {isGym && <GymDashboard />}
            {isTrainer && <TrainerDashboard />}
            {isAdmin && <AdminDashboard />}
        </div>
    );
}
