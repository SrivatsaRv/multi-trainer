"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import {
    Loader2,
    Calendar,
    Clock,
    MapPin,
    User,
    Plus,
    Dumbbell,
    ChevronRight,
    CheckCircle2,
    XCircle,
    PlayCircle,
    Coffee,
    TrendingUp
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TrainerDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ activeClients: 0, completedSessions: 0 });

    const fetchData = async () => {
        try {
            const [bookingsData, clientsData] = await Promise.all([
                api.trainers.getBookings(params.trainerId as string),
                api.trainers.getClients(params.trainerId as string)
            ]);

            setBookings(bookingsData);
            const active = clientsData.filter((c: any) => c.subscription_status === 'ACTIVE').length;
            const completed = bookingsData.filter((b: any) => b.status === 'COMPLETED' && isSameDay(parseISO(b.start_time), new Date())).length;
            setStats({ activeClients: active, completedSessions: completed });

        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (params.trainerId) fetchData();
    }, [params.trainerId]);

    const handleStatusUpdate = async (bookingId: string, status: string) => {
        try {
            await api.bookings.updateStatus(bookingId, status);
            toast.success(`Session marked as ${status.toLowerCase().replace('_', ' ')}`);
            fetchData(); // Refresh state
        } catch (err: any) {
            toast.error(err.message || "Failed to update status");
        }
    };

    const today = new Date();
    const todaysBookings = bookings.filter(b => isSameDay(parseISO(b.start_time), today))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (loading) return (
        <div className="flex justify-center p-12 min-h-screen items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="space-y-6 pb-24 md:pb-10 max-w-6xl mx-auto px-4 md:px-0">
            {/* 1. Header & Quick View */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Today</h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(today, "EEEE, MMMM do")}
                    </p>
                </div>
                <div className="hidden lg:flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-3xl font-black text-primary leading-none">{stats.completedSessions}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Done Today</span>
                    </div>
                    <Button
                        size="lg"
                        className="rounded-xl font-bold shadow-lg shadow-primary/20 gap-2 border-b-4 border-primary-foreground/20 active:border-b-0 transition-all"
                        onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/workout-logger`)}
                    >
                        <Plus className="w-5 h-5" /> Ad-hoc Session
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 2. Timeline Console (Left) */}
                <div className="lg:col-span-8 space-y-4 max-w-2xl">
                    {todaysBookings.length === 0 ? (
                        <Card className="border-2 border-dashed bg-muted/30">
                            <CardContent className="p-12 text-center flex flex-col items-center">
                                <Coffee className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-xl font-bold">Rest Day / Holiday</h3>
                                <p className="text-muted-foreground mt-1 max-w-[200px]">No sessions scheduled for today. Time to recharge.</p>
                                <Button className="mt-6 font-bold" onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/schedule`)}>
                                    Go to Schedule
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="relative space-y-6 pb-4 before:absolute before:inset-0 before:ml-4 before:-z-10 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-primary/10 before:to-transparent">
                            {todaysBookings.map((booking) => {
                                const isCompleted = booking.status === 'COMPLETED';
                                const isNoShow = booking.status === 'NO_SHOW';
                                const isAttended = booking.status === 'ATTENDED';
                                const isScheduled = booking.status === 'SCHEDULED';

                                return (
                                    <div key={booking.id} className="relative pl-10 md:pl-12">
                                        {/* Timeline Marker */}
                                        <div className={cn(
                                            "absolute left-0 top-6 h-8 w-8 rounded-full border-4 border-background flex items-center justify-center z-10 transition-all shadow-sm",
                                            isCompleted ? "bg-emerald-500 scale-90" : isNoShow ? "bg-destructive scale-90" : isAttended ? "bg-blue-500 animate-pulse" : "bg-primary"
                                        )}>
                                            {isCompleted ? <CheckCircle2 className="w-4 h-4 text-white" /> :
                                                isNoShow ? <XCircle className="w-4 h-4 text-white" /> :
                                                    <Clock className="w-4 h-4 text-white" />}
                                        </div>

                                        <Card className={cn(
                                            "overflow-hidden transition-all duration-300 border-2 rounded-2xl group",
                                            isCompleted ? "bg-emerald-500/5 border-emerald-500/10 opacity-70" :
                                                isNoShow ? "bg-destructive/5 border-destructive/10 opacity-60" :
                                                    isAttended ? "bg-blue-500/5 border-blue-500/30 border-dashed ring-2 ring-blue-500/5" :
                                                        "bg-card border-zinc-200 shadow-sm hover:shadow-md hover:border-primary/30"
                                        )}>
                                            <CardContent className="p-0">
                                                {/* Top Strip */}
                                                <div className="flex justify-between items-center px-4 py-2 border-b bg-muted/20">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="font-black text-xs px-2 py-0.5 bg-background border shadow-xs">
                                                            {format(parseISO(booking.start_time), "h:mm a")}
                                                        </Badge>
                                                        {isAttended && <Badge className="bg-blue-500 animate-pulse text-[10px] h-4">IN PROGRESS</Badge>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                            S{booking.session_count || "x"}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary capitalize bg-primary/5">
                                                            {booking.workout_focus?.toLowerCase() || "general"}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Body */}
                                                <div className="p-4 sm:flex sm:items-center sm:justify-between gap-4">
                                                    <div className="flex-1 truncate">
                                                        <h3 className="font-black text-xl leading-tight sm:text-2xl mb-1 group-hover:text-primary transition-colors truncate">
                                                            {booking.client?.name || "Unknown Client"}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                            <MapPin className="w-4 h-4 shrink-0" />
                                                            <span className="truncate">{booking.gym?.name}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 shrink-0 mt-4 sm:mt-0">
                                                        {isScheduled && (
                                                            <>
                                                                <Button
                                                                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 font-bold h-12 rounded-xl px-6"
                                                                    onClick={() => handleStatusUpdate(booking.id, "ATTENDED")}
                                                                >
                                                                    Log Entry
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="shrink-0 border-destructive/20 text-destructive hover:bg-destructive/5 h-12 w-12 rounded-xl"
                                                                    onClick={() => handleStatusUpdate(booking.id, "NO_SHOW")}
                                                                >
                                                                    <XCircle className="w-5 h-5" />
                                                                </Button>
                                                            </>
                                                        )}

                                                        {isAttended && (
                                                            <Button
                                                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 font-black h-14 sm:h-12 px-8 text-base shadow-lg shadow-emerald-600/20 rounded-xl flex items-center gap-2 border-b-4 border-emerald-800/30 active:border-b-0 transition-all"
                                                                onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/workout-logger?booking=${booking.id}&client=${booking.client.id}`)}
                                                            >
                                                                <PlayCircle className="w-5 h-5" />
                                                                Log Workout
                                                            </Button>
                                                        )}

                                                        {(isCompleted || isNoShow) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full sm:w-auto h-12 text-muted-foreground font-bold hover:bg-muted"
                                                                onClick={() => handleStatusUpdate(booking.id, "SCHEDULED")}
                                                            >
                                                                Reset
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar (Right) - Visible on lg */}
                <div className="hidden lg:block lg:col-span-4 sticky top-6 space-y-6">
                    <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/10 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Dumbbell className="w-24 h-24 rotate-12" />
                        </div>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Sessions</p>
                                    <h4 className="text-4xl font-black">{stats.completedSessions}</h4>
                                </div>
                                <div className="p-3 bg-primary/10 rounded-2xl">
                                    <TrendingUp className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-muted-foreground">Active Clients</span>
                                    <span className="font-black">{stats.activeClients}</span>
                                </div>
                                <Progress value={(stats.completedSessions / 10) * 100} className="h-2" />
                                <p className="text-[10px] text-muted-foreground font-medium text-center uppercase tracking-widest">
                                    Daily target progress
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" /> Navigation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-between font-bold group" onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/schedule`)}>
                                My Schedule
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button variant="outline" className="w-full justify-between font-bold group" onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/clients`)}>
                                Clients List
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Quick Actions Float (Mobile Only) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg z-50 lg:hidden">
                <Button
                    size="lg"
                    className="w-full h-16 rounded-2xl shadow-2xl shadow-primary/40 font-black text-lg gap-3 border-b-8 border-primary-foreground/20 active:border-b-0 transition-all"
                    onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/workout-logger`)}
                >
                    <Plus className="w-6 h-6" />
                    Ad-hoc Session
                </Button>
            </div>
        </div>
    );
}
