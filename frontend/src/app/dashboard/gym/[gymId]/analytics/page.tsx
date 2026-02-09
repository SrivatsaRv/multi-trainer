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

// Mock Data for Charts (until we wire up full history endpoint)
const revenueData = [
    { name: "Jan", total: 0 },
    { name: "Feb", total: 0 },
    { name: "Mar", total: 0 },
    { name: "Apr", total: 0 },
    { name: "May", total: 0 },
    { name: "Jun", total: 0 },
]

const occupancyData = [
    { date: "Mon", occupancy: 0 },
    { date: "Tue", occupancy: 0 },
    { date: "Wed", occupancy: 0 },
    { date: "Thu", occupancy: 0 },
    { date: "Fri", occupancy: 0 },
    { date: "Sat", occupancy: 0 },
    { date: "Sun", occupancy: 0 },
]

export default function GymAnalyticsPage({ params }: { params: { gymId: string } }) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch Analytics Overview
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/gyms/${params.gymId}/analytics/overview`, {
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

                const analyticsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/gyms/${params.gymId}/analytics/overview`, { headers })
                const analyticsData = await analyticsRes.json()

                if (analyticsRes.ok) {
                    setData(analyticsData)
                    // Update chart data driven by API if possible, else match mock structure with totals
                    revenueData[5].total = analyticsData.revenue // Hacky update for demo
                    occupancyData[6].occupancy = analyticsData.occupancy_rate
                }
            } catch (e) {
                console.error("Failed to fetch analytics", e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [params.gymId])

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
                            value={`₹${data?.revenue || 0}`}
                            icon={CreditCard}
                            trend="+20.1% from last month"
                            trendUp={true}
                        />
                        <MetricCard
                            title="Active Members"
                            value={data?.active_members || 0}
                            icon={Users}
                            trend="+12 since last week"
                            trendUp={true}
                        />
                        <MetricCard
                            title="Occupancy Rate"
                            value={`${data?.occupancy_rate || 0}%`}
                            icon={Activity}
                            trend="-4% from last week"
                            trendUp={false}
                        />
                        <MetricCard
                            title="Active Trainers"
                            value="4"
                            icon={Activity}
                            trend="Stable"
                            trendUp={true}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <RevenueChart data={revenueData} />
                        <TrainerAttendanceTable data={[
                            { id: 1, name: "John Doe", sessions: 45, revenue: 12500, status: "Active" },
                            { id: 2, name: "Jane Smith", sessions: 32, revenue: 9800, status: "Active" },
                            { id: 3, name: "Mike Johnson", sessions: 12, revenue: 4200, status: "On Leave" },
                        ]} />
                    </div>

                    {/* Occupancy Full Width */}
                    <div className="grid gap-4">
                        <OccupancyChart data={occupancyData} />
                    </div>
                </TabsContent>

                <TabsContent value="revenue" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Revenue Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <RevenueChart data={revenueData} />
                            <p className="text-center text-sm text-muted-foreground mt-4">Revenue breakdown by package and trainer is coming soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Attendance heatmap</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <OccupancyChart data={occupancyData} />
                            <p className="text-center text-sm text-muted-foreground mt-4">Peak hours and trainer utilization metrics.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
