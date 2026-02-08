"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Gym {
    id: number;
    name: string;
    slug: string;
    location: string;
    description: string;
    amenities: string[];
    photos: string[];
    verification_status: string;
}

interface Application {
    id: number;
    gym_id: number;
    status: string;
}

interface Association {
    gym_id: number;
    status: string;
}

export default function JoinGymPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [associations, setAssociations] = useState<Association[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.id) return;
            try {
                // Parallel fetch
                const [allGyms, myApps, myAssocs] = await Promise.all([
                    api.gyms.list(),
                    api.gymApplications.list(),
                    api.trainers.getGyms(profile.id.toString())
                ]);

                // Filter only approved gyms for joining
                const approvedGyms = allGyms.filter((g: Gym) => g.verification_status === "APPROVED");
                setGyms(approvedGyms);
                setApplications(myApps);

                // parse associations (api structure might be different, let's assume it returns list of objects with gym_id)
                // Actually the API returns { gym: ..., status: ... } usually.
                // Let's refine this based on actual API response structure if needed, but for now assuming standard.
                // Re-checking api.ts: getGyms fetches /trainers/{id}/gyms.
                setAssociations(myAssocs);

            } catch (error) {
                console.error("Failed to fetch data", error);
                toast.error("Failed to load gyms");
            } finally {
                setLoading(false);
            }
        };

        if (profile?.id) {
            fetchData();
        }
    }, [profile?.id]);

    const handleApply = async (gymId: number) => {
        if (!profile?.id) return;
        setApplying(gymId);
        try {
            // Use the new gym application endpoint
            await api.gymApplications.create(gymId, "I would like to join your gym as a trainer.");
            toast.success("Application submitted!");

            // Refresh applications
            const apps = await api.gymApplications.list();
            setApplications(apps);
        } catch (error) {
            toast.error("Failed to apply");
        } finally {
            setApplying(null);
        }
    };

    const getStatus = (gymId: number) => {
        // Check active associations first
        const assoc = associations.find((a: any) => a.gym_id === gymId || a.gym?.id === gymId);
        if (assoc) return { state: "ASSOCIATED", label: assoc.status || "Active", color: "bg-emerald-500" };

        // Check pending applications
        const app = applications.find(a => a.gym_id === gymId && a.status === "PENDING");
        if (app) return { state: "PENDING", label: "Application Pending", color: "bg-yellow-500" };

        const rejectedApp = applications.find(a => a.gym_id === gymId && a.status === "REJECTED");
        if (rejectedApp) return { state: "REJECTED", label: "Rejected", color: "bg-red-500" };

        return { state: "NONE", label: null, color: null };
    };

    if (loading) return <div className="flex bg-background h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 space-y-8 bg-background min-h-screen text-foreground">
            <div>
                <h1 className="text-3xl font-bold mb-2">Find a Gym</h1>
                <p className="text-muted-foreground">Browse partner verification facilities and apply to join their roster.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gyms.map((gym) => {
                    const status = getStatus(gym.id);
                    return (
                        <Card key={gym.id} className="flex flex-col">
                            <div className="h-48 w-full bg-muted relative overflow-hidden">
                                {gym.photos?.[0] ? (
                                    <img src={gym.photos[0]} alt={gym.name} className="object-cover w-full h-full hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="flex items-center justify-center h-full bg-secondary text-muted-foreground">No Image</div>
                                )}
                                {status.label && (
                                    <Badge className={`absolute top-4 right-4 ${status.color}`}>
                                        {status.label}
                                    </Badge>
                                )}
                            </div>
                            <CardHeader>
                                <CardTitle>{gym.name}</CardTitle>
                                <div className="flex items-center text-sm text-muted-foreground gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {gym.location}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm line-clamp-3 mb-4">{gym.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {gym.amenities?.slice(0, 3).map((amenity, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                            {amenity}
                                        </Badge>
                                    ))}
                                    {gym.amenities?.length > 3 && (
                                        <Badge variant="secondary" className="text-xs">+{gym.amenities.length - 3}</Badge>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                {status.state === "ASSOCIATED" ? (
                                    <Button variant="outline" className="w-full" onClick={() => router.push(`/dashboard/trainer/${profile?.id}/schedule`)}>
                                        View Schedule
                                    </Button>
                                ) : status.state === "PENDING" ? (
                                    <Button variant="ghost" className="w-full" disabled>
                                        <Clock className="w-4 h-4 mr-2" />
                                        Awaiting Approval
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={() => handleApply(gym.id)}
                                        disabled={applying === gym.id}
                                    >
                                        {applying === gym.id && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                                        Apply to Join
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
