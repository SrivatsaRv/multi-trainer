"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, User, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface Session {
    id: number
    client: { name: string }
    start_time: string
    end_time: string
    status: string
    gym: { name: string; location: string }
    notes?: string
}

interface TrainerTodayViewProps {
    sessions: Session[]
    trainerId: number | string
}

export function TrainerTodayView({ sessions, trainerId }: TrainerTodayViewProps) {
    const router = useRouter()

    const handleSessionClick = (sessionId: number) => {
        console.log(`[TrainerTodayView] Clicked session ${sessionId}, navigating to /dashboard/trainer/${trainerId}/sessions/${sessionId}`);
        router.push(`/dashboard/trainer/${trainerId}/sessions/${sessionId}`)
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Today&apos;s Schedule</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session) => (
                    <Card
                        key={session.id}
                        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                        onClick={() => handleSessionClick(session.id)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </CardTitle>
                            <Badge variant={session.status === 'COMPLETED' ? 'secondary' : 'outline'}>
                                {session.status}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {session.client.name}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {session.gym.name}
                                </div>
                                {session.notes && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                                        <CheckCircle className="h-3 w-3" />
                                        {session.notes}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {sessions.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg border-dashed">
                        <Clock className="h-8 w-8 mb-2 opacity-50" />
                        <p>No sessions scheduled for today</p>
                    </div>
                )}
            </div>
        </div>
    )
}
