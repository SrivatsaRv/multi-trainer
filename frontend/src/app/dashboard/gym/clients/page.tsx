"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus, Package, ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SessionPackage {
    id: number;
    name: string;
    price_inr: number;
    session_count: number;
    description?: string;
}

interface Client {
    id: number;
    name: string;
    email: string;
    package?: SessionPackage;
    sessions_remaining?: number;
}

export default function GymClientsPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [packages, setPackages] = useState<SessionPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        package_id: "",
    });

    useEffect(() => {
        if (!user || user.role !== "GYM_ADMIN") {
            router.push("/dashboard");
            return;
        }
        if (profile?.id) {
            fetchData();
        }
    }, [user, profile?.id, router]);

    const fetchData = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const [clientsData, packagesData] = await Promise.all([
                api.gyms.getClients(profile.id.toString()),
                api.gyms.getPackages(profile.id.toString()),
            ]);
            setClients(clientsData);
            setPackages(packagesData);
        } catch (err) {
            console.error("Failed to fetch data", err);
            toast.error("Failed to load clients");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id || !formData.name || !formData.email || !formData.package_id) {
            toast.error("Please fill all fields");
            return;
        }

        setSaving(true);
        try {
            await api.post(`/gyms/${profile.id}/clients`, {
                name: formData.name,
                email: formData.email,
                package_id: parseInt(formData.package_id),
            });
            toast.success("Client onboarded successfully!");
            setFormData({ name: "", email: "", package_id: "" });
            setShowForm(false);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to onboard client");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard")}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Client Management</h1>
                        <p className="text-muted-foreground">
                            Onboard new clients with gym-approved packages
                        </p>
                    </div>
                </div>
                <Button onClick={() => setShowForm(!showForm)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {showForm ? "Cancel" : "Onboard Client"}
                </Button>
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            New Client Onboarding
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="package">Select Package</Label>
                                <Select
                                    value={formData.package_id}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, package_id: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a package" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packages.map((pkg) => (
                                            <SelectItem key={pkg.id} value={pkg.id.toString()}>
                                                {pkg.name} - ₹{pkg.price_inr} ({pkg.session_count}{" "}
                                                sessions)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {packages.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        No packages available. Create one first.
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving || packages.length === 0}>
                                    {saving ? "Onboarding..." : "Onboard Client"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((client) => (
                    <Card key={client.id}>
                        <CardHeader>
                            <CardTitle className="text-lg">{client.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {client.package && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Package:</span>
                                        <Badge variant="outline">{client.package.name}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Sessions Left:</span>
                                        <Badge>{client.sessions_remaining || 0}</Badge>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {clients.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border border-dashed rounded-lg">
                        <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No clients onboarded yet</p>
                        <Button onClick={() => setShowForm(true)}>
                            Onboard Your First Client
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
