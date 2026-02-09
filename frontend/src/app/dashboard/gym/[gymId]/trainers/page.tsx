"use client"

import { useEffect, useState } from "react"
import {
    Users,
    UserCheck,
    UserPlus,
    Clock,
    ExternalLink,
    CheckCircle2,
    XCircle,
    UserCircle,
    Loader2
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function GymTrainersPage({ params }: { params: { gymId: string } }) {
    const [roster, setRoster] = useState<any[]>([])
    const [applications, setApplications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTrainers = async () => {
        setLoading(true)
        try {
            const [rosterData, appsData] = await Promise.all([
                api.gyms.getTrainers(params.gymId),
                api.gymApplications.listForGym(params.gymId)
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
    }, [params.gymId])

    const handleApplication = async (appId: number, status: "APPROVED" | "REJECTED") => {
        try {
            await api.gymApplications.updateStatus(appId, status)
            toast.success(`Application ${status.toLowerCase()} successfully`)
            fetchTrainers()
        } catch (e) {
            toast.error("Action failed")
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
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Trainer Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Linked Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {roster.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No active trainers in your roster yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        roster.map((item) => (
                                            <TableRow key={item.trainer.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <UserCircle className="w-8 h-8 text-muted-foreground" />
                                                        <div>
                                                            <div>{item.trainer.user?.full_name}</div>
                                                            <div className="text-xs text-muted-foreground">{item.trainer.user?.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
                                                        {item.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(item.updated_at || Date.now()).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/dashboard/trainer/${item.trainer.id}/profile`}>
                                                            <ExternalLink className="w-4 h-4 mr-2" />
                                                            View Profile
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
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
                            <div className="space-y-4">
                                {applications.length === 0 ? (
                                    <div className="text-center py-12 border rounded-lg bg-muted/20">
                                        <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                        <p className="text-muted-foreground">No pending join requests.</p>
                                    </div>
                                ) : (
                                    applications.map((app) => (
                                        <div key={app.id} className="flex flex-col md:flex-row border rounded-lg p-4 justify-between gap-4 bg-muted/5">
                                            <div className="flex gap-4">
                                                <UserCircle className="w-12 h-12 text-muted-foreground" />
                                                <div className="space-y-1">
                                                    <div className="font-bold">{app.trainer.full_name}</div>
                                                    <div className="text-sm text-muted-foreground">{app.trainer.email}</div>
                                                    {app.message && (
                                                        <div className="text-sm bg-background p-2 rounded border italic">
                                                            "{app.message}"
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-end md:self-center">
                                                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleApplication(app.id, "REJECTED")}>
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Reject
                                                </Button>
                                                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApplication(app.id, "APPROVED")}>
                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    Approve
                                                </Button>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/dashboard/trainer/${app.trainer.id}/profile`}>
                                                        View Profile
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
