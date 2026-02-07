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
import { User, Mail, Award, Star, Loader2, Plus, Trash2, Building, MapPin } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const POPULAR_SPECIALIZATIONS = [
    "Weightlifting", "Yoga", "HIIT", "Nutrition", "Pilates",
    "CrossFit", "Calisthenics", "Rehabilitation", "Senior Fitness", "Boxing"
];

const POPULAR_CERTS = [
    "ACE CPT", "NASM CPT", "ISSA CPT", "Precision Nutrition L1", "CrossFit L1"
];

export default function TrainerProfilePage() {
    const { user, profile: contextProfile } = useAuth();
    const router = useRouter();
    const params = useParams();
    const [localProfile, setLocalProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
                const [prof, gyms, all, certs, apps] = await Promise.all([
                    api.trainers.get(params.trainerId as string),
                    api.trainers.getGyms(params.trainerId as string),
                    api.gyms.listAll(),
                    api.certificates.list(),
                    api.gymApplications.list()
                ]);
                setLocalProfile(prof);
                setTrainerGyms(gyms);
                setAllGyms(all);
                setCertificates(certs);
                setApplications(apps);
            } catch (err) {
                console.error("Failed to fetch profile data:", err);
            } finally {
                setLoading(false);
            }
        }
        if (params.trainerId) fetchData();
    }, [params.trainerId]);

    const saveProfile = async (updates: any) => {
        setSaving(true);
        try {
            await api.trainers.patch(params.trainerId as string, updates);
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
        saveProfile({ specializations: updated });
    };

    const profile = localProfile || contextProfile;

    if (!user || (loading && !profile)) return <div className="flex justify-center p-12 min-h-[50vh] items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!profile) return <div className="p-8 text-center text-muted-foreground">Profile not found.</div>;

    const isAssociatedWith = (gymId: number) => trainerGyms.some(tg => tg.gym.id === gymId);
    const getApplicationStatus = (gymId: number) => applications.find(a => a.gym_id === gymId)?.status;

    return (
        <div className="space-y-6 pb-24 md:pb-10 max-w-lg mx-auto md:max-w-none">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trainer Profile</h1>
                    <p className="text-muted-foreground">Your digital business card & qualifications</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={profile.verification_status === 'APPROVED' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                        {profile.verification_status}
                    </Badge>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. Personal Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            Personal Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-2xl font-bold border-2 border-white shadow-sm">
                                {user.full_name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{user.full_name}</h3>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Mail className="w-3 h-3" />
                                    {user.email}
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="bio">Bio</Label>
                            <Input
                                id="bio"
                                className="mt-1.5"
                                defaultValue={profile.bio}
                                placeholder="Tell clients about yourself..."
                                onBlur={(e) => {
                                    if (e.target.value !== profile.bio) saveProfile({ bio: e.target.value });
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Specializations Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" />
                            Specializations
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                            {(profile.specializations?.length || 0)}/5
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {profile.specializations?.map((spec: string) => (
                                <Badge key={spec} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                                    {spec}
                                    <button
                                        onClick={() => toggleSpecialization(spec)}
                                        className="hover:bg-slate-200 rounded-full p-0.5"
                                    >
                                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                </Badge>
                            ))}
                            {(!profile.specializations?.length) && <span className="text-sm text-muted-foreground italic">Select up to 5 skills below</span>}
                        </div>

                        <div className="border-t pt-4">
                            <p className="text-xs font-medium text-muted-foreground mb-3">Add Specialization:</p>
                            <div className="flex flex-wrap gap-2">
                                {POPULAR_SPECIALIZATIONS.filter(s => !profile.specializations?.includes(s)).map(spec => (
                                    <button
                                        key={spec}
                                        onClick={() => toggleSpecialization(spec)}
                                        className="text-xs border rounded-full px-3 py-1 hover:bg-primary/5 hover:border-primary transition-colors"
                                    >
                                        + {spec}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Certifications Card */}
                <Card className="col-span-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-emerald-500" />
                            Certifications
                        </CardTitle>
                        <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1">
                                    <Plus className="w-4 h-4" /> Add
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Add Certificate</DialogTitle>
                                    <DialogDescription>
                                        Verify your expertise with official certifications.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Common Certifications</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {POPULAR_CERTS.map(c => (
                                                <Badge
                                                    key={c}
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-slate-100"
                                                    onClick={() => setNewCert({ ...newCert, name: c })}
                                                >
                                                    {c}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="certName">Certificate Name</Label>
                                        <Input
                                            id="certName"
                                            value={newCert.name}
                                            onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                                            placeholder="e.g. Advanced Personal Trainer"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="org">Organization</Label>
                                            <Input
                                                id="org"
                                                value={newCert.issuing_organization}
                                                onChange={(e) => setNewCert({ ...newCert, issuing_organization: e.target.value })}
                                                placeholder="e.g. ACE"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="date">Issue Date</Label>
                                            <Input
                                                id="date"
                                                type="date"
                                                value={newCert.issue_date}
                                                onChange={(e) => setNewCert({ ...newCert, issue_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleAddCertificate} disabled={addingCert}>
                                        {addingCert && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Certificate
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {certificates.map((cert) => (
                                <div key={cert.id} className="flex justify-between items-start p-3 rounded-lg border bg-slate-50 dark:bg-zinc-900">
                                    <div>
                                        <p className="font-semibold text-sm">{cert.name}</p>
                                        <p className="text-xs text-muted-foreground">{cert.issuing_organization} • {new Date(cert.issue_date).getFullYear()}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteCertificate(cert.id)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {certificates.length === 0 && (
                                <div className="col-span-full text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                                    No certifications added yet.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Gym Discovery */}
                <Card className="col-span-full border-primary/20 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl">Gym Associations</CardTitle>
                                <p className="text-sm text-muted-foreground">Join up to 3 gyms to start training clients.</p>
                            </div>
                            <Button
                                variant={showJoinFlow ? "secondary" : "default"}
                                onClick={() => setShowJoinFlow(!showJoinFlow)}
                                size="sm"
                            >
                                {showJoinFlow ? "View My Gyms" : "Join a Gym"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {!showJoinFlow ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {trainerGyms.map((tg) => (
                                        <div key={tg.id} className="flex items-center gap-3 p-4 border rounded-xl bg-card shadow-sm">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                <Building className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{tg.gym.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant={tg.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                                        {tg.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {trainerGyms.length === 0 && (
                                        <div className="col-span-full text-center py-12">
                                            <p className="text-muted-foreground mb-4">You are not associated with any gym.</p>
                                            <Button onClick={() => setShowJoinFlow(true)}>Browse Gyms</Button>
                                        </div>
                                    )}
                                </div>

                                {/* Pending Applications Section */}
                                {applications.length > 0 && (
                                    <div className="mt-8">
                                        <h4 className="text-sm font-semibold mb-3">Pending Applications</h4>
                                        <div className="space-y-2">
                                            {applications.map(app => {
                                                const gym = allGyms.find(g => g.id === app.gym_id);
                                                if (!gym || app.status !== 'PENDING') return null;
                                                return (
                                                    <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                                                        <div className="flex items-center gap-3">
                                                            <ClockLoader className="w-4 h-4 text-orange-500" />
                                                            <span className="text-sm font-medium">{gym.name}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-orange-600 border-orange-200">Pending Approval</Badge>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Input placeholder="Search gyms..." className="max-w-md" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {allGyms.filter(g => !isAssociatedWith(g.id)).map((gym) => {
                                        const appStatus = getApplicationStatus(gym.id);
                                        const isPending = appStatus === 'PENDING';

                                        return (
                                            <div key={gym.id} className="flex flex-col p-4 border rounded-xl bg-card hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                        <span className="font-bold text-lg">{gym.name[0]}</span>
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <h3 className="font-semibold truncate">{gym.name}</h3>
                                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                                        <MapPin className="w-3 h-3 mr-1" />
                                                        {gym.location}
                                                    </div>
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
