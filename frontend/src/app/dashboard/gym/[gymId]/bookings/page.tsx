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

export default function GymBookingsPage({ params }: { params: { gymId: string } }) {
    const [bookings, setBookings] = useState<any[]>([])
    const [trainers, setTrainers] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Create Booking State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newBooking, setNewBooking] = useState({
        trainer_id: "",
        user_id: "",
        date: new Date().toISOString().split('T')[0],
        time: "10:00",
        notes: ""
    })

    const fetchData = async () => {
        setLoading(true)
        try {
            const [bookingsData, rosterData, clientsData] = await Promise.all([
                api.gyms.getBookings(params.gymId),
                api.gyms.getTrainers(params.gymId),
                api.gyms.getClients(params.gymId)
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
    }, [params.gymId])

    const handleCreateBooking = async () => {
        if (!newBooking.trainer_id || !newBooking.user_id || !newBooking.date || !newBooking.time) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            const start_time = new Date(`${newBooking.date}T${newBooking.time}:00`).toISOString()
            await api.bookings.create({
                trainer_id: parseInt(newBooking.trainer_id),
                user_id: parseInt(newBooking.user_id),
                start_time,
                notes: newBooking.notes
            })
            toast.success("Booking created successfully")
            setIsCreateOpen(false)
            fetchData()
        } catch (e: any) {
            toast.error(e.message || "Failed to create booking")
        }
    }

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

                <Dialog open={isCreateOpen} onValueChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary">
                            <Plus className="w-4 h-4 mr-2" />
                            New Booking
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Centralized Booking</DialogTitle>
                            <DialogDescription>
                                Schedule a session for any associated trainer and client.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Trainer</Label>
                                <Select onValueChange={(v) => setNewBooking({ ...newBooking, trainer_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select trainer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {trainers.map(t => (
                                            <SelectItem key={t.trainer.id} value={t.trainer.id.toString()}>
                                                {t.trainer.user?.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select onValueChange={(v) => setNewBooking({ ...newBooking, user_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={newBooking.date}
                                        onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Time</Label>
                                    <Input
                                        type="time"
                                        value={newBooking.time}
                                        onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes (Optional)</Label>
                                <Input
                                    placeholder="Special requirements or focus..."
                                    value={newBooking.notes}
                                    onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateBooking}>Schedule Session</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
