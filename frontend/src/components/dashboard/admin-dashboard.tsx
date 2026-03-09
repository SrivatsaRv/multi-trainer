import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Users, Building, Calendar } from "lucide-react";

interface AdminMetrics {
    metrics: {
        total_users: number
        total_gyms: number
        total_trainers: number
        total_bookings: number
    }
    top_gyms: { name: string; count: number }[]
    top_trainers: { name: string; count: number }[]
}

export function AdminDashboard() {
    const router = useRouter();
    const [data, setData] = useState<AdminMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const token = localStorage.getItem("token")
                const headers: Record<string, string> = {}
                if (token) headers["Authorization"] = `Bearer ${token}`

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/admin/overview`, { headers })
                if (res.ok) {
                    const result = await res.json()
                    setData(result)
                }
            } catch (err) {
                console.error("Failed to fetch admin analytics", err)
            } finally {
                setLoading(false)
            }
        }
        fetchAnalytics()
    }, []);

    if (loading) return <div>Loading Analytics...</div>

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
                        <div className="text-2xl font-bold">{data?.metrics.total_gyms || 0}</div>
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
                        <div className="text-2xl font-bold">{data?.metrics.total_trainers || 0}</div>
                        <p className="text-sm text-muted-foreground">Verified trainers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Total Bookings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.metrics.total_bookings || 0}</div>
                        <p className="text-sm text-muted-foreground">Platform wide</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Total Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.metrics.total_users || 0}</div>
                        <p className="text-sm text-muted-foreground">Registered accounts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Gyms (by Bookings)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.top_gyms.map((gym, i) => (
                                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <span className="font-medium">{gym.name}</span>
                                    <span className="text-muted-foreground">{gym.count} bookings</span>
                                </div>
                            ))}
                            {data?.top_gyms.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Trainers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.top_trainers.map((t, i) => (
                                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <span className="font-medium">{t.name}</span>
                                    <span className="text-muted-foreground">{t.count} bookings</span>
                                </div>
                            ))}
                            {data?.top_trainers.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Admin Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Admin Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/dashboard/admin/verifications")}
                        >
                            Review Verifications
                        </Button>
                        {/* Placeholder buttons for future features */}
                        <Button variant="outline" disabled>User Management</Button>
                        <Button variant="outline" disabled>System Settings</Button>
                        <Button variant="outline" disabled>Support Tickets</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
