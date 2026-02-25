"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/* install first:
 npm install lucide-react
*/
import {
    Home,
    LayoutDashboard,
    Users,
    CalendarDays,
    UserX,
    PanelLeft,
    LineChart,
} from "lucide-react";

import { EXTERNAL_LINKS } from "@/lib/externalLinks";

type NavLink = {
    href: string;
    label: string;
    icon: React.ReactNode;
    external?: boolean;
};

/* ---------------- NAV CONFIG ---------------- */
const SUPERVISOR_NAV: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/employees", label: "Employees", icon: <Users size={18} /> },
    { href: "/day-in-life", label: "Day in Life", icon: <CalendarDays size={18} /> },
    { href: "/in-the-absence", label: "In Absence Of", icon: <UserX size={18} /> },

    // ✅ Hallmarks — Supervisor + Exec only (external)
    {
        href: EXTERNAL_LINKS.hallmarksTracker,
        label: "Hallmarks",
        icon: <LineChart size={18} />,
        external: true,
    },
];

const EMPLOYEE_NAV: NavLink[] = [
    { href: "/me/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/me/orientation", label: "My Orientation", icon: <Users size={18} /> },
    { href: "/me/day-in-life", label: "Day in Life", icon: <CalendarDays size={18} /> },
    { href: "/in-the-absence", label: "In Absence Of", icon: <UserX size={18} /> },
];

/* ---------------- SIDEBAR ---------------- */
export function Sidebar({
    collapsed,
    onToggle,
}: {
    collapsed: boolean;
    onToggle: () => void;
}) {
    const pathname = usePathname() ?? "/";
    const params = useSearchParams();

    // ✅ supervisor | exec | employee
    const mode =
        params.get("mode") === "employee"
            ? "employee"
            : params.get("mode") === "exec"
                ? "exec"
                : "supervisor";

    const modeQuery = `?mode=${mode}`;
    const nav = mode === "employee" ? EMPLOYEE_NAV : SUPERVISOR_NAV;

    const withMode = (href: string) => `${href}${modeQuery}`;

    const isActiveHref = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname === href || pathname.startsWith(href + "/");
    };

    return (
        <div className="flex h-full flex-col px-3 py-3">
            {/* Top row */}
            <div className="flex items-center justify-between gap-2">
                {/* Home button */}
                <Link
                    href={withMode("/")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 shadow-sm ring-1 ring-[hsl(var(--app-border))] hover:bg-white"
                    title="Home"
                >
                    <Home size={18} />
                </Link>

                {/* Collapse toggle */}
                <button
                    onClick={onToggle}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 shadow-sm ring-1 ring-[hsl(var(--app-border))] hover:bg-white"
                    title="Toggle sidebar"
                >
                    <PanelLeft size={18} />
                </button>
            </div>

            {/* NAV */}
            <nav className="mt-8 space-y-3">
                {nav.map((item) =>
                    item.external ? (
                        <NavItem
                            key={item.label}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            collapsed={collapsed}
                            active={false}
                            external
                        />
                    ) : (
                        <NavItem
                            key={item.href}
                            href={withMode(item.href)}
                            label={item.label}
                            icon={item.icon}
                            collapsed={collapsed}
                            active={isActiveHref(item.href)}
                        />
                    )
                )}
            </nav>

            <div className="flex-1" />
        </div>
    );
}

/* ---------------- NAV ITEM ---------------- */
function NavItem({
    href,
    label,
    icon,
    collapsed,
    active,
    external,
}: {
    href: string;
    label: string;
    icon: React.ReactNode;
    collapsed: boolean;
    active: boolean;
    external?: boolean;
}) {
    const className = [
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
        "ring-1 transition-all duration-150",
        active
            ? "bg-white font-medium shadow-sm ring-[hsl(var(--app-border))]"
            : "ring-transparent hover:bg-white/70 hover:ring-[hsl(var(--app-border))]",
    ].join(" ");

    if (external) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
            >
                <span className="shrink-0">{icon}</span>
                {!collapsed && <span className="truncate">{label}</span>}
            </a>
        );
    }

    return (
        <Link href={href} className={className}>
            <span className="shrink-0">{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}
        </Link>
    );
}
