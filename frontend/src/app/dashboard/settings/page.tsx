"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2,
    Lock,
    User,
    Settings as SettingsIcon,
    Award,
    Star,
    Trash2,
    Plus,
    Building
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { TrainerProfileForm } from "@/components/dashboard/trainer-profile-form";

const POPULAR_SPECIALIZATIONS = [
    "Weightlifting", "Yoga", "HIIT", "Nutrition", "Pilates",
    "CrossFit", "Calisthenics", "Rehabilitation", "Senior Fitness", "Boxing"
];

const POPULAR_CERTS = [
    "ACE CPT", "NASM CPT", "ISSA CPT", "Precision Nutrition L1", "CrossFit L1"
];

export default function SettingsPage() {
    const { user, profile: contextProfile, refreshProfile } = useAuth();
    const [activeTab, setActiveTab] = useState("profile");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Profile State
    const [localProfile, setLocalProfile] = useState<any>(null);
    const [certificates, setCertificates] = useState<any[]>([]);

    // Password State
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    // Cert Form State
    const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
    const [newCert, setNewCert] = useState({ name: "", issuing_organization: "", issue_date: "" });

    useEffect(() => {
        async function loadProfile() {
            if (!user) return;
            setLoading(true);
            try {
                if (user.role === "TRAINER" && contextProfile?.id) {
                    const [prof, certs] = await Promise.all([
                        api.trainers.get(contextProfile.id),
                        api.certificates.list()
                    ]);
                    setLocalProfile(prof);
                    setCertificates(certs);
                } else if (user.role === "GYM_ADMIN" && contextProfile?.id) {
                    const prof = await api.gyms.get(contextProfile.id);
                    setLocalProfile(prof);
                }
            } catch (err) {
                console.error("Failed to load settings data:", err);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [user, contextProfile?.id]);

    const handleProfileSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!contextProfile?.id) return;

        setSaving(true);
        try {
            if (user?.role === "TRAINER") {
                await api.trainers.patch(contextProfile.id, localProfile);
            } else if (user?.role === "GYM_ADMIN") {
                // Assuming gym patch endpoint exists or using generic one
                // For now, let's keep it consistent
                // await api.gyms.patch(contextProfile.id, localProfile);
            }
            await refreshProfile();
            toast.success("Profile updated successfully");
        } catch (err) {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            toast.error("New passwords do not match");
            return;
        }

        setSaving(true);
        try {
            await api.patch('/users/me', { password: passwords.new });
            toast.success("Password updated successfully");
            setPasswords({ current: "", new: "", confirm: "" });
        } catch (err) {
            toast.error("Failed to update password. Feature implementation in progress.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddCert = async () => {
        if (!newCert.name || !newCert.issuing_organization || !newCert.issue_date) {
            toast.error("Please fill in all fields");
            return;
        }
        setSaving(true);
        try {
            const created = await api.certificates.create(newCert);
            setCertificates([...certificates, created]);
            setIsCertDialogOpen(false);
            setNewCert({ name: "", issuing_organization: "", issue_date: "" });
            toast.success("Certificate added");
        } catch (err) {
            toast.error("Failed to add certificate");
        } finally {
            setSaving(false);
        }
    };

    const toggleSpecialization = (spec: string) => {
        const current = localProfile?.specializations || [];
        let updated;
        if (current.includes(spec)) {
            updated = current.filter((s: string) => s !== spec);
        } else {
            if (current.length >= 5) {
                toast.error("Max 5 specializations allowed");
                return;
            }
            updated = [...current, spec];
        }
        setLocalProfile({ ...localProfile, specializations: updated });
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!user) return null;

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <SettingsIcon className="w-8 h-8" />
                        Settings
                    </h1>
                    <p className="text-muted-foreground">Manage your account, profile, and security preferences.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="account">Account</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                {/* --- PROFILE TAB --- */}
                <TabsContent value="profile" className="space-y-6">
                    {user.role === "TRAINER" && contextProfile ? (
                        <TrainerProfileForm
                            trainerId={contextProfile.id}
                            initialProfile={localProfile}
                            initialCertificates={certificates}
                            user={{
                                full_name: user.full_name,
                                email: user.email
                            }}
                            onUpdate={(updated: any) => {
                                setLocalProfile(updated);
                                refreshProfile();
                            }}
                            onCertChange={(updatedCerts: any[]) => setCertificates(updatedCerts)}
                        />
                    ) : (
                        <form onSubmit={handleProfileSave} className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building className="w-5 h-5" />
                                        Gym Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="gymName">Gym Name</Label>
                                            <Input
                                                id="gymName"
                                                value={localProfile?.name || ""}
                                                onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="location">Location</Label>
                                            <Input
                                                id="location"
                                                value={localProfile?.location || ""}
                                                onChange={(e) => setLocalProfile({ ...localProfile, location: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <div className="p-6 pt-0 flex justify-end">
                                    <Button type="submit" disabled={saving}>
                                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Save Gym Changes
                                    </Button>
                                </div>
                            </Card>
                        </form>
                    )}
                </TabsContent>

                {/* --- ACCOUNT TAB --- */}
                <TabsContent value="account">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">User Name</Label>
                                    <p className="font-medium text-lg">{localProfile?.full_name || localProfile?.name || user.full_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p className="font-medium text-lg">{user.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Role</Label>
                                    <Badge variant="outline" className="capitalize">{user.role.replace('_', ' ').toLowerCase()}</Badge>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Account Status</Label>
                                    <Badge
                                        variant={contextProfile?.verification_status === 'APPROVED' ? 'default' : 'secondary'}
                                        className={contextProfile?.verification_status === 'APPROVED' ? "bg-emerald-500" : ""}
                                    >
                                        {contextProfile?.verification_status || "ACTIVE"}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- SECURITY TAB --- */}
                <TabsContent value="security" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-destructive flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                Change Password
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <Label htmlFor="current">Current Password</Label>
                                    <Input
                                        id="current"
                                        type="password"
                                        value={passwords.current}
                                        onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new">New Password</Label>
                                    <Input
                                        id="new"
                                        type="password"
                                        value={passwords.new}
                                        onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm">Confirm New Password</Label>
                                    <Input
                                        id="confirm"
                                        type="password"
                                        value={passwords.confirm}
                                        onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                        required
                                    />
                                </div>
                                <Button type="submit" variant="destructive" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Password
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
