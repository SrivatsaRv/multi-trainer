"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parseISO, isSameDay } from "date-fns"
import { Calendar, Plus, Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { BookingSlotGrid } from "@/components/dashboard/booking-slot-grid"

interface Session {
    id: number
    start_time: string
    end_time: string
    status: string
    gym: { name: string; location: string }
    client: { name: string; email: string }
}

interface Client {
    id: number
    name: string
    email: string
}

export default function TrainerSchedulePage() {
    const params = useParams()
    const router = useRouter()
    const trainerId = params.trainerId as string
    const [sessions, setSessions] = useState<Session[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)

    // Booking State
    const [isBookingOpen, setIsBookingOpen] = useState(false)
    const [bookingData, setBookingData] = useState({
        clientId: "",
        date: "",
        time: "",
        notes: ""
    })
    const [isBooking, setIsBooking] = useState(false)

    const fetchData = async () => {
        try {
            const [scheduleData, clientsData] = await Promise.all([
                api.trainers.getBookings(trainerId),
                api.trainers.getClients(trainerId)
            ])
            setSessions(scheduleData)
            setClients(clientsData)
        } catch (err) {
            console.error("Failed to fetch data", err)
            toast.error("Failed to load schedule")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (trainerId) fetchData()
    }, [trainerId])

    const handleBookSession = async () => {
        if (!bookingData.clientId || !bookingData.date || !bookingData.time) {
            toast.error("Please fill all fields")
            return
        }

        setIsBooking(true)
        try {
            // Combine date and time to ISO string
            const startDateTime = new Date(`${bookingData.date}T${bookingData.time}`)

            await api.bookings.create({
                trainer_id: parseInt(trainerId),
                user_id: parseInt(bookingData.clientId),
                start_time: startDateTime.toISOString(),
                notes: bookingData.notes
            })

            toast.success("Session booked successfully")
            setIsBookingOpen(false)
            setBookingData({ clientId: "", date: "", time: "", notes: "" })
            fetchData() // Refresh schedule
        } catch (err: any) {
            toast.error(err.message || "Failed to book session")
        } finally {
            setIsBooking(false)
        }
    }

    // Group by Date
    const groupedSessions: { [key: string]: Session[] } = {}
    sessions.forEach(session => {
        const dateKey = format(parseISO(session.start_time), 'yyyy-MM-dd')
        if (!groupedSessions[dateKey]) groupedSessions[dateKey] = []
        groupedSessions[dateKey].push(session)
    })

    const sortedDates = Object.keys(groupedSessions).sort()

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">My Schedule</h2>

                <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Book Session
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Book Client Session</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Client</Label>
                                <Select
                                    value={bookingData.clientId}
                                    onValueChange={(val) => setBookingData({ ...bookingData, clientId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(client => (
                                            <SelectItem key={client.id} value={client.id.toString()}>
                                                {client.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={bookingData.date}
                                        onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            {bookingData.date && (
                                <div className="space-y-2">
                                    <Label>Select Time Slot</Label>
                                    <BookingSlotGrid
                                        trainerId={trainerId}
                                        date={bookingData.date}
                                        selectedTime={bookingData.time}
                                        onTimeSelect={(time: string) => setBookingData({ ...bookingData, time })}
                                    />
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label>Notes</Label>
                                <Input
                                    placeholder="Focus on..."
                                    value={bookingData.notes}
                                    onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleBookSession} disabled={isBooking}>
                                {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Booking
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-6">
                {sortedDates.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground flex flex-col items-center py-12">
                            <Calendar className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium text-foreground">No sessions scheduled</p>
                            <p className="text-sm">Book a session to get started.</p>
                        </CardContent>
                    </Card>
                ) : (
                    sortedDates.map(date => (
                        <div key={date} className="space-y-2">
                            <h3 className="text-lg font-semibold text-muted-foreground flex items-center sticky top-0 bg-background py-2">
                                <Calendar className="mr-2 h-4 w-4" />
                                {format(parseISO(date), 'EEEE, MMMM do yyyy')}
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {groupedSessions[date].map(session => (
                                    <Card key={session.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">
                                                {format(parseISO(session.start_time), 'h:mm a')} - {format(parseISO(session.end_time), 'h:mm a')}
                                            </CardTitle>
                                            <Badge variant={session.status === 'COMPLETED' ? 'default' : session.status === 'SCHEDULED' ? 'outline' : 'destructive'}>
                                                {session.status}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-xl font-bold">{session.client.name}</div>
                                            <p className="text-xs text-muted-foreground mt-1 truncate">
                                                {session.gym.name}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div >
    )
}
