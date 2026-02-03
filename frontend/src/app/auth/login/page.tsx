"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginForm />
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link href="/auth/register" className="text-primary hover:underline">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
