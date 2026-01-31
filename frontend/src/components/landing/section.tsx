import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LandingSectionProps {
    id: string;
    className?: string;
    children: ReactNode;
    fullHeight?: boolean;
}

export function LandingSection({ id, className, children, fullHeight = true }: LandingSectionProps) {
    return (
        <section
            id={id}
            className={cn(
                "flex flex-col items-center justify-center px-6 py-24 sm:py-32 lg:px-12 2xl:px-24",
                fullHeight && "min-h-screen",
                className
            )}
        >
            {children}
        </section>
    );
}
