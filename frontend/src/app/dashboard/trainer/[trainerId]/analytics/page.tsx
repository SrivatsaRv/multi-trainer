"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, CheckCircle, TrendingUp } from "lucide-react"
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface AnalyticsData {
    completed_sessions: number
    upcoming_sessions: number
    active_clients: number
    total_earnings: number
    chart_data: { name: string, sessions: number }[]
}

export default function TrainerAnalyticsPage() {
    const params = useParams()
    const router = useRouter()
    const trainerId = params.trainerId as string
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const result = await api.trainers.getAnalytics(trainerId)
                setData(result)
            } catch (err) {
                console.error("Failed to fetch analytics", err)
            } finally {
                setLoading(false)
            }
        }
        if (trainerId) fetchAnalytics()
    }, [trainerId])

    if (loading) return <div className="p-8">Loading Analytics...</div>

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">My Performance</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Completed Sessions
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.completed_sessions || 0}</div>
                        <p className="text-xs text-muted-foreground">Total sessions delivered</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Earnings
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">₹{data?.total_earnings?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">Cumulative session income</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Clients
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.active_clients || 0}</div>
                        <p className="text-xs text-muted-foreground">Unique active memberships</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Session Growth</CardTitle>
                        <p className="text-sm text-muted-foreground">Completed sessions grouped by month</p>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {data?.chart_data && data.chart_data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.chart_data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        fontSize={12}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        fontSize={12}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar
                                        dataKey="sessions"
                                        fill="hsl(var(--primary))"
                                        radius={[4, 4, 0, 0]}
                                        barSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                                <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
                                <p>No session history available yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
