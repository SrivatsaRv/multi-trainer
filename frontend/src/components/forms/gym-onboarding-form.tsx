"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { gymOnboardingSchema } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

type GymFormValues = z.infer<typeof gymOnboardingSchema>;

export function GymOnboardingForm() {
    const router = useRouter();
    const form = useForm<GymFormValues>({
        resolver: zodResolver(gymOnboardingSchema),
        defaultValues: {
            name: "",
            location: "",
            slug: "",
        },
    });

    async function onSubmit(values: GymFormValues) {
        try {
            await api.gyms.create(values);
            toast.success("Gym created!");
            router.push("/dashboard");
        } catch (error) {
            toast.error("Failed to create gym. Please try again or login.");
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Gym Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Titan Fitness" className="bg-zinc-900 border-zinc-700" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Gym Slug (URL)</FormLabel>
                            <FormControl>
                                <Input placeholder="titan-fitness" className="bg-zinc-900 border-zinc-700" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>City / Location</FormLabel>
                            <FormControl>
                                <Input placeholder="New York, NY" className="bg-zinc-900 border-zinc-700" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-bold border-none h-12">
                    Create Gym Profile
                </Button>
            </form>
        </Form>
    );
}
