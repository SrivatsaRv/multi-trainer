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
import { User, Mail, Award, Star, Loader2, Plus, Trash2, Building, MapPin, Search } from "lucide-react";
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
    const [allGyms, setAllGyms] = useState<any[]>([]);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [applications, setApplications] = useState<any[]>([]);

    // UI States
    const [showJoinFlow, setShowJoinFlow] = useState(false);
    const [applying, setApplying] = useState<number | null>(null);
    const [isEditingSpecs, setIsEditingSpecs] = useState(false);
    const [saving, setSaving] = useState(false);

    // Certificate Form
    const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
    const [newCert, setNewCert] = useState({ name: "", issuing_organization: "", issue_date: "" });
    const [addingCert, setAddingCert] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const isPotentiallyOwner = user?.id && trainerId && (Number(user.id) === Number(trainerId) || user.role === 'SAAS_ADMIN');

                const fetchPromises: Promise<any>[] = [
                    api.trainers.get(trainerId),
                    api.trainers.getGyms(trainerId),
                    api.gyms.listAll(),
                ];

                if (isPotentiallyOwner) {
                    fetchPromises.push(api.certificates.list());
                    fetchPromises.push(api.gymApplications.list());
                }

                const results = await Promise.allSettled(fetchPromises);

                const profRes = results[0];
                const gymsRes = results[1];
                const allRes = results[2];
                const certsRes = isPotentiallyOwner ? results[3] : null;
                const appsRes = isPotentiallyOwner ? results[4] : null;

                if (profRes?.status === 'fulfilled') setLocalProfile(profRes.value);
                if (gymsRes?.status === 'fulfilled') setTrainerGyms(gymsRes.value);
                if (allRes?.status === 'fulfilled') setAllGyms(allRes.value);

                if (isPotentiallyOwner) {
                    if (certsRes?.status === 'fulfilled') setCertificates(certsRes.value);
                    if (appsRes?.status === 'fulfilled') setApplications(appsRes.value);
                }

                // Log failures specifically
                results.forEach((res, i) => {
                    if (res.status === 'rejected') {
                        console.error(`Fetch ${i} failed:`, res.reason);
                    }
                });
            } catch (err) {
                console.error("Failed to fetch profile data:", err);
            } finally {
                setLoading(false);
            }
        }
        if (trainerId) fetchData();
    }, [trainerId, user?.id]);

    const saveProfile = async (updates: any) => {
        setSaving(true);
        try {
            await api.trainers.patch(trainerId, updates);
            setLocalProfile((prev: any) => ({ ...prev, ...updates }));
            toast.success("Profile updated");
        } catch (err) {
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleApply = async (gymId: number) => {
        setApplying(gymId);
        try {
            // Check max 3 gyms limit locally first
            const activeGyms = trainerGyms.filter(g => g.status === 'ACTIVE');
            if (activeGyms.length >= 3) {
                toast.error("You can only join up to 3 gyms.");
                setApplying(null); // Reset applying state
                return;
            }

            // Use new Application API
            await api.gymApplications.create(gymId, "I would like to join your gym as a trainer.");

            // Refresh applications list
            const apps = await api.gymApplications.list();
            setApplications(apps);
            toast.success("Application sent! Waiting for approval.");
        } catch (err: any) {
            // Extract error message if possible
            const msg = err.message || "Failed to send application";
            toast.error(msg);
        } finally {
            setApplying(null);
        }
    };

    const handleAddCertificate = async () => {
        if (!newCert.name || !newCert.issuing_organization || !newCert.issue_date) {
            toast.error("Please fill in all required fields");
            return;
        }
        setAddingCert(true);
        try {
            const created = await api.certificates.create(newCert);
            setCertificates([...certificates, created]);
            setIsCertDialogOpen(false);
            setNewCert({ name: "", issuing_organization: "", issue_date: "" });
            toast.success("Certificate added");
        } catch (err) {
            toast.error("Failed to add certificate");
        } finally {
            setAddingCert(false);
        }
    };

    const handleDeleteCertificate = async (id: number) => {
        try {
            await api.certificates.delete(id);
            setCertificates(certificates.filter(c => c.id !== id));
            toast.success("Certificate removed");
        } catch (err) {
            toast.error("Failed to remove certificate");
        }
    };

    const toggleSpecialization = (spec: string) => {
        const current = localProfile?.specializations || [];
        let updated;
        if (current.includes(spec)) {
            updated = current.filter((s: string) => s !== spec);
        } else {
            if (current.length >= 5) {
                toast.error("Maximum 5 specializations allowed");
                return;
            }
            updated = [...current, spec];
        }
        setLocalProfile((prev: any) => ({ ...prev, specializations: updated }));
    };

    const profile = localProfile || contextProfile;
    const isOwner = user?.id && profile?.user_id && (Number(user.id) === Number(profile.user_id) || user.role === 'SAAS_ADMIN');

    if (!user || (loading && !profile)) return <div className="flex justify-center p-12 min-h-[50vh] items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!profile) return <div className="p-8 text-center text-muted-foreground">Profile not found.</div>;

    const isAssociatedWith = (gymId: number) => trainerGyms.some(tg => tg.gym.id === gymId);
    const getApplicationStatus = (gymId: number) => applications.find(a => a.gym_id === gymId)?.status;

    return (
        <div className="space-y-6 pb-24 md:pb-10 w-full px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trainer Profile</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-muted-foreground">Digital business card & qualifications</p>
                        <Badge variant={profile.verification_status === 'APPROVED' ? 'default' : 'secondary'} className="text-[10px] px-2 h-5">
                            {profile.verification_status}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Main Content Grid via Unified Form */}
            <TrainerProfileForm
                trainerId={trainerId}
                initialProfile={profile}
                initialCertificates={certificates}
                user={{
                    full_name: profile.user?.full_name || "Unknown",
                    email: profile.user?.email || "N/A"
                }}
                onUpdate={(updated: any) => setLocalProfile(updated)}
                onCertChange={(updatedCerts: any[]) => setCertificates(updatedCerts)}
                readOnly={!isOwner}
            />

            {/* Gym Associations Section - Public Visibility */}
            <Card className="border-primary/20 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl">Gym Associations</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {isOwner
                                    ? "Join up to 3 gyms to start training clients."
                                    : `Gyms where ${profile.user?.full_name || "this trainer"} is currently active.`}
                            </p>
                        </div>
                        {isOwner && (
                            <Button
                                variant={showJoinFlow ? "secondary" : "default"}
                                onClick={() => setShowJoinFlow(!showJoinFlow)}
                                size="sm"
                            >
                                {showJoinFlow ? "View My Gyms" : "Join a Gym"}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {!showJoinFlow ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(isOwner ? trainerGyms : trainerGyms.filter(tg => tg.status === 'ACTIVE')).map((tg) => (
                                    <div key={tg.id} className="flex flex-col gap-3 p-4 border rounded-xl bg-card shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                                                <Building className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{tg.gym.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant={tg.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                                        {tg.status}
                                                    </Badge>
                                                    {isOwner && tg.is_compliant === false && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-200 bg-amber-50">
                                                            Action Required
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t mt-1">
                                            {tg.status === 'ACTIVE' ? (
                                                <span>Joined {new Date(tg.accepted_at).toLocaleDateString()}</span>
                                            ) : (
                                                <span>Requested {new Date(tg.requested_at || tg.created_at).toLocaleDateString()}</span>
                                            )}
                                            {isOwner && tg.status === 'PENDING' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                    onClick={async () => {
                                                        const app = applications.find(a => a.gym_id === tg.gym_id);
                                                        if (app) {
                                                            try {
                                                                await api.gymApplications.cancel(app.id);
                                                                setApplications(prev => prev.filter(a => a.id !== app.id));
                                                                setTrainerGyms(prev => prev.filter(g => g.id !== tg.id));
                                                                toast.success("Application withdrawn");
                                                            } catch (e) {
                                                                toast.error("Failed to withdraw");
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                    Withdraw
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {((isOwner ? trainerGyms : trainerGyms.filter(tg => tg.status === 'ACTIVE')).length === 0) && (
                                    <div className="col-span-full text-center py-12">
                                        <p className="text-muted-foreground mb-4">
                                            {isOwner ? "You are not associated with any gym." : "This trainer is not currently associated with any gym."}
                                        </p>
                                        {isOwner && <Button onClick={() => setShowJoinFlow(true)}>Browse Gyms</Button>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 max-w-md">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search gyms..." className="pl-8" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {allGyms.filter(g => !isAssociatedWith(g.id)).map((gym) => {
                                    const appStatus = getApplicationStatus(gym.id);
                                    const isPending = appStatus === 'PENDING';

                                    return (
                                        <div key={gym.id} className="flex flex-col p-4 border rounded-xl bg-card hover:shadow-md transition-shadow group">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <span className="font-bold text-lg">{gym.name[0]}</span>
                                                </div>
                                                {gym.verification_status === 'APPROVED' && (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-100">Verified</Badge>
                                                )}
                                            </div>
                                            <div className="mb-4">
                                                <h3 className="font-semibold truncate">{gym.name}</h3>
                                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    {gym.location}
                                                </div>
                                                {gym.equipment_list && (
                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                        {gym.equipment_list.slice(0, 3).map((eq: string) => (
                                                            <Badge key={eq} variant="secondary" className="text-[9px] px-1 py-0">{eq}</Badge>
                                                        ))}
                                                        {gym.equipment_list.length > 3 && <span className="text-[9px] text-muted-foreground">+{gym.equipment_list.length - 3}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                className="w-full mt-auto"
                                                variant={isPending ? "secondary" : "default"}
                                                disabled={isPending || applying === gym.id}
                                                onClick={() => !isPending && handleApply(gym.id)}
                                            >
                                                {isPending ? "Pending" : (applying === gym.id ? "Applying..." : "Apply to Join")}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
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
