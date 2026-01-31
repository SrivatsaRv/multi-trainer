"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trainerOnboardingSchema } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

type TrainerFormValues = z.infer<typeof trainerOnboardingSchema>;

export function TrainerOnboardingForm() {
    const router = useRouter();
    const form = useForm<TrainerFormValues>({
        resolver: zodResolver(trainerOnboardingSchema) as any,
        defaultValues: {
            bio: "",
        },
    });

    async function onSubmit(values: TrainerFormValues) {
        try {
            await api.trainers.create(values);
            toast.success("Trainer profile created!");
            router.push("/dashboard");
        } catch (error) {
            toast.error("Failed to create profile. Please try again or login.");
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Professional Bio</FormLabel>
                            <FormControl>
                                <Input placeholder="Certified PT with 10+ years experience..." className="bg-zinc-900 border-zinc-700" {...field} />
                            </FormControl>
                            <FormDescription>Minimum 10 characters.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-12">
                    Create Profile
                </Button>
            </form>
        </Form>
    );
}
