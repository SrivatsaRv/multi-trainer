"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User, Plus, Search, Calendar, Phone, Mail, Dumbbell, ChevronRight, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { BookingSlotGrid } from "@/components/dashboard/booking-slot-grid";

export default function ClientsPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const params = useParams();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Add Client State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [trainerGyms, setTrainerGyms] = useState<any[]>([]);
    const [gymPackages, setGymPackages] = useState<any[]>([]);
    const [selectedGymId, setSelectedGymId] = useState<string>("");
    const [onboarding, setOnboarding] = useState(false);

    const [newClient, setNewClient] = useState({
        full_name: "",
        email: "",
        gym_id: "",
        package_id: "",
        start_time: ""
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const [clientsData, gymsData] = await Promise.all([
                    api.trainers.getClients(params.trainerId as string),
                    api.trainers.getGyms(params.trainerId as string)
                ]);
                setClients(clientsData);
                // Filter only active gyms
                const active = gymsData.filter((g: any) => g.status === 'ACTIVE');
                setTrainerGyms(active);

                // If only one gym, select it by default (optional UX improvement)
                if (active.length === 1) {
                    const gid = active[0].gym.id.toString();
                    setSelectedGymId(gid);
                    setNewClient(prev => ({ ...prev, gym_id: gid }));
                    fetchPackages(active[0].gym.id);
                }

            } catch (err) {
                console.error("Failed to fetch clients:", err);
                toast.error("Failed to load clients");
            } finally {
                setLoading(false);
            }
        }
        if (params.trainerId) fetchData();
    }, [params.trainerId]);

    const fetchPackages = async (gymId: number) => {
        try {
            const pkgs = await api.gyms.getPackages(gymId.toString());
            setGymPackages(pkgs);
        } catch (err) {
            console.error("Failed to fetch packages", err);
        }
    }

    const handleGymChange = (val: string) => {
        setSelectedGymId(val);
        setNewClient({ ...newClient, gym_id: val, package_id: "" });
        fetchPackages(parseInt(val));
    };

    const handleAddClient = async () => {
        if (!newClient.full_name || !newClient.email || !newClient.gym_id || !newClient.package_id) {
            toast.error("Please fill all required fields");
            return;
        }

        setOnboarding(true);
        try {
            const payload = {
                full_name: newClient.full_name,
                email: newClient.email,
                gym_id: parseInt(newClient.gym_id),
                package_id: parseInt(newClient.package_id),
                start_time: newClient.start_time ? new Date(newClient.start_time).toISOString() : null
            };

            await api.trainers.addClient(params.trainerId as string, payload);
            toast.success("Client added successfully");
            setIsAddDialogOpen(false);

            // Refresh list
            const updated = await api.trainers.getClients(params.trainerId as string);
            setClients(updated);
            // Reset form
            setNewClient({ full_name: "", email: "", gym_id: "", package_id: "", start_time: "" });

        } catch (err: any) {
            toast.error(err.message || "Failed to add client");
        } finally {
            setOnboarding(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 pb-24 md:pb-10 max-w-4xl mx-auto md:mx-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground">Manage your training roster</p>
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full md:w-auto gap-2">
                            <Plus className="w-4 h-4" /> Add New Client
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Onboard New Client</DialogTitle>
                            <DialogDescription>
                                Add client details and assign them a gym plan.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={newClient.full_name}
                                    onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newClient.email}
                                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Gym Facility</Label>
                                <Select onValueChange={handleGymChange} value={selectedGymId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gym" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {trainerGyms.map(tg => (
                                            <SelectItem key={tg.gym.id} value={tg.gym.id.toString()}>
                                                {tg.gym.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Training Package</Label>
                                <Select
                                    onValueChange={(val) => setNewClient({ ...newClient, package_id: val })}
                                    value={newClient.package_id}
                                    disabled={!selectedGymId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={!selectedGymId ? "Select gym first" : "Select package"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gymPackages.map(pkg => (
                                            <SelectItem key={pkg.id} value={pkg.id.toString()}>
                                                {pkg.name} ({pkg.session_count} sessions) - ₹{pkg.price_inr}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>First Session (Optional)</Label>
                                <div className="grid grid-cols-2 gap-4 mb-2">
                                    <Input
                                        type="date"
                                        value={newClient.start_time.split('T')[0]}
                                        onChange={(e) => setNewClient({ ...newClient, start_time: `${e.target.value}T10:00` })}
                                    />
                                    <Input
                                        type="time"
                                        value={newClient.start_time.split('T')[1]?.slice(0, 5) || "10:00"}
                                        onChange={(e) => {
                                            const date = newClient.start_time.split('T')[0] || format(new Date(), 'yyyy-MM-dd')
                                            setNewClient({ ...newClient, start_time: `${date}T${e.target.value}` })
                                        }}
                                    />
                                </div>
                                {newClient.gym_id && (
                                    <BookingSlotGrid
                                        trainerId={params.trainerId as string}
                                        date={newClient.start_time.split('T')[0] || format(new Date(), 'yyyy-MM-dd')}
                                        selectedTime={newClient.start_time.split('T')[1]?.slice(0, 5)}
                                        onTimeSelect={(time) => {
                                            const date = newClient.start_time.split('T')[0] || format(new Date(), 'yyyy-MM-dd')
                                            setNewClient({ ...newClient, start_time: `${date}T${time}` })
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddClient} disabled={onboarding}>
                                {onboarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Onboard Client
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search & Filter */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search clients by name..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Client List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map(client => (
                    <Card
                        key={client.id}
                        className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] transition-transform"
                        onClick={() => router.push(`/dashboard/trainer/${params.trainerId}/clients/${client.id}`)}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{client.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Badge variant={client.subscription_status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-5">
                                                {client.subscription_status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">• {client.sessions_remaining} sessions left</span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>

                            <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {client.last_session ? (
                                        <span>Last: {format(new Date(client.last_session), 'MMM d')}</span>
                                    ) : (
                                        <span>No sessions yet</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredClients.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                        {searchTerm ? "No clients found matching your search." : "No clients added yet. Click 'Add New Client' to get started."}
                    </div>
                )}
            </div>
        </div>
    );
}
