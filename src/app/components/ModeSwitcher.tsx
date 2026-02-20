"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";

export function ModeSwitcher() {
    const params = useSearchParams();
    const router = useRouter();

    const mode = params.get("mode") === "employee" ? "employee" : "supervisor";

    function setMode(next: "employee" | "supervisor") {
        router.push(`/?mode=${next}`);
    }

    return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
                onClick={() => setMode("supervisor")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === "supervisor"
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
            >
                Supervisor
            </button>
            <button
                onClick={() => setMode("employee")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === "employee"
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
            >
                Employee
            </button>
        </div>
    );
}

export function ModeTile() {
    const params = useSearchParams();
    const mode = params.get("mode") === "employee" ? "employee" : "supervisor";

    const tile = useMemo(
        () =>
            mode === "employee"
                ? {
                    title: "Orientation Items",
                    description: "View and update your orientation items.",
                    href: "/me/orientation?employeeId=123",
                    badge: "Employee",
                }
                : {
                    title: "Manage Employees",
                    description:
                        "Create, review, and track employee orientations and completion status.",
                    href: "/employees",
                    badge: "Supervisor",
                },
        [mode]
    );

    return (
        <Link
            href={tile.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
            <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
                    {tile.title}
                </h2>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                    {tile.badge}
                </span>
            </div>

            <p className="mt-2 text-sm text-slate-600">{tile.description}</p>

            <div className="mt-4 text-sm font-medium text-indigo-700">Open →</div>
        </Link>
    );
}
