"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Loader2, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface OccupiedSlot {
    start_time: string
    end_time: string
    client_name: string
    status: string
}

interface BookingSlotGridProps {
    trainerId: string
    date: string
    selectedTime?: string
    onTimeSelect: (time: string) => void
}

const HOURS = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
]

export function BookingSlotGrid({ trainerId, date, selectedTime, onTimeSelect }: BookingSlotGridProps) {
    const [occupied, setOccupied] = useState<OccupiedSlot[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        async function fetchSlots() {
            if (!trainerId || !date) return
            setLoading(true)
            try {
                const data = await api.bookings.getOccupiedSlots({ trainer_id: trainerId })
                // Filter slots for the selected date
                const filtered = data.filter((s: OccupiedSlot) => s.start_time.startsWith(date))
                setOccupied(filtered)
            } catch (e) {
                console.error("Failed to fetch slots", e)
            } finally {
                setLoading(false)
            }
        }
        fetchSlots()
    }, [trainerId, date])

    if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5" /></div>

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                <div className="flex gap-3">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Free
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Occupied
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Pending/Blocked
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {HOURS.map(hour => {
                    const slot = occupied.find(s => {
                        const sHour = new Date(s.start_time).getHours()
                        const hInt = parseInt(hour.split(":")[0])
                        return sHour === hInt
                    })

                    const isSelected = selectedTime === hour
                    const isOccupied = slot?.status === 'SCHEDULED' || slot?.status === 'COMPLETED'
                    const isYellow = slot?.status === 'PENDING' || slot?.status === 'BLOCKED'

                    return (
                        <button
                            key={hour}
                            disabled={!!slot && !isYellow}
                            onClick={() => onTimeSelect(hour)}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-md border text-xs transition-all",
                                isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-muted",
                                isOccupied ? "bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed" :
                                    isYellow ? "bg-amber-50 border-amber-200 text-amber-700" :
                                        "hover:border-emerald-300 hover:bg-emerald-50 bg-emerald-50/10 text-emerald-700"
                            )}
                        >
                            <span className="font-bold">{hour}</span>
                            {slot && (
                                <span className="text-[10px] mt-1 truncate w-full text-center">
                                    {slot.client_name}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="bg-muted/50 p-2 rounded text-[10px] flex items-start gap-2">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                <p>Slots are 1 hour long. Red slots are already booked by other clients.</p>
            </div>
        </div>
    )
}
