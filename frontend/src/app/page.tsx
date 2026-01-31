"use client";

import { useAuth } from "@/contexts/auth-context";
import { LandingHero } from "@/components/landing/hero";
import { FeatureSection } from "@/components/landing/feature-section";

export default function Home() {
  const { user } = useAuth();

  // Auth context handles redirect for authenticated users
  if (user) return null;

  return (
    <div className="flex flex-col bg-background text-foreground min-h-screen">
      <LandingHero />

      <FeatureSection
        id="gyms"
        icon="gym"
        title="For Gym Owners"
        description="Consolidate your trainer roster, verify credentials automatically, and provide your members with the highest quality personal training experience."
        features={[
          "Verified credential tracking",
          "Centralized billing & session logs",
          "Real-time availability monitoring"
        ]}
        ctaText="Start onboarding your facility"
        ctaLink="/auth/register?role=GYM_ADMIN"
        previewLabel="Gym Dashboard Preview"
      />

      <FeatureSection
        id="trainers"
        icon="trainer"
        title="For Personal Trainers"
        description="Maintain one profile, manage two contexts. Your schedules, members, and availability synced across your gym partners."
        features={[
          "Zero-conflict cross-gym scheduling",
          "Professional portfolio showcase",
          "Instant member session tracking"
        ]}
        ctaText="Create your professional profile"
        ctaLink="/auth/register?role=TRAINER"
        previewLabel="Trainer Marketplace Preview"
        reversed
      />
    </div>
  );
}
