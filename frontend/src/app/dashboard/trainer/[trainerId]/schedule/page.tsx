"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parseISO, isSameDay } from "date-fns"
import { Calendar } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Session {
    id: number
    start_time: string
    end_time: string
    status: string
    gym: { name: string; location: string }
    client: { name: string; email: string }
}

export default function TrainerSchedulePage() {
    const params = useParams()
    const router = useRouter()
    const trainerId = params.trainerId as string
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchSchedule() {
            try {
                const token = localStorage.getItem("token")
                const headers: any = {}
                if (token) headers["Authorization"] = `Bearer ${token}`

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/trainers/${trainerId}/bookings`, { headers })
                if (res.ok) {
                    const data = await res.json()
                    setSessions(data)
                }
            } catch (err) {
                console.error("Failed to fetch schedule", err)
            } finally {
                setLoading(false)
            }
        }
        if (trainerId) fetchSchedule()
    }, [trainerId])

    // Group by Date
    const groupedSessions: { [key: string]: Session[] } = {}
    sessions.forEach(session => {
        const dateKey = format(parseISO(session.start_time), 'yyyy-MM-dd')
        if (!groupedSessions[dateKey]) groupedSessions[dateKey] = []
        groupedSessions[dateKey].push(session)
    })

    // Sort dates
    const sortedDates = Object.keys(groupedSessions).sort()

    if (loading) return <div className="p-8">Loading Schedule...</div>

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-4">
                <h2 className="text-3xl font-bold tracking-tight">My Schedule</h2>
            </div>

            <div className="space-y-6">
                {sortedDates.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                            No upcoming sessions found.
                        </CardContent>
                    </Card>
                ) : (
                    sortedDates.map(date => (
                        <div key={date} className="space-y-2">
                            <h3 className="text-lg font-semibold text-muted-foreground flex items-center">
                                <Calendar className="mr-2 h-4 w-4" />
                                {format(parseISO(date), 'EEEE, MMMM do yyyy')}
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {groupedSessions[date].map(session => (
                                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">
                                                {format(parseISO(session.start_time), 'h:mm a')} - {format(parseISO(session.end_time), 'h:mm a')}
                                            </CardTitle>
                                            <Badge variant={session.status === 'COMPLETED' ? 'default' : session.status === 'SCHEDULED' ? 'secondary' : 'destructive'}>
                                                {session.status}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{session.client.name}</div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {session.gym.name} ({session.gym.location})
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
