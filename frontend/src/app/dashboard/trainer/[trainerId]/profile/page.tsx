"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Award, Star, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function TrainerProfilePage() {
    const { user, profile: contextProfile } = useAuth();
    const router = useRouter();
    const params = useParams();
    const [localProfile, setLocalProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [trainerGyms, setTrainerGyms] = useState<any[]>([]);
    const [allGyms, setAllGyms] = useState<any[]>([]);
    const [showJoinFlow, setShowJoinFlow] = useState(false);
    const [applying, setApplying] = useState<number | null>(null);

    const [isEditingSpecs, setIsEditingSpecs] = useState(false);
    const [isEditingCerts, setIsEditingCerts] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const saveProfile = async (updates: any) => {
        setSaving(true);
        try {
            await api.trainers.patch(params.trainerId as string, updates);
            setLastSaved(new Date());
            toast.success("Profile updated");
        } catch (err) {
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        async function fetchData() {
            try {
                const [prof, gyms, all] = await Promise.all([
                    api.trainers.get(params.trainerId as string),
                    api.trainers.getGyms(params.trainerId as string),
                    api.gyms.listAll()
                ]);
                setLocalProfile(prof);
                setTrainerGyms(gyms);
                setAllGyms(all);
            } catch (err) {
                console.error("Failed to fetch profile data:", err);
            } finally {
                setLoading(false);
            }
        }
        if (params.trainerId) fetchData();
    }, [params.trainerId]);

    const handleApply = async (gymId: number) => {
        setApplying(gymId);
        try {
            await api.trainers.applyToGym(params.trainerId as string, gymId);
            const updatedGyms = await api.trainers.getGyms(params.trainerId as string);
            setTrainerGyms(updatedGyms);
            toast.success("Application sent!");
        } catch (err) {
            toast.error("Failed to send application");
        } finally {
            setApplying(null);
        }
    };

    const profile = localProfile || contextProfile;

    if (!user || (loading && !profile)) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!profile) return <div className="p-8 text-center text-muted-foreground">Profile not found.</div>;

    const isAssociatedWith = (gymId: number) => trainerGyms.some(tg => tg.gym.id === gymId);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">My Profile</h1>
                    <p className="text-muted-foreground">Manage your public trainer profile</p>
                </div>
                <Button variant="outline" onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/profile/edit`)}>
                    Edit Profile
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            Personal Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                            <div className="text-lg font-semibold">{user.full_name}</div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                {user.email}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Bio</label>
                            <p className="text-sm">{profile.bio || "No bio added."}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant={profile.verification_status === 'APPROVED' ? 'default' : 'secondary'}>
                                {profile.verification_status}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" />
                            Specializations
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingSpecs(!isEditingSpecs)}>
                            {isEditingSpecs ? "Done" : "Edit"}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isEditingSpecs ? (
                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground">Type tags separated by commas to update.</p>
                                <Input
                                    defaultValue={profile.specializations?.join(", ")}
                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                        const specs = e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean);
                                        if (JSON.stringify(specs) !== JSON.stringify(profile.specializations)) {
                                            saveProfile({ specializations: specs });
                                            setLocalProfile({ ...profile, specializations: specs });
                                        }
                                    }}
                                    placeholder="Weightlifting, Yoga, Nutrition..."
                                />
                                {saving && <p className="text-xs text-primary animate-pulse flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving changes...</p>}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {profile.specializations?.map((spec: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                                        {spec}
                                    </Badge>
                                ))}
                                {(!profile.specializations || profile.specializations.length === 0) && (
                                    <p className="text-muted-foreground text-sm">No specializations linked.</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-emerald-500" />
                            Certifications
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingCerts(!isEditingCerts)}>
                            {isEditingCerts ? "Done" : "Edit"}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isEditingCerts ? (
                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground">Update your professional certifications.</p>
                                <Input
                                    defaultValue={profile.certifications?.map((c: any) => typeof c === 'string' ? c : c.name).join(", ")}
                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                        const certs = e.target.value.split(",").map((c: string) => c.trim()).filter(Boolean);
                                        // Simple string array for now as per previous logic
                                        if (JSON.stringify(certs) !== JSON.stringify(profile.certifications)) {
                                            saveProfile({ certifications: certs });
                                            setLocalProfile({ ...profile, certifications: certs });
                                        }
                                    }}
                                    placeholder="ACE CPT, Precision Nutrition L1..."
                                />
                                {saving && <p className="text-xs text-primary animate-pulse flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving changes...</p>}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {profile.certifications?.map((cert: any, i: number) => (
                                    <div key={i} className="flex flex-col p-3 rounded-lg border bg-muted/30">
                                        <span className="font-semibold">{typeof cert === 'string' ? cert : cert.name}</span>
                                        <span className="text-sm text-muted-foreground">{typeof cert === 'object' ? `Certified in ${cert.year}` : 'Verified'}</span>
                                    </div>
                                ))}
                                {(!profile.certifications || profile.certifications.length === 0) && (
                                    <p className="text-muted-foreground text-sm">No certifications added.</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-full border-primary/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle className="text-2xl font-bold">Gym Discovery & Partnerships</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Manage your facility associations and discover new places to train.</p>
                        </div>
                        <Button
                            variant={showJoinFlow ? "outline" : "default"}
                            onClick={() => setShowJoinFlow(!showJoinFlow)}
                            className="transition-all"
                        >
                            {showJoinFlow ? "Back to My Gyms" : "Find a Gym to Join"}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {!showJoinFlow ? (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Your profile is currently linked to these facilities.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {trainerGyms.map((tg, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                                            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                {tg.gym.name.substring(0, 1)}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="font-medium truncate">{tg.gym.name}</div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={tg.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px] py-0">
                                                        {tg.status}
                                                    </Badge>
                                                    {tg.status === 'ACTIVE' && i === 0 && (
                                                        <Badge variant="outline" className="text-[10px] py-0 border-emerald-500 text-emerald-500">PRIMARY</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {trainerGyms.length === 0 && (
                                        <div className="col-span-full p-8 border border-dashed rounded-lg text-center">
                                            <p className="text-muted-foreground text-sm mb-4">You haven&apos;t joined any gyms yet.</p>
                                            <Button variant="outline" onClick={() => setShowJoinFlow(true)}>Find a Gym to Join</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Select a gym to send an association request.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {allGyms.filter(g => !isAssociatedWith(g.id)).map((gym) => (
                                        <div key={gym.id} className="flex flex-col p-4 border rounded-lg bg-background hover:border-primary/50 transition-colors">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="h-10 w-10 rounded bg-zinc-100 flex items-center justify-center font-bold text-zinc-900">
                                                    {gym.name.substring(0, 1)}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="font-medium truncate">{gym.name}</div>
                                                    <div className="text-xs text-muted-foreground truncate">{gym.location}</div>
                                                </div>
                                            </div>
                                            <Button
                                                className="w-full mt-auto"
                                                variant="secondary"
                                                size="sm"
                                                disabled={applying === gym.id}
                                                onClick={() => handleApply(gym.id)}
                                            >
                                                {applying === gym.id ? "Applying..." : "Apply to Join"}
                                            </Button>
                                        </div>
                                    ))}
                                    {allGyms.length === 0 && <p className="text-center py-8 text-muted-foreground">No gyms found near you.</p>}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
