"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Loader2, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export default function GymPackagesPage({ params }: { params: { gymId: string } }) {
    const { profile } = useAuth();
    const gymId = params.gymId;
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingPackage, setEditingPackage] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price_inr: 0,
        session_count: 12
    });

    useEffect(() => {
        const fetchPackagesInternal = async () => {
            try {
                const data = await api.gyms.getPackages(gymId);
                setPackages(data);
            } catch {
                toast.error("Failed to fetch packages");
            } finally {
                setLoading(false);
            }
        };

        fetchPackagesInternal();
    }, [gymId]);

    const fetchPackages = async () => {
        try {
            const data = await api.gyms.getPackages(gymId);
            setPackages(data);
        } catch {
            toast.error("Failed to fetch packages");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingPackage) {
                await api.gyms.updatePackage(gymId, editingPackage.id, formData);
                toast.success("Package updated");
            } else {
                await api.gyms.createPackage(gymId, formData);
                toast.success("Package created");
            }
            setShowForm(false);
            setEditingPackage(null);
            fetchPackages();
        } catch {
            toast.error("Failed to save package");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this package?")) return;
        try {
            await api.gyms.deletePackage(gymId, id);
            toast.success("Package deleted");
            fetchPackages();
        } catch {
            toast.error("Failed to delete package");
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Standardized Plans</h1>
                    <p className="text-muted-foreground">Manage session packages valid for all trainers in your facility.</p>
                </div>
                <Button onClick={() => { setShowForm(true); setEditingPackage(null); setFormData({ name: "", description: "", price_inr: 0, session_count: 12 }); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Plan
                </Button>
            </div>

            {showForm && (
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>{editingPackage ? "Edit Plan" : "Create New Plan"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Plan Name</Label>
                                <Input
                                    placeholder="e.g. Starter Pack, Transformation Plan"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    placeholder="What's included?"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Total Sessions</Label>
                                    <Input
                                        type="number"
                                        value={formData.session_count || ""}
                                        onChange={e => setFormData({ ...formData, session_count: e.target.value ? parseInt(e.target.value) : 0 })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Price (INR)</Label>
                                    <Input
                                        type="number"
                                        value={formData.price_inr || ""}
                                        onChange={e => setFormData({ ...formData, price_inr: e.target.value ? parseInt(e.target.value) : 0 })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                                    {editingPackage ? "Update Plan" : "Create Plan"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                    <Card key={pkg.id} className="relative group overflow-hidden border-2 hover:border-primary/50 transition-all">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                                    {pkg.session_count} Sessions
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingPackage(pkg); setFormData({ ...pkg }); setShowForm(true); }}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(pkg.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{pkg.description}</p>
                            <div className="flex items-center text-2xl font-bold text-primary">
                                <IndianRupee className="w-5 h-5 mr-1" />
                                {pkg.price_inr.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
