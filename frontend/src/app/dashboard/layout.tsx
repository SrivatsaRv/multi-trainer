import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50/50 dark:bg-zinc-950">
            <AppHeader />
            <div className="flex-1 flex w-full max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 pt-6 gap-6 lg:gap-10">
                <aside className="fixed top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r bg-background md:sticky md:block">
                    <div className="h-full py-6 pr-6 lg:py-8">
                        <Sidebar />
                    </div>
                </aside>
                <main className="flex-1 min-w-0 flex flex-col pb-10">{children}</main>
            </div>
        </div>
    );
}
