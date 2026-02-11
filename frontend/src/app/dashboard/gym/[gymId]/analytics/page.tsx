"use client"

import { useEffect, useState } from "react"
import { Users, CreditCard, Activity, Calendar } from "lucide-react"

import { MetricCard } from "@/components/analytics/MetricCard"
import { RevenueChart } from "@/components/analytics/RevenueChart"
import { OccupancyChart } from "@/components/analytics/OccupancyChart"
import { TrainerAttendanceTable } from "@/components/analytics/TrainerAttendanceTable"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"


import React from "react"

export default function GymAnalyticsPage({ params }: { params: Promise<{ gymId: string }> }) {
    const resolvedParams = React.use(params)
    const gymId = resolvedParams.gymId
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch Analytics Overview
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/gyms/${gymId}/analytics/overview`, {
                    headers: {
                        // Authorization header is usually handled by a wrapper or interception, 
                        // but here we need to ensure we are logged in.
                        // For now, assuming session cookie or similar if NextAuth is configured.
                        // Or we explicitly get token from storage if using manual auth.
                        // Let's assume the fetch wrapper handles it or we need 'useSession'.
                    }
                })
                // For MVP development, we might not have the auth token easily accessible here without 'useSession' from next-auth/react.
                // I'll skip auth header for this useEffect and rely on browser cookie/proxy if setup, 
                // OR ideally use a custom hook `useAuthorizedFetch`.
                // Given the complexity, I will hardcode the fetch for now and if it fails (401), we know we need auth.

                // To make it work in dev (since we have token in localStorage often), let's try reading it.
                const token = localStorage.getItem("token")
                const headers: any = {}
                if (token) headers["Authorization"] = `Bearer ${token}`

                const analyticsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/gyms/${gymId}/analytics/overview`, { headers })
                const analyticsData = await analyticsRes.json()

                if (analyticsRes.ok) {
                    setData(analyticsData)
                }
            } catch (e) {
                console.error("Failed to fetch analytics", e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [gymId])

    if (loading) return <div className="p-8">Loading Analytics...</div>

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
                <div className="flex items-center space-x-2">
                    {/* <DateRangePicker /> */}
                    <Button>Download Report</Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue Details</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            title="Total Revenue"
                            value={`₹${data?.total_revenue || 0}`}
                            icon={CreditCard}
                            trend="Update from sales"
                            trendUp={true}
                        />
                        <MetricCard
                            title="Active Clients"
                            value={data?.total_active_clients || 0}
                            icon={Users}
                            trend="Across all plans"
                            trendUp={true}
                        />
                        <MetricCard
                            title="Occupancy Rate"
                            value={`${data?.occupancy_rate?.toFixed(1) || 0}%`}
                            icon={Activity}
                            trend="Last 30 days"
                            trendUp={true}
                        />
                        <MetricCard
                            title="Active Trainers"
                            value={data?.trainer_stats?.length || 0}
                            icon={Activity}
                            trend="Verified"
                            trendUp={true}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <RevenueChart data={data?.attendance_trends?.map((t: any) => ({ name: t.date.split('-').slice(1).join('/'), total: t.sessions })) || []} />
                        <TrainerAttendanceTable data={data?.trainer_stats?.map((t: any) => ({
                            id: t.trainer_id,
                            name: t.name,
                            sessions: t.completed_sessions,
                            revenue: t.business_value,
                            status: "Active"
                        })) || []} />
                    </div>

                    {/* Occupancy Full Width */}
                    <div className="grid gap-4">
                        <OccupancyChart data={data?.attendance_trends?.map((t: any) => ({ date: t.date.split('-').slice(1).join('/'), occupancy: t.sessions })) || []} />
                    </div>
                </TabsContent>

                <TabsContent value="revenue" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Revenue Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <RevenueChart data={data?.attendance_trends?.map((t: any) => ({ name: t.date, total: t.sessions })) || []} />
                            <p className="text-center text-sm text-muted-foreground mt-4">Session volume over the last 30 days.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Attendance heatmap</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <OccupancyChart data={data?.attendance_trends?.map((t: any) => ({ date: t.date, occupancy: t.sessions })) || []} />
                            <p className="text-center text-sm text-muted-foreground mt-4">Daily session activity trends.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
