"use client";

import { useAuth } from "@/contexts/auth-context";
import { OnboardingShell } from "@/components/onboarding/shell";
import { TrainerOnboardingForm } from "@/components/forms/trainer-onboarding-form";
import { User, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TrainerOnboardingPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== "TRAINER")) {
            router.replace("/dashboard");
        }
        if (!loading && profile?.verification_status === "APPROVED") {
            router.replace("/dashboard");
        }
    }, [user, profile, loading, router]);

    if (loading) return null;

    return (
        <OnboardingShell
            title="Trainer Profile Setup"
            description="Complete your professional profile to start accepting clients and managing sessions."
            icon={User}
            themeColor="emerald"
        >
            <TrainerOnboardingForm />
        </OnboardingShell>
    );
}
