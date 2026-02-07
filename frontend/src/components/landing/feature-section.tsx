import Link from "next/link";
import { Building2, UserCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingSection } from "./section";

interface FeatureSectionProps {
    id: string;
    icon: "gym" | "trainer";
    title: string;
    description: string;
    features: string[];
    ctaText: string;
    ctaLink: string;
    previewLabel: string;
    reversed?: boolean;
    imageSrc?: string;
}

export function FeatureSection({
    id,
    icon,
    title,
    description,
    features,
    ctaText,
    ctaLink,
    previewLabel,
    reversed = false,
    imageSrc
}: FeatureSectionProps) {
    const Icon = icon === "gym" ? Building2 : UserCircle2;
    const iconColor = icon === "gym" ? "text-primary" : "text-primary"; // Changed from hardcoded emerald/blue
    const markerColor = icon === "gym" ? "bg-primary" : "bg-primary"; // Changed from hardcoded emerald/blue
    const hoverColor = icon === "gym" ? "text-primary hover:text-primary/90" : "text-primary hover:text-primary/90"; // Changed from hardcoded emerald/blue

    return (
        <LandingSection id={id} className={cn("border-t", icon === "gym" ? "bg-muted/50" : "bg-background")}>
            <div className="container mx-auto grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
                <div className={cn("space-y-8", reversed && "md:order-2")}>
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-card border shadow-sm">
                        <Icon className={cn("h-7 w-7", iconColor)} />
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl lg:text-6xl">{title}</h2>
                    <p className="text-xl text-muted-foreground leading-relaxed lg:text-2xl">{description}</p>
                    <ul className="space-y-5 text-muted-foreground">
                        {features.map((feature, i) => (
                            <li key={i} className="flex gap-4 items-center text-lg">
                                <div className={cn("h-2 w-2 rounded-full", markerColor)} />
                                <span className="text-foreground">{feature}</span>
                            </li>
                        ))}
                    </ul>
                    <Button
                        asChild
                        className={cn(
                            "h-14 px-10 text-lg font-bold transition-all hover:scale-105 active:scale-95 group",
                            "bg-primary hover:bg-primary/90 text-primary-foreground" // Changed from hardcoded emerald/blue
                        )}
                    >
                        <Link href={ctaLink}>
                            {ctaText} <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-2" />
                        </Link>
                    </Button>
                </div>
                <div className={cn(
                    "aspect-video bg-card rounded-[2.5rem] border shadow-xl flex items-center justify-center text-muted-foreground font-mono italic text-lg overflow-hidden group relative",
                    reversed && "md:order-1"
                )}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-muted/50 to-transparent opacity-50 group-hover:opacity-30 transition-opacity z-10" />
                    {imageSrc ? (
                        <img
                            src={imageSrc}
                            alt={previewLabel}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        `[${previewLabel}]`
                    )}
                </div>
            </div>
        </LandingSection>
    );
}

import { cn } from "@/lib/utils";
