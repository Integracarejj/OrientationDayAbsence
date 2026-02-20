"use client";

import { ModeSwitcher } from "@/app/components/ModeSwitcher";

export function Header() {
    return (
        <div className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
                <div className="text-sm font-semibold text-[hsl(var(--app-fg))]">
                    Employee Orientation
                </div>
                <div className="text-xs text-[hsl(var(--app-fg)/0.70)]">
                    Supervisor &amp; Employee experience
                </div>
            </div>

            <div className="shrink-0">
                <ModeSwitcher />
            </div>
        </div>
    );
}