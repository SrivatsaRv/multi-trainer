"use client";

import { GymOnboardingForm } from "@/components/forms/gym-onboarding-form";
import { OnboardingShell } from "@/components/onboarding/shell";
import { Building2 } from "lucide-react";

export default function GymOnboarding() {
    return (
        <OnboardingShell
            title="For Gym Owners"
            description="Create your facility profile to start managing trainers."
            icon={Building2}
            themeColor="emerald"
        >
            <GymOnboardingForm />
        </OnboardingShell>
    );
}
