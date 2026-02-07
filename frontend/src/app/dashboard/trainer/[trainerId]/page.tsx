"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Loader2, Calendar, Clock, MapPin, User, Plus, Dumbbell, ChevronRight } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";

export default function TrainerDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ activeClients: 0, completedSessions: 0 });

    useEffect(() => {
        async function fetchData() {
            try {
                // Parallel fetch for bookings and clients (for stats)
                const [bookingsData, clientsData] = await Promise.all([
                    api.trainers.getBookings(params.trainerId as string),
                    api.trainers.getClients(params.trainerId as string)
                ]);

                setBookings(bookingsData);

                // Calculate simple stats
                const active = clientsData.filter((c: any) => c.subscription_status === 'ACTIVE').length;
                const completed = bookingsData.filter((b: any) => b.status === 'COMPLETED').length;
                setStats({ activeClients: active, completedSessions: completed });

            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
            } finally {
                setLoading(false);
            }
        }
        if (params.trainerId) fetchData();
    }, [params.trainerId]);

    // Filter for Today
    const today = new Date();
    const todaysBookings = bookings.filter(b => isSameDay(parseISO(b.start_time), today))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const upcomingBookings = bookings.filter(b => new Date(b.start_time) > today && b.status === 'SCHEDULED')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 3);

    if (loading) return <div className="flex justify-center p-12 min-h-screen items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 pb-24 md:pb-10 max-w-lg mx-auto md:max-w-none">
            {/* Greeting */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Today's Schedule</h1>
                    <p className="text-muted-foreground">{format(today, "EEEE, MMMM do")}</p>
                </div>
                <Button size="icon" variant="outline" className="rounded-full shadow-sm" onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/schedule`)}>
                    <Calendar className="w-5 h-5 text-primary" />
                </Button>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-bold text-primary">{stats.activeClients}</span>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Active Clients</span>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-bold text-emerald-600">{stats.completedSessions}</span>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Sessions Done</span>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Timeline */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Timeline</h2>
                    {todaysBookings.length > 0 && <Badge variant="outline">{todaysBookings.length} Sessions</Badge>}
                </div>

                {todaysBookings.length === 0 ? (
                    <Card className="border-dashed shadow-none">
                        <CardContent className="p-8 text-center flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <Calendar className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-lg">No sessions today</p>
                            <p className="text-sm text-muted-foreground mb-4">Enjoy your rest day!</p>
                            <Button variant="outline" onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/schedule`)}>
                                View Full Schedule
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {todaysBookings.map((booking) => {
                            const isCompleted = booking.status === 'COMPLETED';
                            return (
                                <Card key={booking.id} className={`border-l-4 ${isCompleted ? 'border-l-emerald-500' : 'border-l-primary'} overflow-hidden transition-all hover:shadow-md`}>
                                    <CardContent className="p-4 flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="text-xs font-normal bg-background">
                                                    {format(parseISO(booking.start_time), "h:mm a")}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">- {format(parseISO(booking.end_time), "h:mm a")}</span>
                                            </div>
                                            <h3 className="font-bold text-lg">{booking.client?.name || "Unknown Client"}</h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {booking.gym?.name}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Dumbbell className="w-3 h-3" /> {booking.workout_focus}
                                                </div>
                                            </div>
                                        </div>
                                        {!isCompleted && (
                                            <Button
                                                size="sm"
                                                className="h-9 w-9 p-0 rounded-full"
                                                onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/sessions/${booking.id}`)}
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </Button>
                                        )}
                                        {isCompleted && (
                                            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant="secondary"
                        className="h-auto flex-col items-start p-4 gap-2"
                        onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/workout-logger`)}
                    >
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Plus className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold">Log Workout</div>
                            <div className="text-xs text-muted-foreground font-normal">Record session results</div>
                        </div>
                    </Button>
                    <Button
                        variant="secondary"
                        className="h-auto flex-col items-start p-4 gap-2"
                        onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/clients`)}
                    >
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                            <User className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold">Clients</div>
                            <div className="text-xs text-muted-foreground font-normal">Manage your roster</div>
                        </div>
                    </Button>
                </div>
            </div>

            {/* Upcoming Next (if today is empty or just to show next) */}
            {upcomingBookings.length > 0 && (
                <div className="pt-4 border-t">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Up Next</h2>
                    <div className="space-y-3">
                        {upcomingBookings.map(b => (
                            <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                <div className="text-center min-w-[3rem]">
                                    <div className="text-xs font-bold uppercase text-muted-foreground">{format(parseISO(b.start_time), 'MMM')}</div>
                                    <div className="text-xl font-bold">{format(parseISO(b.start_time), 'd')}</div>
                                </div>
                                <div>
                                    <div className="font-medium">{b.client?.name}</div>
                                    <div className="text-xs text-muted-foreground">{format(parseISO(b.start_time), 'h:mm a')} • {b.gym?.name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

