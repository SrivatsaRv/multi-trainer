"use client"

import { useEffect, useState } from "react"
import {
    UserCheck,
    UserPlus,
    Loader2
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrainerRoster } from "@/components/dashboard/trainer-roster"
import { JoinRequests } from "@/components/dashboard/join-requests"

import React from "react"

export default function GymTrainersPage({ params }: { params: Promise<{ gymId: string }> }) {
    const resolvedParams = React.use(params)
    const gymId = resolvedParams.gymId
    const [roster, setRoster] = useState<any[]>([])
    const [applications, setApplications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTrainers = async () => {
        setLoading(true)
        try {
            const [rosterData, appsData] = await Promise.all([
                api.gyms.getTrainers(gymId),
                api.gymApplications.listForGym(gymId)
            ])
            setRoster(rosterData)
            setApplications(appsData)
        } catch (e) {
            console.error(e)
            toast.error("Failed to load trainers")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTrainers()
    }, [gymId])

    const handleApplication = async (appId: number, status: "APPROVED" | "REJECTED") => {
        try {
            await api.gymApplications.updateStatus(appId, status)
            toast.success(`Application ${status.toLowerCase()} successfully`)
            fetchTrainers()
        } catch (e) {
            toast.error("Action failed")
        }
    }

    const handleTrainerUpdate = async (trainerId: number, data: any) => {
        try {
            await api.gyms.updateTrainerStatus(gymId, String(trainerId), data)
            toast.success("Trainer association updated")
            fetchTrainers()
        } catch (e) {
            toast.error("Failed to update trainer")
        }
    }

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Trainer Management</h1>
                    <p className="text-muted-foreground">Manage your roster and incoming join requests.</p>
                </div>
            </div>

            <Tabs defaultValue="roster" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="roster" className="gap-2">
                        <UserCheck className="w-4 h-4" />
                        Active Roster ({roster.length})
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="gap-2">
                        <UserPlus className="w-4 h-4" />
                        Join Requests ({applications.length})
                        {applications.length > 0 && (
                            <Badge variant="destructive" className="ml-1 px-1 min-w-[1.2rem] h-5 justify-center">
                                {applications.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="roster">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Trainers</CardTitle>
                            <CardDescription>Trainers currently linked to your facility.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TrainerRoster roster={roster} onUpdate={handleTrainerUpdate} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="requests">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Applications</CardTitle>
                            <CardDescription>Trainers requesting to join your facility.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <JoinRequests applications={applications} onAction={handleApplication} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
