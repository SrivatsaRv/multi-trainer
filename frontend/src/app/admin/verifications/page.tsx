"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X } from "lucide-react";

export default function AdminVerifications() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ gyms: any[]; trainers: any[] }>({ gyms: [], trainers: [] });

    const fetchData = async () => {
        try {
            const res = await api.admin.listVerifications();
            setData(res);
        } catch (error) {
            toast.error("Failed to fetch pending verifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (type: 'gym' | 'trainer', id: number, action: 'approve' | 'reject') => {
        try {
            if (type === 'gym') {
                action === 'approve' ? await api.admin.approveGym(id) : await api.admin.rejectGym(id);
            } else {
                action === 'approve' ? await api.admin.approveTrainer(id) : await api.admin.rejectTrainer(id);
            }
            toast.success(`${type === 'gym' ? 'Gym' : 'Trainer'} ${action}d`);
            fetchData(); // Refresh list
        } catch (error) {
            toast.error("Action failed");
        }
    };

    if (loading) return <div className="p-8 text-white"><Loader2 className="animate-spin" /></div>;

    const renderList = (items: any[], type: 'gym' | 'trainer') => (
        <div className="space-y-4">
            {items.length === 0 && <p className="text-zinc-500">No pending requests.</p>}
            {items.map((item) => (
                <Card key={item.id} className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{type === 'gym' ? item.name : "Trainer Profile"}</CardTitle>
                            <p className="text-sm text-zinc-400">{type === 'gym' ? item.location : item.bio}</p>
                        </div>
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">{item.verification_status}</Badge>
                    </CardHeader>
                    <CardContent className="flex gap-2 justify-end">
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(type, item.id, 'reject')}
                            >
                                <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleAction(type, item.id, 'approve')}
                            >
                                <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Verification Requests</h1>

            <Tabs defaultValue="gyms" className="w-full">
                <TabsList className="bg-zinc-900 border-zinc-800 text-white">
                    <TabsTrigger value="gyms">Gyms ({data.gyms.length})</TabsTrigger>
                    <TabsTrigger value="trainers">Trainers ({data.trainers.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="gyms" className="mt-6">
                    {renderList(data.gyms, 'gym')}
                </TabsContent>
                <TabsContent value="trainers" className="mt-6">
                    {renderList(data.trainers, 'trainer')}
                </TabsContent>
            </Tabs>
        </div>
    );
}
