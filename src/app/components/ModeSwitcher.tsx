"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";

type Mode = "supervisor" | "employee" | "exec";

function normalizeMode(raw: string | null): Mode {
    if (raw === "employee") return "employee";
    if (raw === "exec") return "exec";
    return "supervisor";
}

// Decide where each mode should land
function modeHome(mode: Mode) {
    switch (mode) {
        case "employee":
            return "/me/orientation?employeeId=123"; // swap to your real entry later
        case "exec":
            return "/exec/dashboard";
        case "supervisor":
        default:
            return "/dashboard"; // your current supervisor dashboard page [3](https://integracare-my.sharepoint.com/personal/jjoyner_integracare_com/Documents/Microsoft%20Copilot%20Chat%20Files/execdash.txt)
    }
}

export function ModeSwitcher() {
    const params = useSearchParams();
    const router = useRouter();

    const mode = normalizeMode(params.get("mode"));

    function setMode(next: Mode) {
        const target = modeHome(next);

        // Preserve other query params (except we overwrite mode)
        const nextParams = new URLSearchParams(params.toString());
        nextParams.set("mode", next);

        // If target already has its own query string, merge safely
        const [path, qs] = target.split("?");
        const targetParams = new URLSearchParams(qs ?? "");
        // merge current params into target params (target params win if same key)
        nextParams.forEach((v, k) => {
            if (!targetParams.has(k)) targetParams.set(k, v);
        });

        const full = targetParams.toString()
            ? `${path}?${targetParams.toString()}`
            : path;

        router.push(full);
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

            <button
                onClick={() => setMode("exec")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === "exec"
                        ? "bg-white text-slate-900 shadow"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
            >
                Exec
            </button>
        </div>
    );
}

export function ModeTile() {
    const params = useSearchParams();
    const mode = normalizeMode(params.get("mode"));

    const tile = useMemo(() => {
        if (mode === "employee") {
            return {
                title: "Orientation Items",
                description: "View and update your orientation items.",
                href: "/me/orientation?employeeId=123",
                badge: "Employee",
            };
        }
        if (mode === "exec") {
            return {
                title: "Executive Dashboard",
                description:
                    "Roll-up view of acknowledgement coverage, onboarding progress, and risk hotspots.",
                href: "/exec/dashboard",
                badge: "Exec",
            };
        }
        return {
            title: "Dashboard",
            description: "Review acknowledgement coverage across roles.",
            href: "/dashboard",
            badge: "Supervisor",
        };
    }, [mode]);

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
