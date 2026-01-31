import { z } from "zod";

export const gymOnboardingSchema = z.object({
    name: z.string().min(3, "Gym name must be at least 3 characters"),
    location: z.string().min(5, "Address must be more detailed"),
    slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export const trainerOnboardingSchema = z.object({
    bio: z.string().min(10, "Bio must be at least 10 characters"),
});
