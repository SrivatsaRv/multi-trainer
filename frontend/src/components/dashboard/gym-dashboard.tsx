"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { MapPin, Users, Calendar, Star, TrendingUp } from "lucide-react";

export function GymDashboard() {
    const { user, profile, logout } = useAuth();
    const router = useRouter();
    const status = profile?.verification_status || "NONE";

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED": return <Badge className="bg-emerald-500">Active</Badge>;
            case "PENDING": return <Badge className="bg-yellow-500">Under Review</Badge>;
            case "REJECTED": return <Badge className="bg-red-500">Rejected</Badge>;
            case "DRAFT": return <Badge className="bg-zinc-500">Draft</Badge>;
            default: return <Badge variant="outline">Setup Required</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Facility Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Facility Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                {profile?.name || "Unnamed Facility"}
                            </p>
                            {getStatusBadge(status)}
                            {status === "NONE" || status === "DRAFT" ? (
                                <Button
                                    size="sm"
                                    onClick={() => router.push("/onboard-as-gym")}
                                    className="w-full mt-2"
                                >
                                    Complete Setup
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Active Trainers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-sm text-muted-foreground">No trainers yet</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Monthly Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$0</div>
                        <p className="text-sm text-muted-foreground">No bookings yet</p>
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
                            onClick={() => router.push("/dashboard/gym/trainers")}
                        >
                            Manage Trainers
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/gym/${profile?.id}/bookings`)}
                        >
                            View Bookings
                        </Button>
                        <Button variant="outline">
                            Update Amenities
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/gym/${profile?.id}/analytics`)}
                        >
                            Analytics
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No recent activity</p>
                </CardContent>
            </Card>
        </div>
    );
}
