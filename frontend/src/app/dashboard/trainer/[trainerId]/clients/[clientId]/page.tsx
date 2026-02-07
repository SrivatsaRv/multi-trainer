"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, User, TrendingUp, Dumbbell, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const ProgressChart = dynamic(() => import("@/components/analytics/progress-chart").then(mod => mod.ProgressChart), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-lg" />
});

interface Client {
    id: number;
    name: string;
    email: string;
    profile_image?: string;
}

interface Booking {
    id: number;
    start_time: string;
    status: string;
    notes?: string;
    gym: { name: string };
}

interface Analytics {
    volume_trend: any[];
    top_exercises: { name: string; count: number }[];
}

export default function ClientDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const trainerId = params.trainerId as string;
    const clientId = params.clientId as string;

    const [client, setClient] = useState<Client | null>(null);
    const [history, setHistory] = useState<Booking[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchClientData = useCallback(async () => {
        if (!trainerId || !clientId) return;
        setLoading(true);
        try {
            // Fetch client profile
            const clientData = await api.get(`/trainers/${trainerId}/clients/${clientId}`);
            setClient(clientData);

            // Fetch history
            const historyData = await api.get(`/trainers/${trainerId}/clients/${clientId}/history`);
            setHistory(historyData);

            // Fetch analytics
            const analyticsData = await api.get(`/trainers/${trainerId}/clients/${clientId}/analytics`);
            setAnalytics(analyticsData);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load client data");
        } finally {
            setLoading(false);
        }
    }, [trainerId, clientId]);

    useEffect(() => {
        fetchClientData();
    }, [fetchClientData]);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!client) return <div className="p-8 text-center">Client not found.</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                    <p className="text-sm text-zinc-400">{client.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Analytics Overview */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Volume Progression
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ProgressChart
                            data={analytics?.volume_trend || []}
                            exerciseName="Overall Volume"
                        />
                    </CardContent>
                </Card>

                {/* Top Exercises */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Dumbbell className="w-5 h-5 text-amber-500" />
                            Favorite Exercises
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics?.top_exercises.map((ex, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                                    <span className="font-medium">{ex.name}</span>
                                    <Badge variant="secondary">{ex.count} times</Badge>
                                </div>
                            ))}
                            {(!analytics?.top_exercises || analytics.top_exercises.length === 0) && (
                                <p className="text-center text-muted-foreground py-8">No data yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Session History */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Session History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {history.map((session) => (
                                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/dashboard/trainer/${trainerId}/sessions/${session.id}`)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{new Date(session.start_time).toLocaleDateString()}</p>
                                            <p className="text-sm text-muted-foreground">{session.gym.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={session.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                            {session.status}
                                        </Badge>
                                        <ArrowLeft className="w-4 h-4 rotate-180 text-zinc-600" />
                                    </div>
                                </div>
                            ))}
                            {history.length === 0 && (
                                <p className="text-center text-muted-foreground py-12">No sessions recorded yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
