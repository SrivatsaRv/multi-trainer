"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus, X, ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"

interface Availability {
    [day: string]: string[]
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function TrainerAvailabilityPage() {
    const params = useParams()
    const router = useRouter()
    // const { toast } = useToast() -> Removed
    const trainerId = params.trainerId as string
    const [availability, setAvailability] = useState<Availability>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchTrainer() {
            try {
                const token = localStorage.getItem("token")
                const headers: any = {}
                if (token) headers["Authorization"] = `Bearer ${token}`

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/trainers/${trainerId}`, { headers })
                if (res.ok) {
                    const data = await res.json()
                    setAvailability(data.availability || {})
                }
            } catch (err) {
                console.error("Failed to fetch trainer", err)
            } finally {
                setLoading(false)
            }
        }
        if (trainerId) fetchTrainer()
    }, [trainerId])

    const addSlot = (day: string) => {
        const currentSlots = availability[day] || []
        setAvailability({
            ...availability,
            [day]: [...currentSlots, "09:00-17:00"] // Default 9-5
        })
    }

    const updateSlot = (day: string, index: number, value: string) => {
        const slots = [...(availability[day] || [])]
        slots[index] = value
        setAvailability({ ...availability, [day]: slots })
    }

    const removeSlot = (day: string, index: number) => {
        const slots = [...(availability[day] || [])]
        slots.splice(index, 1)
        setAvailability({ ...availability, [day]: slots })
    }

    const saveAvailability = async () => {
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/trainers/${trainerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ availability })
            })

            if (res.ok) {
                toast.success("Availability updated")
            } else {
                toast.error("Failed to update availability")
            }
        } catch (error) {
            toast.error("Network error")
        }
    }

    if (loading) return <div className="p-8">Loading...</div>

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">Update Availability</h2>
                </div>
                <Button onClick={saveAvailability}>
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
            </div>

            <div className="grid gap-4">
                {DAYS.map(day => (
                    <Card key={day}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                            <CardTitle className="text-base font-semibold">{day}</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => addSlot(day)}>
                                <Plus className="w-4 h-4 mr-2" /> Add Slot
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {(availability[day] && availability[day].length > 0) ? (
                                <div className="space-y-2">
                                    {availability[day].map((slot, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                value={slot}
                                                onChange={(e) => updateSlot(day, index, e.target.value)}
                                                className="w-48"
                                                placeholder="09:00-17:00"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeSlot(day, index)}>
                                                <X className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">Unavailable</p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
