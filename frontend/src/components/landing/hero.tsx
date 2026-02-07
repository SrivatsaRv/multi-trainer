import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, ChevronDown } from "lucide-react";

export function LandingHero() {
    return (
        <section id="hero" className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center lg:px-12 2xl:px-24">
            <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-20 md:mt-32">
                <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-bold text-muted-foreground backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Now in Public Beta
                </div>

                <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl lg:text-8xl">
                    One Platform.<br />
                    <span className="text-muted-foreground">Unlimited Growth.</span>
                </h1>

                <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl lg:text-2xl">
                    The first comprehensive operating system connecting gyms and freelance trainers.
                    Fill your floor time, verify credentials, and manage bookings cleanly.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button
                        asChild
                        size="lg"
                        className="h-14 px-10 text-lg font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                    >
                        <Link href="/auth/register">
                            Get Started
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="h-14 px-10 text-lg font-bold transition-all hover:scale-105 active:scale-95 bg-background/50"
                    >
                        <Link href="/auth/login">
                            Full Login
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="absolute bottom-10 animate-bounce">
                <Link href="#gyms">
                    <ChevronDown className="h-8 w-8 text-zinc-600 hover:text-white transition-colors cursor-pointer" />
                </Link>
            </div>
        </section>
    );
}
