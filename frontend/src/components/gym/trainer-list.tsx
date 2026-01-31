"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Mail, X } from "lucide-react";

interface Trainer {
    id: number;
    user_id: number;
    bio: string;
    specializations: string[];
    user?: {
        full_name: string;
        email: string;
    }
}

interface Association {
    trainer: Trainer;
    status: "PENDING" | "ACTIVE" | "REJECTED" | "INVITED";
    updated_at: string;
}

interface TrainerListProps {
    trainers: Association[];
    onInvite: (email: string) => Promise<void>;
}

export function TrainerList({ trainers, onInvite }: TrainerListProps) {
    const [isInviting, setIsInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleInvite = async () => {
        if (!inviteEmail) return;
        setLoading(true);
        try {
            await onInvite(inviteEmail);
            setInviteEmail("");
            setIsInviting(false);
        } catch (error) {
            console.error("Failed to invite", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "ACTIVE": return <Badge className="bg-emerald-500">Active</Badge>;
            case "PENDING": return <Badge className="bg-yellow-500">Pending Approval</Badge>;
            case "INVITED": return <Badge className="bg-blue-500">Invited</Badge>;
            case "REJECTED": return <Badge className="bg-red-500">Rejected</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Associated Trainers</h2>
                <Button onClick={() => setIsInviting(true)} className="bg-white text-black hover:bg-zinc-200">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Trainer
                </Button>
            </div>

            {isInviting && (
                <Card className="bg-zinc-900 border-zinc-800 animate-in slide-in-from-top-4">
                    <CardHeader>
                        <CardTitle className="text-lg">Invite New Trainer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Trainer's Email Address"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800"
                                />
                            </div>
                            <Button onClick={handleInvite} disabled={loading}>
                                {loading ? "Sending..." : "Send Invitation"}
                            </Button>
                            <Button variant="ghost" onClick={() => setIsInviting(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {trainers.length === 0 ? (
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="h-32 flex items-center justify-center text-zinc-500">
                            No trainers associated yet. Invite your first trainer!
                        </CardContent>
                    </Card>
                ) : (
                    trainers.map((assoc, idx) => (
                        <Card key={idx} className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarFallback>
                                            {assoc.trainer.user?.full_name?.substring(0, 2).toUpperCase() || "TR"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-medium text-white">
                                            {assoc.trainer.user?.full_name || "Unknown Trainer"}
                                        </h3>
                                        <div className="text-sm text-zinc-400 flex items-center gap-2">
                                            <Mail className="w-3 h-3" />
                                            {assoc.trainer.user?.email}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {getStatusBadge(assoc.status)}
                                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                        Details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
