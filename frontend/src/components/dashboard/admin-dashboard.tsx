"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Shield, Users, Building, TrendingUp, Settings } from "lucide-react";

export function AdminDashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();

    return (
        <div className="space-y-6">
            {/* Admin Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="w-5 h-5" />
                            Total Gyms
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-sm text-muted-foreground">Active facilities</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Total Trainers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-sm text-muted-foreground">Verified trainers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Pending Reviews
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-sm text-muted-foreground">Need approval</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Platform Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$0</div>
                        <p className="text-sm text-muted-foreground">This month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Admin Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Admin Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/admin/verifications")}
                        >
                            Review Verifications
                        </Button>
                        <Button variant="outline">
                            User Management
                        </Button>
                        <Button variant="outline">
                            Platform Analytics
                        </Button>
                        <Button variant="outline">
                            System Settings
                        </Button>
                        <Button variant="outline">
                            Revenue Reports
                        </Button>
                        <Button variant="outline">
                            Support Tickets
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Platform Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Platform Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No recent activity</p>
                </CardContent>
            </Card>
        </div>
    );
}
