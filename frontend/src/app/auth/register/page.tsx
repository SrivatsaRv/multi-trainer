"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RegisterContent() {
    const searchParams = useSearchParams();
    const roleParam = searchParams.get("role");
    const defaultRole = (roleParam === "TRAINER" || roleParam === "GYM_ADMIN") ? roleParam : "GYM_ADMIN";

    return <RegisterForm defaultRole={defaultRole} />;
}

export default function RegisterPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-black">
            <Card className="w-full max-w-md border-zinc-800 bg-zinc-950 text-white">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
                    <CardDescription className="text-zinc-400">
                        Enter your email below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div>Loading form...</div>}>
                        <RegisterContent />
                    </Suspense>
                    <div className="mt-4 text-center text-sm text-zinc-400">
                        Already have an account?{" "}
                        <Link href="/auth/login" className="text-white hover:underline">
                            Log in
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
