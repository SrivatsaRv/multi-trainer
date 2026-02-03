"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, User, CheckCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface Session {
    id: number
    client: { name: string }
    start_time: string
    end_time: string
    status: string
    gym: { name: string; location: string }
}

interface TrainerTodayViewProps {
    sessions: Session[]
}

export function TrainerTodayView({ sessions }: TrainerTodayViewProps) {
    const router = useRouter()

    const handleSessionClick = (sessionId: number) => {
        // Navigate to session detail page
        // Assuming the current path is /dashboard/trainer/[id]
        // We want /dashboard/trainer/[id]/sessions/[sessionId]
        // But better to use absolute path constructed from params if available, 
        // or relative from current route context.
        const currentPath = window.location.pathname;
        // Extract trainer ID from path if possible, or assume context.
        // Ideally the parent passes navigate function or base path.
        // For now, let's assume we are at /dashboard/trainer/[id]
        router.push(`${currentPath}/sessions/${sessionId}`)
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Today's Schedule</h2>
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
                                {(session as any).notes && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                                        <CheckCircle className="h-3 w-3" />
                                        {(session as any).notes}
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
