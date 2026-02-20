"use client";

import { AppShell } from "./AppShell";

export function AppShellClient({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
}