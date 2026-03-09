"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserCircle, CheckCircle2, XCircle, Clock } from "lucide-react"
import Link from "next/link"

interface JoinRequestsProps {
    applications: any[]
    onAction: (appId: number, status: "APPROVED" | "REJECTED") => void
}

export function JoinRequests({ applications, onAction }: JoinRequestsProps) {
    return (
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
                                <div className="font-bold">{app.trainer?.user?.full_name || app.trainer?.full_name || "Unknown Trainer"}</div>
                                <div className="text-sm text-muted-foreground">{app.trainer?.user?.email || app.trainer?.email || "N/A"}</div>
                                {app.trainer?.specializations && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {app.trainer.specializations.map((spec: string) => (
                                            <Badge key={spec} variant="outline" className="text-[10px] px-1.5 py-0">{spec}</Badge>
                                        ))}
                                    </div>
                                )}
                                {app.message && (
                                    <div className="text-sm bg-background p-2 rounded border italic mt-2">
                                        &quot;{app.message}&quot;
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-end md:self-center">
                            <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => onAction(app.id, "REJECTED")}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => onAction(app.id, "APPROVED")}
                                disabled={app.trainer?.verification_status !== "APPROVED"}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {app.trainer?.verification_status !== "APPROVED" ? "Unverified" : "Approve"}
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
    )
}
