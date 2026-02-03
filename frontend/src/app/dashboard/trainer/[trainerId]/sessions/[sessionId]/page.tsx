"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, User, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SessionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const trainerId = params.trainerId as string;
    const sessionId = params.sessionId as string;

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (trainerId && sessionId) {
            api.trainers.getSession(trainerId, sessionId)
                .then(data => {
                    setSession(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [trainerId, sessionId]);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!session) {
        return <div className="p-8">Session not found.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Session Details</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Session Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status</span>
                            <Badge>{session.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                                {new Date(session.start_time).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{session.client.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{session.gym.name}</span>
                        </div>
                        {session.notes && (
                            <div className="p-2 bg-muted rounded-md text-sm">
                                <span className="font-semibold">Intent:</span> {session.notes}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Workout Log</CardTitle>
                            <Button size="sm" variant="outline">Log Workout</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {session.exercises && session.exercises.length > 0 ? (
                            <div className="space-y-4">
                                {session.exercises.map((ex: any) => (
                                    <div key={ex.id} className="border-b pb-2 last:border-0">
                                        <div className="font-medium">{ex.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {ex.sets} sets x {ex.reps} reps @ {ex.weight_kg}kg
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No exercises logged yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
