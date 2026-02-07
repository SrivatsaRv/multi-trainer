"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { TrainerList } from "@/components/gym/trainer-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Trainer {
    id: number;
    user_id: number;
    bio: string;
    specializations: string[];
    user?: {
        full_name: string;
        email: string;
    }
}

interface Association {
    trainer: Trainer;
    status: "PENDING" | "ACTIVE" | "REJECTED" | "INVITED";
    updated_at: string;
}

export default function GymTrainersPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [trainers, setTrainers] = useState<Association[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTrainers = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const data = await api.gyms.getTrainers(profile.id.toString());
            setTrainers(data);
        } catch (error) {
            console.error("Failed to fetch trainers", error);
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        if (!user || user.role !== "GYM_ADMIN") {
            router.push("/dashboard");
            return;
        }
        if (profile?.id) {
            fetchTrainers();
        }
    }, [user, profile?.id, router, fetchTrainers]);

    const handleInvite = async (email: string) => {
        if (!profile?.id) return;
        try {
            await api.gyms.inviteTrainer(profile.id.toString(), email);
            toast.success("Invitation sent!");
            fetchTrainers();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to invite";
            toast.error(message);
        }
    };

    const handleStatusUpdate = async (trainerId: number, status: string) => {
        if (!profile?.id) return;
        try {
            await api.gyms.updateTrainerStatus(profile.id.toString(), trainerId.toString(), status);
            toast.success(`Trainer ${status === 'ACTIVE' ? 'approved' : 'rejected'}`);
            fetchTrainers();
        } catch {
            toast.error("Failed to update status");
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="mb-4 text-muted-foreground hover:text-foreground pl-0"
                    onClick={() => router.push("/dashboard")}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold">Manage Trainers</h1>
                <p className="text-muted-foreground">View and manage your gym&apos;s trainer roster.</p>
            </div>

            <TrainerList
                trainers={trainers}
                onInvite={handleInvite}
                onStatusUpdate={handleStatusUpdate}
            />
        </div>
    );
}
