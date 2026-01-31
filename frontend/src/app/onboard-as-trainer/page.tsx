"use client";

import { TrainerOnboardingForm } from "@/components/forms/trainer-onboarding-form";
import { OnboardingShell } from "@/components/onboarding/shell";
import { UserCircle2 } from "lucide-react";

export default function TrainerOnboarding() {
    return (
        <OnboardingShell
            title="For Trainers"
            description="Build your professional brand and connect with gyms."
            icon={UserCircle2}
            themeColor="blue"
        >
            <TrainerOnboardingForm />
        </OnboardingShell>
    );
}
