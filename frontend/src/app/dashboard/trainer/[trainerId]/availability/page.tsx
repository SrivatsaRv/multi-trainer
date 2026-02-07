"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AvailabilityGrid } from "@/components/dashboard/availability-grid"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface Availability {
    [day: string]: string[]
}

export default function TrainerAvailabilityPage() {
    const params = useParams()
    const router = useRouter()
    const trainerId = params.trainerId as string
    const [availability, setAvailability] = useState<Availability>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchTrainer() {
            if (!trainerId) return;
            try {
                const data = await api.trainers.get(trainerId);
                setAvailability(data.availability || {});
            } catch (err) {
                console.error("Failed to fetch trainer", err);
                toast.error("Failed to load availability");
            } finally {
                setLoading(false);
            }
        }
        fetchTrainer();
    }, [trainerId]);

    const handleSave = async (newAvailability: Availability) => {
        try {
            await api.trainers.patch(trainerId, { availability: newAvailability });
            toast.success("Availability updated successfully");
            setAvailability(newAvailability);
        } catch {
            toast.error("Failed to update availability");
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Manage Availability</h2>
            </div>

            <AvailabilityGrid
                initialAvailability={availability}
                onSave={handleSave}
            />
        </div>
    )
}
