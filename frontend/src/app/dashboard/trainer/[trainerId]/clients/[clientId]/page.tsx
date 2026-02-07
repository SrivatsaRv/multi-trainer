"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { Loader2, Mail, Calendar, Dumbbell, TrendingUp, User, ChevronLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";
import { format } from "date-fns";

export default function ClientDetailPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const [client, setClient] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [clientData, analyticsData] = await Promise.all([
                    api.trainers.getClient(params.trainerId as string, params.clientId as string),
                    api.trainers.getClientAnalytics(params.trainerId as string, params.clientId as string)
                ]);
                setClient(clientData);
                setAnalytics(analyticsData);
            } catch (err) {
                console.error("Failed to fetch client details:", err);
                toast.error("Failed to load client details");
            } finally {
                setLoading(false);
            }
        }
        if (params.trainerId && params.clientId) fetchData();
    }, [params.trainerId, params.clientId]);

    if (loading) return <div className="flex justify-center p-12 min-h-screen items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!client) return <div className="p-8 text-center text-muted-foreground">Client not found.</div>;

    const subscription = client.subscription;
    const progress = subscription ? ((subscription.active_sessions || subscription.sessions_used) / subscription.total_sessions) * 100 : 0;

    // Fallback for null subscription stats in UI if needed, though API should provide
    const sessionsUsed = subscription?.sessions_used || 0;
    const sessionsTotal = subscription?.total_sessions || 0;
    const progressPercentage = sessionsTotal > 0 ? (sessionsUsed / sessionsTotal) * 100 : 0;

    return (
        <div className="space-y-6 pb-24 md:pb-10 max-w-5xl mx-auto md:mx-0">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" /> {client.email}
                    </div>
                </div>
                <div className="ml-auto">
                    <Button
                        onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/workout-logger?client=${client.id}`)}
                        className="gap-2 shadow-sm"
                    >
                        <Dumbbell className="w-4 h-4" /> Log Workout
                    </Button>
                </div>
            </div>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Subscription Status */}
                <Card className="md:col-span-1 border-l-4 border-l-primary/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-2xl font-bold">{sessionsUsed} / {sessionsTotal}</div>
                            <Badge variant={subscription?.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {subscription?.status || "INACTIVE"}
                            </Badge>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            {subscription?.expiry_date ? `Expires on ${format(new Date(subscription.expiry_date), 'PP')}` : 'No active plan'}
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Total Sessions */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Dumbbell className="w-5 h-5 text-emerald-500" />
                            <div className="text-3xl font-bold">{analytics?.total_sessions || 0}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Member Since / Join Date (Placeholder or from Profile) */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Client Since</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            <div className="text-xl font-semibold">
                                {client.created_at ? format(new Date(client.created_at), 'MMMM yyyy') : 'Recent'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Volume Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="w-4 h-4 text-primary" /> Volume Progression
                        </CardTitle>
                        <CardDescription>Total volume lifted per session over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {analytics?.volume_trend && analytics.volume_trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.volume_trend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => format(new Date(val), 'MM/dd')}
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                        labelFormatter={(label) => format(new Date(label), 'PPP')}
                                        formatter={(value: number) => [`${value} kg`, 'Volume']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="volume"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={{ fill: 'hsl(var(--primary))' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                                <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
                                Not enough data for volume trend.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Exercises */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top Exercises</CardTitle>
                        <CardDescription>Most frequently performed exercises.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {analytics?.top_exercises && analytics.top_exercises.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.top_exercises} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        stroke="hsl(var(--foreground))"
                                        fontSize={12}
                                        tick={{ fill: 'hsl(var(--foreground))' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                                <AnalyticsPlaceholder />
                                No exercise history found.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function AnalyticsPlaceholder() {
    return (
        <svg
            className="w-10 h-10 mb-3 text-muted-foreground/20"
            fill="none"
            height="24"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
        </svg>
    )
}
