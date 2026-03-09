import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t bg-secondary/30 py-12">
            <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-xs">M</div>
                    <span className="font-semibold text-foreground">MultiTrainer</span>
                </div>
                <div className="flex gap-6">
                    <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
                    <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
                    <Link href="#" className="hover:text-foreground transition-colors">Support</Link>
                </div>
                <div>
                    &copy; {new Date().getFullYear()} Inc.
                </div>
            </div>
        </footer>
    );
}
