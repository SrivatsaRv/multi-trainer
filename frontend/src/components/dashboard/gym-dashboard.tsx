"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { MapPin, Users, Calendar, Star, TrendingUp, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from "recharts";

export function GymDashboard() {
    const { user, profile, logout } = useAuth();
    const router = useRouter();
    const status = profile?.verification_status || "NONE";

    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);

    useEffect(() => {
        if (profile?.id) {
            fetchAnalytics();
        }
    }, [profile?.id]);

    const fetchAnalytics = async () => {
        if (!profile?.id) return;
        try {
            const data = await api.gyms.getAnalytics(profile.id.toString());
            setAnalytics(data);
        } catch (err) {
            console.error("Failed to fetch analytics", err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED": return <Badge className="bg-emerald-500">Active</Badge>;
            case "PENDING": return <Badge className="bg-yellow-500">Under Review</Badge>;
            case "REJECTED": return <Badge className="bg-red-500">Rejected</Badge>;
            case "DRAFT": return <Badge className="bg-zinc-500">Draft</Badge>;
            default: return <Badge variant="outline">Setup Required</Badge>;
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Clock className="animate-spin" /></div>;

    const trainerChartData = analytics?.trainer_stats.map((t: any) => ({
        name: t.name,
        revenue: t.business_value,
        clients: t.total_clients
    }));

    return (
        <div className="space-y-6 pb-12">
            {status === "PENDING" && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-500" />
                        <div>
                            <p className="font-semibold text-yellow-500">Facility Awaiting Approval</p>
                            <p className="text-sm text-yellow-500/80">Your facility registration is being reviewed. You can explore the dashboard, but you won&apos;t be able to accept trainer requests yet.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Trainer Requests Alert */}
            {analytics?.pending_trainers?.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-primary" />
                        <div>
                            <p className="font-semibold">New Trainer Requests</p>
                            <p className="text-sm text-muted-foreground">You have {analytics.pending_trainers.length} trainer(s) waiting for approval to join your facility.</p>
                        </div>
                    </div>
                    <Button size="sm" onClick={() => router.push("/dashboard/gym/trainers")}>
                        Review Requests
                    </Button>
                </div>
            )}

            {/* Facility Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            Facility
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-bold truncate">{profile?.name || "Unnamed"}</div>
                        <div className="mt-1">{getStatusBadge(status)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Total Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{analytics?.total_revenue?.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Lifetime facility sales</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Active Clients
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.total_active_clients}</div>
                        <p className="text-xs text-muted-foreground">Across all trainers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-500" />
                            Daily Attendance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analytics?.attendance_trends?.[analytics.attendance_trends.length - 1]?.sessions || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Completed today</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Trends Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Attendance Trends</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics?.attendance_trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Trainer Business Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Business per Trainer</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trainerChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Value (₹)" />
                                <Bar dataKey="clients" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Clients" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Trainer Performance Drill-Down */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Trainer Performance Breakdown</CardTitle>
                        <select
                            className="bg-background border rounded p-1 text-sm"
                            onChange={(e) => setSelectedTrainer(Number(e.target.value))}
                        >
                            <option value="">All Trainers</option>
                            {analytics?.trainer_stats.map((t: any) => (
                                <option key={t.trainer_id} value={t.trainer_id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analytics?.trainer_stats
                            .filter((t: any) => !selectedTrainer || t.trainer_id === selectedTrainer)
                            .map((t: any) => (
                                <div key={t.trainer_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                            {t.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{t.name}</p>
                                            <p className="text-xs text-muted-foreground">{t.total_clients} active clients</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">₹{t.business_value.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">{t.completed_sessions} sessions completed</p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Button variant="outline" onClick={() => router.push("/dashboard/gym/trainers")}>Manage Trainers</Button>
                        <Button variant="outline" onClick={() => router.push("/dashboard/gym/clients")}>View All Clients</Button>
                        <Button variant="outline" onClick={() => router.push("/dashboard/gym/packages")}>Standard Plans</Button>
                        <Button variant="outline" onClick={() => router.push(`/dashboard/gym/${profile?.id}/bookings`)}>View Bookings</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
