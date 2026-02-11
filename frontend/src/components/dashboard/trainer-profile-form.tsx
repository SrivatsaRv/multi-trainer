"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Mail, Award, Star, Loader2, Plus, Trash2 } from "lucide-react";
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

interface TrainerProfileFormProps {
    trainerId: string;
    initialProfile: any;
    initialCertificates: any[];
    onUpdate?: (updatedProfile: any) => void;
    onCertChange?: (updatedCerts: any[]) => void;
    user: {
        full_name: string;
        email: string;
    };
    readOnly?: boolean;
}

export function TrainerProfileForm({
    trainerId,
    initialProfile,
    initialCertificates,
    onUpdate,
    onCertChange,
    user,
    readOnly = false
}: TrainerProfileFormProps) {
    const [profile, setProfile] = useState(initialProfile);
    const [certificates, setCertificates] = useState(initialCertificates);
    const [saving, setSaving] = useState(false);

    // Cert Form State
    const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
    const [newCert, setNewCert] = useState({ name: "", issuing_organization: "", issue_date: "" });

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Update Trainer/Gym Profile
            const updated = await api.trainers.patch(trainerId, profile);

            // 2. Update User Info (Full Name)
            if (profile.user?.full_name) {
                await api.patch('/users/me', { full_name: profile.user.full_name });
            }

            setProfile(updated);
            onUpdate?.(updated);
            toast.success("Profile updated successfully");
        } catch (err) {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const toggleSpecialization = (spec: string) => {
        const current = profile?.specializations || [];
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
        setProfile({ ...profile, specializations: updated });
    };

    const handleAddCert = async () => {
        if (!newCert.name || !newCert.issuing_organization || !newCert.issue_date) {
            toast.error("Please fill in all fields");
            return;
        }
        setSaving(true);
        try {
            const created = await api.certificates.create(newCert);
            const updatedCerts = [...certificates, created];
            setCertificates(updatedCerts);
            onCertChange?.(updatedCerts);
            setIsCertDialogOpen(false);
            setNewCert({ name: "", issuing_organization: "", issue_date: "" });
            toast.success("Certificate added");
        } catch (err) {
            toast.error("Failed to add certificate");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCert = async (id: number) => {
        try {
            await api.certificates.delete(id);
            const updatedCerts = certificates.filter(c => c.id !== id);
            setCertificates(updatedCerts);
            onCertChange?.(updatedCerts);
            toast.success("Certificate removed");
        } catch (err) {
            toast.error("Failed to remove certificate");
        }
    };

    return (
        <div className="space-y-6">
            {!readOnly && (
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                {profile?.user?.full_name?.charAt(0) || user.full_name.charAt(0)}
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="fullName" className="text-muted-foreground">Full Name</Label>
                                {readOnly ? (
                                    <div className="text-lg font-semibold py-1">{profile?.user?.full_name || user.full_name}</div>
                                ) : (
                                    <Input
                                        id="fullName"
                                        value={profile?.user?.full_name || user.full_name}
                                        onChange={(e) => setProfile({ ...profile, user: { ...profile.user, full_name: e.target.value } })}
                                    />
                                )}
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Mail className="w-3 h-3" />
                                    {user.email}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bio" className="text-muted-foreground">Bio</Label>
                            {readOnly ? (
                                <div className="text-sm border rounded-lg p-3 bg-muted/30 whitespace-pre-wrap min-h-[100px]">
                                    {profile?.bio || "No bio available."}
                                </div>
                            ) : (
                                <textarea
                                    id="bio"
                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={profile?.bio || ""}
                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                    placeholder="Tell clients about yourself..."
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" />
                            Specializations
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                            {(profile?.specializations?.length || 0)}/5
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {profile?.specializations?.map((spec: string) => (
                                <Badge key={spec} variant="default" className={cn("pl-2 pr-1 py-1 gap-1", readOnly && "pr-2")}>
                                    {spec}
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => toggleSpecialization(spec)}
                                            className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </Badge>
                            ))}
                        </div>
                        {!readOnly && (
                            <div className="border-t pt-4">
                                <p className="text-xs font-medium text-muted-foreground mb-3">Add Specialization:</p>
                                <div className="flex flex-wrap gap-2">
                                    {POPULAR_SPECIALIZATIONS.filter(s => !profile?.specializations?.includes(s)).map(spec => (
                                        <button
                                            key={spec}
                                            type="button"
                                            onClick={() => toggleSpecialization(spec)}
                                            className="text-xs border rounded-full px-3 py-1 hover:bg-primary/5 hover:border-primary transition-colors"
                                        >
                                            + {spec}
                                        </button>
                                    ))}
                                </div>
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
                        {!readOnly && (
                            <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-1">
                                        <Plus className="w-4 h-4" /> Add
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Add Certificate</DialogTitle>
                                        <DialogDescription>Verify your expertise with official certifications.</DialogDescription>
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
                                        <Button onClick={handleAddCert} disabled={saving}>
                                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Certificate
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {certificates.map((cert) => (
                                <div key={cert.id} className="flex justify-between items-start p-3 rounded-lg border bg-slate-50 dark:bg-zinc-900">
                                    <div>
                                        <p className="font-semibold text-sm">{cert.name}</p>
                                        <p className="text-xs text-muted-foreground">{cert.issuing_organization} • {new Date(cert.issue_date).getFullYear()}</p>
                                    </div>
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteCert(cert.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
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
            </div>
        </div>
    );
}
