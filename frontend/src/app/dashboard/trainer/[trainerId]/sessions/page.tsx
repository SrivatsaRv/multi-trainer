"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface Session {
    id: number
    start_time: string
    end_time: string
    status: string
    gym: { name: string; location: string }
    client: { name: string; email: string }
}

export default function TrainerSessionsPage() {
    const params = useParams()
    const router = useRouter()
    const trainerId = params.trainerId as string
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchSessions() {
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
                console.error("Failed to fetch sessions", err)
            } finally {
                setLoading(false)
            }
        }
        if (trainerId) fetchSessions()
    }, [trainerId])

    if (loading) return <div className="p-8">Loading Sessions...</div>

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Client Sessions</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date / Time</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead className="hidden md:table-cell">Gym</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">No sessions found</TableCell>
                                </TableRow>
                            ) : (
                                sessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell>
                                            <div className="font-medium">{new Date(session.start_time).toLocaleDateString()}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{session.client.name}</div>
                                                <div className="text-xs text-muted-foreground hidden md:block">{session.client.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div>
                                                <div className="font-medium">{session.gym.name}</div>
                                                <div className="text-xs text-muted-foreground">{session.gym.location}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={session.status === "COMPLETED" ? "default" : session.status === "SCHEDULED" ? "secondary" : "destructive"}>
                                                {session.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
