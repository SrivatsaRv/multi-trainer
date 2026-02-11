"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { useSearchParams } from "next/navigation";
import { InfoIcon } from "lucide-react";
import { Suspense } from "react";

function LoginContent() {
    const searchParams = useSearchParams();
    const message = searchParams.get("message");

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {message === "session_expired" && (
                        <div className="flex items-start space-x-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
                            <InfoIcon className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <div className="space-y-1">
                                <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100">Session Expired</h5>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Your session has expired due to a system update. Please log in again to continue.
                                </p>
                            </div>
                        </div>
                    )}
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

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
