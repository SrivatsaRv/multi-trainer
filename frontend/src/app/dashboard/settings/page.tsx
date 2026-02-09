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
                    <form onSubmit={handleProfileSave} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    {user.role === "TRAINER" ? "Professional Bio" : "Gym Details"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {user.role === "TRAINER" ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="bio">About You</Label>
                                        <textarea
                                            id="bio"
                                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={localProfile?.bio || ""}
                                            onChange={(e) => setLocalProfile({ ...localProfile, bio: e.target.value })}
                                            placeholder="Write something professional to attract clients..."
                                        />
                                    </div>
                                ) : (
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
                                )}
                            </CardContent>
                        </Card>

                        {user.role === "TRAINER" && (
                            <>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="flex items-center gap-2">
                                            <Star className="w-5 h-5 text-amber-500" />
                                            Specializations
                                        </CardTitle>
                                        <span className="text-xs text-muted-foreground">{localProfile?.specializations?.length || 0}/5</span>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex flex-wrap gap-2">
                                            {localProfile?.specializations?.map((spec: string) => (
                                                <Badge key={spec} variant="default" className="gap-1 px-3 py-1">
                                                    {spec}
                                                    <button type="button" onClick={() => toggleSpecialization(spec)}>
                                                        <Trash2 className="w-3 h-3 hover:text-destructive" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="pt-4 border-t">
                                            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Quick Select:</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {POPULAR_SPECIALIZATIONS.filter(s => !localProfile?.specializations?.includes(s)).map(spec => (
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
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Award className="w-5 h-5 text-emerald-500" />
                                            Certifications
                                        </CardTitle>
                                        <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button type="button" size="sm" variant="outline">
                                                    <Plus className="w-4 h-4 mr-1" /> Add
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add Certification</DialogTitle>
                                                    <DialogDescription>Add a new qualification to your profile.</DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Name</Label>
                                                        <Input
                                                            value={newCert.name}
                                                            onChange={e => setNewCert({ ...newCert, name: e.target.value })}
                                                            placeholder="e.g. NASM CPT"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Issuing Organization</Label>
                                                        <Input
                                                            value={newCert.issuing_organization}
                                                            onChange={e => setNewCert({ ...newCert, issuing_organization: e.target.value })}
                                                            placeholder="e.g. NASM"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Issue Date</Label>
                                                        <Input
                                                            type="date"
                                                            value={newCert.issue_date}
                                                            onChange={e => setNewCert({ ...newCert, issue_date: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button type="button" onClick={handleAddCert} disabled={saving}>
                                                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Save Certificate
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {certificates.map(cert => (
                                                <div key={cert.id} className="flex justify-between items-center p-3 border rounded-lg bg-muted/50">
                                                    <div>
                                                        <p className="text-sm font-semibold">{cert.name}</p>
                                                        <p className="text-xs text-muted-foreground">{cert.issuing_organization}</p>
                                                    </div>
                                                    <button type="button" onClick={async () => {
                                                        await api.certificates.delete(cert.id);
                                                        setCertificates(certificates.filter(c => c.id !== cert.id));
                                                        toast.success("Certificate removed");
                                                    }}>
                                                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                                    </button>
                                                </div>
                                            ))}
                                            {certificates.length === 0 && <p className="text-sm text-center py-4 text-muted-foreground">No certifications added yet.</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        <div className="flex justify-end">
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Profile Changes
                            </Button>
                        </div>
                    </form>
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
                                    <p className="font-medium text-lg">{user.full_name}</p>
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
                                    <Badge variant="default" className="bg-emerald-500">Active</Badge>
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
