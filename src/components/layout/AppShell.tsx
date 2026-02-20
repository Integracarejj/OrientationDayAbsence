"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Fallback colors if CSS vars aren't defined in globals.css
    const sidebarBg = "hsl(var(--sidebar-bg, 174 60% 90%))"; // pastel teal
    const headerBg = "hsl(var(--header-bg, 174 55% 92%))";   // lighter teal
    const appBg = "hsl(var(--app-bg, 210 20% 98%))";         // light slate-ish

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: appBg }}>
            {/* Sidebar region */}
            <div className="shrink-0" style={{ backgroundColor: sidebarBg }}>
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed((prev) => !prev)}
                />
            </div>

            {/* Main region */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Header region */}
                <div style={{ backgroundColor: headerBg }}>
                    <Header />
                </div>

                {/* Content region */}
                <main className="flex-1 min-w-0 px-6 py-6">
                    {/* wide, but not edge-to-edge */}
                    <div className="mx-auto w-full max-w-screen-2xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}