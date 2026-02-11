"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface PackageFormProps {
    gymId: string;
    editingPackage?: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export function PackageForm({ gymId, editingPackage, onSuccess, onCancel }: PackageFormProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: editingPackage?.name || "",
        description: editingPackage?.description || "",
        price_inr: editingPackage?.price_inr || 0,
        session_count: editingPackage?.session_count || 12
    });

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
            onSuccess();
        } catch (err: any) {
            toast.error(err.message || "Failed to save package");
        } finally {
            setSaving(false);
        }
    };

    return (
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
                        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                            {editingPackage ? "Update Plan" : "Create Plan"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
