"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type TrackerItem = {
    id: string | number;
    fields?: {
        Title?: string;
        Status?: string; // "In Progress" | "Completed" | "Not Started"
        RequiresAttachment?: boolean;
        OrientationCategory?: string;
        RoleNameText?: string;
    };
};

const FALLBACK_EMPLOYEE_ID = "49";

function decodeHtml(s: string) {
    // Handles &amp; etc from SharePoint fields
    if (!s) return s;
    const txt = document.createElement("textarea");
    txt.innerHTML = s;
    return txt.value;
}

function toUiStatus(raw?: string) {
    const s = (raw ?? "").trim().toLowerCase();
    if (s === "completed") return "completed" as const;
    if (s === "in progress" || s === "in_progress") return "in_progress" as const;
    return "not_started" as const;
}

function toSpStatus(ui: "not_started" | "in_progress" | "completed") {
    // What we display in the chip
    if (ui === "completed") return "Completed";
    if (ui === "in_progress") return "In Progress";
    return "Not Started";
}

function StatusPill({ ui }: { ui: "not_started" | "in_progress" | "completed" }) {
    const styles =
        ui === "completed"
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : ui === "in_progress"
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-slate-50 text-slate-700 ring-slate-200";

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${styles}`}>
            {toSpStatus(ui)}
        </span>
    );
}

// Summary helper
function summarizeItems(items: TrackerItem[]) {
    return items.reduce(
        (acc, item) => {
            const s = toUiStatus(item.fields?.Status);
            if (s === "not_started") acc.notStarted += 1;
            else if (s === "in_progress") acc.inProgress += 1;
            else if (s === "completed") acc.completed += 1;
            return acc;
        },
        { notStarted: 0, inProgress: 0, completed: 0 }
    );
}

function UpdateStatusIcons({
    value,
    onChange,
}: {
    value: "not_started" | "in_progress" | "completed";
    onChange: (next: "not_started" | "in_progress" | "completed") => void;
}) {
    const base =
        "inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 transition";
    const inactive = "bg-white text-slate-600 ring-[hsl(var(--app-border))] hover:bg-slate-50";
    const active = "bg-slate-900 text-white ring-slate-900";

    return (
        <div className="flex items-center justify-end gap-2">
            <button
                type="button"
                title="Mark as Not Started"
                onClick={() => onChange("not_started")}
                className={`${base} ${value === "not_started" ? active : inactive}`}
                aria-label="Mark as Not Started"
            >
                ⭕
            </button>
            <button
                type="button"
                title="Mark as In Progress"
                onClick={() => onChange("in_progress")}
                className={`${base} ${value === "in_progress" ? active : inactive}`}
                aria-label="Mark as In Progress"
            >
                ⏳
            </button>
            <button
                type="button"
                title="Mark as Completed"
                onClick={() => onChange("completed")}
                className={`${base} ${value === "completed" ? active : inactive}`}
                aria-label="Mark as Completed"
            >
                ✅
            </button>
        </div>
    );
}

export default function OrientationClient() {
    const params = useSearchParams();

    const employeeId = useMemo(() => {
        const raw = params.get("employeeId");
        return raw && raw.trim() ? raw : FALLBACK_EMPLOYEE_ID;
    }, [params]);

    const [items, setItems] = useState<TrackerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const summary = useMemo(() => summarizeItems(items), [items]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`/api/orientation-tracker/${employeeId}`, {
                    cache: "no-store",
                });

                if (!res.ok) {
                    const text = await res.text().catch(() => "");
                    throw new Error(`Fetch failed (${res.status}) ${text}`);
                }

                const json = await res.json();

                if (!cancelled) {
                    setItems(Array.isArray(json.items) ? json.items : []);
                }
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [employeeId]);

    async function updateStatus(
        itemId: string | number,
        uiStatus: "not_started" | "in_progress" | "completed"
    ) {
        const res = await fetch(`/api/orientation-tracker/item/${itemId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: uiStatus, actor: "employee" }),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            alert(`Failed to update status (${res.status}). ${text}`);
            return;
        }

        setItems((prev) =>
            prev.map((it) =>
                String(it.id) === String(itemId)
                    ? { ...it, fields: { ...(it.fields ?? {}), Status: toSpStatus(uiStatus) } }
                    : it
            )
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-[hsl(var(--app-border))] bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold">My Orientation Items</h2>
                        <div className="mt-1 text-sm text-[hsl(var(--app-fg)/0.7)]">
                            EmployeeProfileId: {employeeId} &nbsp;•&nbsp; Items: {items.length}
                        </div>

                        {/* ✅ Status summary pills (requested) */}
                        {!loading && !error && items.length > 0 && (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                                    Not Started — {summary.notStarted}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                                    In Progress — {summary.inProgress}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
                                    Completed — {summary.completed}
                                </span>
                            </div>
                        )}
                    </div>

                    {!loading && !error && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Synced
                        </span>
                    )}
                </div>
            </div>

            {loading && (
                <div className="text-sm text-[hsl(var(--app-fg)/0.75)]">Loading items…</div>
            )}

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    Error: {error}
                </div>
            )}

            {!loading && !error && items.length === 0 && (
                <div className="rounded-lg border border-[hsl(var(--app-border))] bg-white p-6 text-sm text-[hsl(var(--app-fg)/0.75)]">
                    No orientation items found.
                </div>
            )}

            {!loading && !error && items.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-[hsl(var(--app-border))] bg-white">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="border-b border-[hsl(var(--app-border))] text-left text-xs font-semibold uppercase tracking-wide text-[hsl(var(--app-fg)/0.6)]">
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const titleRaw = item.fields?.Title ?? `Item ${item.id}`;
                                const title = decodeHtml(titleRaw);
                                const category = item.fields?.OrientationCategory ?? "—";
                                const uiStatus = toUiStatus(item.fields?.Status);

                                return (
                                    <tr
                                        key={String(item.id)}
                                        className="border-b border-[hsl(var(--app-border))] last:border-b-0"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{title}</div>
                                            {item.fields?.RequiresAttachment ? (
                                                <div className="mt-1 text-xs text-[hsl(var(--app-fg)/0.6)]">
                                                    Attachment required
                                                </div>
                                            ) : null}
                                        </td>

                                        <td className="px-4 py-3 text-sm text-[hsl(var(--app-fg)/0.75)]">
                                            {category}
                                        </td>

                                        <td className="px-4 py-3">
                                            <StatusPill ui={uiStatus} />
                                        </td>

                                        <td className="px-4 py-3">
                                            <UpdateStatusIcons
                                                value={uiStatus}
                                                onChange={(next) => updateStatus(item.id, next)}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}