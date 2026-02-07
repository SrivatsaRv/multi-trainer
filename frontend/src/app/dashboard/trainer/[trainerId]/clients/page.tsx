"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Search, Mail, Phone, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Client {
    id: number;
    name: string;
    email: string;
    phone?: string;
    profile_image?: string;
    active_package?: string;
    sessions_remaining?: number;
}

export default function TrainerClientsPage() {
    const params = useParams();
    const router = useRouter();
    const trainerId = params.trainerId as string;
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchClients = useCallback(async () => {
        if (!trainerId) return;
        setLoading(true);
        try {
            const data = await api.get(`/trainers/${trainerId}/clients`);
            setClients(data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load clients");
        } finally {
            setLoading(false);
        }
    }, [trainerId]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground">Manage and track your active clients</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search clients..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                    <Card key={client.id} className="hover:shadow-md transition-shadow group overflow-hidden border-primary/10">
                        <CardHeader className="flex flex-row items-center gap-4 pb-4 bg-muted/5">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                {client.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-lg">{client.name}</CardTitle>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {client.email}
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Status</span>
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10">Active</Badge>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Sessions Left</span>
                                <span className="font-semibold">{client.sessions_remaining ?? 10}</span>
                            </div>

                            <Button
                                className="w-full mt-2 group"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/trainer/${trainerId}/clients/${client.id}`)}
                            >
                                View Profile
                                <ExternalLink className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                {filteredClients.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-muted/10 rounded-xl border-2 border-dashed">
                        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-muted-foreground">No clients found</h3>
                        <p className="text-muted-foreground">Try adjusting your search query.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
