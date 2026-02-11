"use client"

import { useEffect, useState } from "react"
import {
    Calendar,
    Plus,
    Search,
    Filter,
    Clock,
    User,
    CheckCircle2,
    XCircle,
    Loader2,
    CalendarDays
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { api } from "@/lib/api"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { CreateBookingDialog } from "@/components/dashboard/create-booking-dialog"

import React from "react"

export default function GymBookingsPage({ params }: { params: Promise<{ gymId: string }> }) {
    const resolvedParams = React.use(params)
    const gymId = resolvedParams.gymId
    const [bookings, setBookings] = useState<any[]>([])
    const [trainers, setTrainers] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const fetchData = async () => {
        setLoading(true)
        try {
            const [bookingsData, rosterData, clientsData] = await Promise.all([
                api.gyms.getBookings(gymId),
                api.gyms.getTrainers(gymId),
                api.gyms.getClients(gymId)
            ])
            setBookings(bookingsData)
            setTrainers(rosterData.filter((t: any) => t.status === "ACTIVE"))
            setClients(clientsData)
        } catch (e) {
            console.error(e)
            toast.error("Failed to load bookings")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [gymId])


    const filteredBookings = bookings.filter(b =>
        b.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.trainer?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Calendar className="w-8 h-8" />
                        Session Management
                    </h1>
                    <p className="text-muted-foreground">Monitor and coordinate sessions across all trainers.</p>
                </div>

                <CreateBookingDialog
                    gymId={gymId}
                    trainers={trainers}
                    clients={clients}
                    onSuccess={fetchData}
                />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Upcoming Sessions</CardTitle>
                        <div className="flex items-center gap-2 max-w-xs">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time & Date</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Trainer</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBookings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                        No upcoming sessions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBookings.map((booking) => (
                                    <TableRow key={booking.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(booking.start_time).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span>{booking.client?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium">{booking.trainer?.name}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                booking.status === "COMPLETED" ? "default" :
                                                    booking.status === "PENDING" ? "secondary" :
                                                        "destructive"
                                            }>
                                                {booking.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Details</Button>
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
