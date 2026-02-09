"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { TrainerList } from "@/components/gym/trainer-list";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X, User as UserIcon } from "lucide-react";
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

interface Application {
    id: number;
    status: string;
    message: string;
    created_at: string;
    trainer: {
        id: number;
        full_name: string;
        email: string;
        bio: string;
    }
}

export default function GymTrainersPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [trainers, setTrainers] = useState<Association[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!profile?.id) {
            console.log("No profile ID found for gym trainers fetch.");
            setLoading(false);
            return;
        }
        console.log("Fetching gym trainers and applications for gym:", profile.id);
        try {
            const [trainersData, appsData] = await Promise.all([
                api.gyms.getTrainers(profile.id.toString()),
                api.gymApplications.listForGym(profile.id.toString())
            ]);
            console.log("Fetched data:", { trainersCount: trainersData.length, appsCount: appsData.length });
            setTrainers(trainersData);
            setApplications(appsData);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("Failed to load trainer roster");
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
            fetchData();
        }
    }, [user, profile?.id, router, fetchData]);

    const handleInvite = async (email: string) => {
        if (!profile?.id) return;
        try {
            await api.gyms.inviteTrainer(profile.id.toString(), email);
            toast.success("Invitation sent!");
            fetchData();
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
            fetchData();
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleApplicationAction = async (appId: number, status: "APPROVED" | "REJECTED") => {
        try {
            await api.gymApplications.updateStatus(appId, status);
            toast.success(`Application ${status.toLowerCase()}`);
            fetchData();
        } catch {
            toast.error("Failed to update application");
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

            {applications.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        Pending Applications
                        <Badge className="bg-yellow-500">{applications.length}</Badge>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {applications.map((app) => (
                            <Card key={app.id} className="border-l-4 border-l-yellow-500">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{app.trainer.full_name}</CardTitle>
                                        <Badge variant="outline">Applicant</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{app.trainer.email}</p>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm mb-4 italic">"{app.message || 'No message provided'}"</p>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => handleApplicationAction(app.id, "APPROVED")}
                                        >
                                            <Check className="w-4 h-4 mr-2" />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="w-full"
                                            onClick={() => handleApplicationAction(app.id, "REJECTED")}
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Reject
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <TrainerList
                trainers={trainers}
                onInvite={handleInvite}
                onStatusUpdate={handleStatusUpdate}
            />
        </div>
    );
}
