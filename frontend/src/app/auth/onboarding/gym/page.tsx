"use client";

import { useAuth } from "@/contexts/auth-context";
import { OnboardingShell } from "@/components/onboarding/shell";
import { GymOnboardingForm } from "@/components/forms/gym-onboarding-form";
import { MapPin } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GymOnboardingPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== "GYM_ADMIN")) {
            router.replace("/dashboard");
        }
        if (!loading && profile?.verification_status === "APPROVED") {
            router.replace("/dashboard");
        }
    }, [user, profile, loading, router]);

    if (loading) return null;

    return (
        <OnboardingShell
            title="Facility Onboarding"
            description="Register your gym or studio to start collaborating with top personal trainers."
            icon={MapPin}
            themeColor="blue"
        >
            <GymOnboardingForm />
        </OnboardingShell>
    );
}
