"use client"

import { useState } from "react"
import { Plus, Calendar, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface CreateBookingDialogProps {
    gymId: string
    trainers: any[]
    clients: any[]
    onSuccess: () => void
}

export function CreateBookingDialog({ gymId, trainers, clients, onSuccess }: CreateBookingDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [newBooking, setNewBooking] = useState({
        trainer_id: "",
        user_id: "",
        date: new Date().toISOString().split('T')[0],
        time: "10:00",
        notes: ""
    })

    const handleCreateBooking = async () => {
        if (!newBooking.trainer_id || !newBooking.user_id || !newBooking.date || !newBooking.time) {
            toast.error("Please fill in all required fields")
            return
        }

        setLoading(true)
        try {
            const start_time = new Date(`${newBooking.date}T${newBooking.time}:00`).toISOString()
            await api.bookings.create({
                trainer_id: parseInt(newBooking.trainer_id),
                user_id: parseInt(newBooking.user_id),
                start_time,
                notes: newBooking.notes,
                gym_id: parseInt(gymId)
            })
            toast.success("Booking created successfully")
            setOpen(false)
            onSuccess()
        } catch (e: any) {
            toast.error(e.message || "Failed to create booking")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                                        {t.trainer.user?.full_name || t.trainer.full_name}
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
                                        {c.name || c.full_name}
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
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateBooking} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Schedule Session
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
