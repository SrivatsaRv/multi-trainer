"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { User, Calendar, Star, DollarSign, Award, Package } from "lucide-react";

import { useEffect, useState } from "react";
import { TrainerTodayView } from "./trainer-today-view";
import { api } from "@/lib/api";

export function TrainerDashboard() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const status = profile?.verification_status || "NONE";
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        if (profile?.id) {
            api.trainers.get(`${profile.id}/bookings`)
                .then(data => setSessions(data))
                .catch(err => console.error("Failed to load sessions", err));
        }
    }, [profile?.id]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED": return <Badge className="bg-emerald-500">Verified</Badge>;
            case "PENDING": return <Badge className="bg-yellow-500">Under Review</Badge>;
            case "REJECTED": return <Badge className="bg-red-500">Rejected</Badge>;
            case "DRAFT": return <Badge className="bg-zinc-500">Draft</Badge>;
            default: return <Badge variant="outline">Setup Required</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Trainer Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Profile Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                {user?.full_name || "Trainer Profile"}
                            </p>
                            {getStatusBadge(status)}
                            {status === "NONE" || status === "DRAFT" ? (
                                <Button
                                    size="sm"
                                    onClick={() => router.push("/onboard-as-trainer")}
                                    className="w-full mt-2"
                                >
                                    Complete Profile
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            This Week
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-sm text-muted-foreground">Sessions booked</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Earnings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹0</div>
                        <p className="text-sm text-muted-foreground">This month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Specializations & Certifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5" />
                            Specializations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {profile?.specializations?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {profile?.specializations?.map((spec: string, i: number) => (
                                    <Badge key={i} variant="outline">{spec}</Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No specializations added</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5" />
                            Certifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {profile?.certifications?.length > 0 ? (
                            <div className="space-y-2">
                                {profile?.certifications?.map((cert: string, i: number) => (
                                    <div key={i} className="text-sm">{cert}</div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No certifications added</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/trainer/${profile?.id}/schedule`)}
                        >
                            View Schedule
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/trainer/${profile?.id}/sessions`)}
                        >
                            Client Sessions
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/trainer/${profile?.id}/availability`)}
                        >
                            Update Availability
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/trainer/${profile?.id}/analytics`)}
                        >
                            Trainer Analytics
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => router.push(`/dashboard/trainer/gyms`)}
                        >
                            Find Gym
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Grey-out Policy: Personalized Plans */}
            <Card className="opacity-60 pointer-events-none">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Personalized Plans
                        </CardTitle>
                        <Badge variant="secondary">Facility Policy</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 border border-dashed rounded-lg bg-muted/20">
                            <p className="text-sm text-muted-foreground text-center">
                                <strong>Note:</strong> Your facility has standardized session packages.
                                All clients must be onboarded using gym-approved plans.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" disabled>
                                Create Custom Plan
                            </Button>
                            <Button variant="outline" disabled>
                                Manage Templates
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Sessions */}
            <TrainerTodayView
                trainerId={profile?.id || 0}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sessions={sessions.filter((s: any) => {
                    const sDate = new Date(s.start_time);
                    const today = new Date();
                    return sDate.getDate() === today.getDate() &&
                        sDate.getMonth() === today.getMonth() &&
                        sDate.getFullYear() === today.getFullYear();
                })}
            />
        </div>
    );
}
