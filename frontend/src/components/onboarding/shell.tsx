import Link from "next/link";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OnboardingShellProps {
    title: string;
    description: string;
    icon: LucideIcon;
    themeColor: "emerald" | "blue";
    children: React.ReactNode;
}

export function OnboardingShell({
    title,
    description,
    icon: Icon,
    themeColor,
    children
}: OnboardingShellProps) {

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                {/* Background gradient/pattern can be moved to CSS or handled with semantic opacity */}
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/20 blur-[100px] pointer-events-none" />
            </div>

            <div className="w-full max-w-lg relative z-10 flex flex-col">
                <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Link>

                <div className="mb-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card border shadow-xl mb-4 text-primary">
                        <Icon />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                        {title}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        {description}
                    </p>
                </div>

                <Card className="border-border bg-card/50 backdrop-blur-sm pt-6 px-2">
                    <CardContent>
                        {children}
                    </CardContent>
                </Card>

                <div className="mt-8 flex justify-center gap-6">
                    {/* Steps indicator or other footer content */}
                </div>
                <p className="text-center text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} MultiTrainer. All rights reserved.
                </p>
            </div>
        </div>
    );
}
