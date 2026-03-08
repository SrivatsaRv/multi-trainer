"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/session";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

const loginSchema = z.object({
    username: z.string().email("Invalid email"), // OAuth2 form expects 'username'
    password: z.string().min(1, "Password is required"),
});



export function LoginForm() {
    const router = useRouter();
    const { user, login } = useAuth();

    // Redirect if already authenticated
    useEffect(() => {
        if (user) {
            router.replace("/dashboard");
        }
    }, [user, router]);

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        try {
            const result = await signIn("credentials", {
                email: values.username,
                password: values.password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Invalid credentials");
                return;
            }

            if (result?.ok) {
                toast.success("Login successful! Redirecting...");
                // Use window.location.href for a hard redirect to ensure cookies are synchronized
                // eslint-disable-next-line react-hooks/immutability
                window.location.href = "/dashboard";
            }
        } catch (error: any) {
            toast.error("Something went wrong");
        }
    }

    const isLoading = form.formState.isSubmitting;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="m@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                </Button>
            </form>
        </Form>
    );
}
