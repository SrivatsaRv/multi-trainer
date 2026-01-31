"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function Dashboard() {
    const { user, profile, logout, refreshProfile } = useAuth();
    const router = useRouter();

    if (!user) return null; // Auth context handles redirect

    const isGym = user.role === "GYM_ADMIN";
    const isTrainer = user.role === "TRAINER";
    const isAdmin = user.role === "SAAS_ADMIN";
    const status = profile?.verification_status || "NONE";

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>;
            case "PENDING": return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending Approval</Badge>;
            case "REJECTED": return <Badge className="bg-red-500 hover:bg-red-600">Rejected</Badge>;
            case "DRAFT": return <Badge className="bg-zinc-500 hover:bg-zinc-600">Draft</Badge>;
            default: return <Badge variant="outline">Not Started</Badge>;
        }
    };

    const getProfileTitle = () => {
        if (isGym) return "Facility Profile";
        if (isTrainer) return "Trainer Profile";
        return "Profile";
    };

    const getOnboardingPath = () => {
        if (isGym) return "/onboard-as-gym";
        if (isTrainer) return "/onboard-as-trainer";
        return "/onboard-as-trainer"; // fallback
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <Button 
                    variant="outline" 
                    onClick={logout}
                    className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                    Logout
                </Button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Account Status */}
                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader>
                        <CardTitle>Account Status</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            {user.is_active ? "Active" : "Inactive"}
                        </div>
                        <div className="text-sm text-zinc-400 mt-2">
                            Role: {user.role.replace("_", " ")}
                        </div>
                        
                        {/* Admin Panel Access */}
                        {isAdmin && (
                            <Button
                                className="mt-4 w-full bg-purple-600 hover:bg-purple-700"
                                onClick={() => router.push("/admin/verifications")}
                            >
                                Admin Panel
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Profile Status */}
                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader>
                        <CardTitle>{getProfileTitle()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            {getStatusBadge(status)}
                        </div>

                        {status === "NONE" && (
                            <Button
                                className="w-full bg-white text-black hover:bg-zinc-200"
                                onClick={() => router.push(getOnboardingPath())}
                            >
                                Create Profile
                            </Button>
                        )}
                        
                        {status === "DRAFT" && (
                            <Button
                                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => toast.info("Profile completion coming soon!")}
                            >
                                Complete Profile
                            </Button>
                        )}
                        
                        {status === "PENDING" && (
                            <div className="text-center">
                                <p className="text-sm text-yellow-400 mb-2">
                                    Your profile is under review
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full border-zinc-700"
                                    onClick={refreshProfile}
                                >
                                    Refresh Status
                                </Button>
                            </div>
                        )}
                        
                        {status === "REJECTED" && (
                            <div className="space-y-2">
                                <p className="text-sm text-red-400">
                                    Profile rejected. Please review and resubmit.
                                </p>
                                <Button
                                    className="w-full bg-zinc-800 hover:bg-zinc-700"
                                    onClick={() => toast.info("Edit Profile coming soon")}
                                >
                                    Fix & Resubmit
                                </Button>
                            </div>
                        )}
                        
                        {status === "APPROVED" && (
                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => {
                                    if (isGym) {
                                        toast.info("Facility management coming soon");
                                    } else {
                                        toast.info("Availability management coming soon");
                                    }
                                }}
                            >
                                {isGym ? "Manage Facility" : "Manage Availability"}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {isGym && (
                            <>
                                <Button 
                                    variant="outline" 
                                    className="w-full border-zinc-700"
                                    onClick={() => toast.info("Trainer management coming soon")}
                                >
                                    Manage Trainers
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full border-zinc-700"
                                    onClick={() => toast.info("Member management coming soon")}
                                >
                                    View Members
                                </Button>
                            </>
                        )}
                        
                        {isTrainer && (
                            <>
                                <Button 
                                    variant="outline" 
                                    className="w-full border-zinc-700"
                                    onClick={() => toast.info("Schedule management coming soon")}
                                >
                                    My Schedule
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full border-zinc-700"
                                    onClick={() => toast.info("Client management coming soon")}
                                >
                                    My Clients
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Profile Details */}
            {profile && (
                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader>
                        <CardTitle>
                            {isGym ? "Facility Details" : "Profile Details"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isGym && profile.name && (
                                <div>
                                    <label className="text-sm text-zinc-400">Facility Name</label>
                                    <p className="font-medium">{profile.name}</p>
                                </div>
                            )}
                            
                            {isGym && profile.location && (
                                <div>
                                    <label className="text-sm text-zinc-400">Location</label>
                                    <p className="font-medium">{profile.location}</p>
                                </div>
                            )}
                            
                            {isTrainer && profile.bio && (
                                <div className="md:col-span-2">
                                    <label className="text-sm text-zinc-400">Bio</label>
                                    <p className="font-medium">{profile.bio}</p>
                                </div>
                            )}
                            
                            <div>
                                <label className="text-sm text-zinc-400">Status</label>
                                <p className="font-medium">{status}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
