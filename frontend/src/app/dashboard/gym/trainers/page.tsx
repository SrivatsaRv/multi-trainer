"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { TrainerList } from "@/components/gym/trainer-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function GymTrainersPage() {
    const { user, profile, token } = useAuth();
    const router = useRouter();
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== "GYM_ADMIN") {
            router.push("/dashboard");
            return;
        }
        if (profile?.id) {
            fetchTrainers();
        }
    }, [user, profile]);

    const fetchTrainers = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gyms/${profile?.id}/trainers`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setTrainers(data);
            }
        } catch (error) {
            console.error("Failed to fetch trainers", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (email: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gyms/${profile?.id}/trainers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Failed to invite");
        }

        // Refresh list
        fetchTrainers();
    };

    if (loading) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="mb-4 text-zinc-400 hover:text-white pl-0"
                    onClick={() => router.push("/dashboard")}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold">Manage Trainers</h1>
                <p className="text-zinc-400">View and manage your gym's trainer roster.</p>
            </div>

            <TrainerList trainers={trainers} onInvite={handleInvite} />
        </div>
    );
}
