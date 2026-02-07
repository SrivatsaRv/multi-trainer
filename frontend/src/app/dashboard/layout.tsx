import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50/50 dark:bg-zinc-950">
            <AppHeader />
            <div className="flex-1 flex w-full max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 pt-6 gap-6 lg:gap-10">
                <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block border-r bg-background">
                    <div className="h-full py-6 pr-6 lg:py-8">
                        <Sidebar />
                    </div>
                </aside>
                <main className="flex-1 min-w-0 flex flex-col pb-10">{children}</main>
            </div>
        </div>
    );
}
