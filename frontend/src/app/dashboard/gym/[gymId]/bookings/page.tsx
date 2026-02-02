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

interface Booking {
    id: number
    start_time: string
    end_time: string
    status: string
    client: { name: string; email: string }
    trainer: { name: string }
}

export default function GymBookingsPage() {
    const params = useParams()
    const router = useRouter()
    const gymId = params.gymId as string
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchBookings() {
            try {
                const token = localStorage.getItem("token")
                const headers: any = {}
                if (token) headers["Authorization"] = `Bearer ${token}`

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/gyms/${gymId}/bookings`, { headers })
                if (res.ok) {
                    const data = await res.json()
                    setBookings(data)
                }
            } catch (err) {
                console.error("Failed to fetch bookings", err)
            } finally {
                setLoading(false)
            }
        }
        if (gymId) fetchBookings()
    }, [gymId])

    if (loading) return <div className="p-8">Loading Bookings...</div>

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Gym Bookings</h2>
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
                                <TableHead className="hidden md:table-cell">Trainer</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">No bookings found</TableCell>
                                </TableRow>
                            ) : (
                                bookings.map((booking) => (
                                    <TableRow key={booking.id}>
                                        <TableCell>
                                            <div className="font-medium">{new Date(booking.start_time).toLocaleDateString()}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{booking.client.name}</div>
                                                <div className="text-xs text-muted-foreground hidden md:block">{booking.client.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{booking.trainer.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={booking.status === "COMPLETED" ? "default" : booking.status === "SCHEDULED" ? "secondary" : "destructive"}>
                                                {booking.status}
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
