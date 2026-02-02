"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, CheckCircle, Clock } from "lucide-react"

interface AnalyticsData {
    completed_sessions: number
    upcoming_sessions: number
    active_clients: number
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
                const token = localStorage.getItem("token")
                const headers: any = {}
                if (token) headers["Authorization"] = `Bearer ${token}`

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/trainers/${trainerId}/analytics`, { headers })
                if (res.ok) {
                    const result = await res.json()
                    setData(result)
                }
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
        <div className="flex-1 space-y-4 p-8 pt-6">
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
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Upcoming Sessions
                        </CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.upcoming_sessions || 0}</div>
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
                    </CardContent>
                </Card>
            </div>

            {/* Placeholder for future charts */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Session History</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <p className="text-sm text-muted-foreground p-4">Chart visualization coming soon.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
