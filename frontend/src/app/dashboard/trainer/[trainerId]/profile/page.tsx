"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { User, Mail, Award, Star, Loader2, Plus, Trash2, Building, MapPin, Search, Settings as SettingsIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TrainerProfileForm } from "@/components/dashboard/trainer-profile-form";

const POPULAR_SPECIALIZATIONS = [
    "Weightlifting", "Yoga", "HIIT", "Nutrition", "Pilates",
    "CrossFit", "Calisthenics", "Rehabilitation", "Senior Fitness", "Boxing"
];

const POPULAR_CERTS = [
    "ACE CPT", "NASM CPT", "ISSA CPT", "Precision Nutrition L1", "CrossFit L1"
];

import React from "react"

export default function TrainerProfilePage({ params }: { params: Promise<{ trainerId: string }> }) {
    const resolvedParams = React.use(params)
    const trainerId = resolvedParams.trainerId
    const { user, profile: contextProfile } = useAuth();
    const router = useRouter();
    const [localProfile, setLocalProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true)

    // Data States
    const [trainerGyms, setTrainerGyms] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                // Public fetch - no owner checks for basic display
                const fetchPromises: Promise<any>[] = [
                    api.trainers.get(trainerId),
                    api.trainers.getGyms(trainerId),
                    api.certificates.list() // TODO: In a real app, this should be a public endpoint /trainers/{id}/certificates
                ];

                const results = await Promise.allSettled(fetchPromises);

                const profRes = results[0];
                const gymsRes = results[1];
                const certsRes = results[2];

                if (profRes?.status === 'fulfilled') setLocalProfile(profRes.value);
                if (gymsRes?.status === 'fulfilled') setTrainerGyms(gymsRes.value);

                // We shouldn't fail the whole page if certs fail (e.g. if it hits a private endpoint by mistake)
                if (certsRes?.status === 'fulfilled') {
                    setCertificates(certsRes.value);
                }
            } catch (err) {
                console.error("Failed to fetch profile data:", err);
            } finally {
                setLoading(false);
            }
        }
        if (trainerId) fetchData();
    }, [trainerId]);

    const profile = localProfile || contextProfile;
    const isOwner = user?.id && profile?.user_id && (Number(user.id) === Number(profile.user_id) || user.role === 'SAAS_ADMIN');

    if (!user || (loading && !profile)) return <div className="flex justify-center p-12 min-h-[50vh] items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!profile) return <div className="p-8 text-center text-muted-foreground">Profile not found.</div>;



    return (
        <div className="space-y-6 pb-24 md:pb-10 w-full px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trainer Qualifications</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-muted-foreground">Digital business card & certifications</p>
                        <Badge variant={profile.verification_status === 'APPROVED' ? 'default' : 'secondary'} className="text-[10px] px-2 h-5">
                            {profile.verification_status}
                        </Badge>
                    </div>
                </div>
                {isOwner && (
                    <Button onClick={() => router.push(`/dashboard/settings?tab=profile`)}>
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        Edit Settings
                    </Button>
                )}
            </div>

            {/* Main Content Grid via Unified Form */}
            <TrainerProfileForm
                trainerId={trainerId}
                initialProfile={profile}
                initialCertificates={certificates}
                user={{
                    full_name: profile.user?.full_name || "Trainer",
                    email: profile.user?.email || "trainer@multitrainer.app"
                }}
                onUpdate={() => { }}
                onCertChange={() => { }}
                readOnly={true} // Strictly read-only for public view
            />

            {/* Gym Associations Section - Public Visibility */}
            <Card className="border-primary/20 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                    <div>
                        <CardTitle className="text-xl">Associated Gyms</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Gyms where this trainer is currently active.
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {trainerGyms.filter(tg => tg.status === 'ACTIVE').map((tg) => (
                                <div key={tg.id} className="flex flex-col gap-3 p-4 border rounded-xl bg-card shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                                            <Building className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{tg.gym.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                                    ACTIVE
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t mt-1">
                                        <span>Serving clients at this location</span>
                                    </div>
                                </div>
                            ))}
                            {trainerGyms.filter(tg => tg.status === 'ACTIVE').length === 0 && (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-muted-foreground mb-4">
                                        This trainer represents themself independently.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ClockLoader({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
