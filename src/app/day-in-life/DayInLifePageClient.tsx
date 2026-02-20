"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SectionsMap } from "@/lib/dayInLife/types";
import RolePicker from "./components/RolePicker";
import Board from "./components/Board";
import EditToolbar from "./components/EditToolbar";
import { normalizePayload } from "@/lib/dayInLife/normalize";
import { computeChangeSet } from "@/lib/dayInLife/diff";
import Link from "next/link";

// Empty starter shape — "Calendar" intentionally removed
const EMPTY_SECTIONS: SectionsMap = {
    PriorToStandUp: [],
    AfterStandUp: [],
    ToBeScheduled: [],
    Other: [],
};

type DayInLifePageClientProps = {
    /**
     * When true, the Day in Life experience is strictly read-only:
     * - no edit toggle
     * - no mutation controls
     * - no save actions
     *
     * Defaults to false (supervisor behavior).
     */
    readOnly?: boolean;
};

export default function DayInLifePageClient({ readOnly = false }: DayInLifePageClientProps) {
    const params = useSearchParams();
    const mode = params.get("mode") === "employee" ? "employee" : "supervisor";
    const modeQuery = `mode=${mode}`;

    const [role, setRole] = useState("");
    const [sections, setSections] = useState<SectionsMap>(EMPTY_SECTIONS);
    const [isEditing, setIsEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [banner, setBanner] = useState<string | null>(null);
    const snapshotRef = useRef<SectionsMap | null>(null);

    // For safety, prevent edit mode from ever being active in read-only mode
    useEffect(() => {
        if (readOnly && isEditing) {
            setIsEditing(false);
            setBusy(false);
            setBanner(null);
        }
    }, [readOnly, isEditing]);

    // -------------------------
    // LOAD SUMMARY
    // -------------------------
    async function load() {
        const res = await fetch(`/api/day-in-life/summary`, { cache: "no-store" });
        if (!res.ok) {
            const body = await res.text();
            console.error("Failed to load DayInLife summary:", res.status, body);
            setBanner("We couldn't load the Day in the Life data. See console for details.");
            return;
        }
        const json = await res.json();
        setSections(normalizePayload(json));
    }

    useEffect(() => {
        void load();
    }, []);

    // -------------------------
    // SAVE CHANGES
    // -------------------------
    async function saveChangesAndExit() {
        // Hard guard: read-only means no saves, ever.
        if (readOnly) {
            setIsEditing(false);
            setBusy(false);
            setBanner(null);
            return;
        }

        const snapshot = snapshotRef.current ?? EMPTY_SECTIONS;
        const changes = computeChangeSet(snapshot, sections);

        // Guard: creating items requires a selected role
        if (changes.creates.length > 0 && !role) {
            setBanner("Please select a role before adding new items.");
            return;
        }

        // If no changes → exit edit mode quietly
        if (
            changes.creates.length === 0 &&
            changes.updates.length === 0 &&
            changes.deletes.length === 0
        ) {
            setIsEditing(false);
            setBanner(null);
            return;
        }

        try {
            setBusy(true);
            setBanner("Saving…");

            // Deletes
            for (const d of changes.deletes) {
                const res = await fetch(`/api/day-in-life/item/${encodeURIComponent(d.id)}`, {
                    method: "DELETE",
                    cache: "no-store",
                });
                if (!res.ok) {
                    const t = await res.text();
                    console.error("Delete failed:", res.status, t);
                    throw new Error(`Delete failed (${res.status}): ${t}`);
                }
            }

            // Updates
            for (const u of changes.updates) {
                const body: Record<string, unknown> = {};
                if (u.before.text !== u.after.text) body.text = u.after.text;
                if (u.before.section !== u.after.section) body.section = u.after.section;
                if (u.before.order !== u.after.order) body.order = u.after.order;
                if (u.before.active !== u.after.active) body.active = u.after.active;

                if (Object.keys(body).length > 0) {
                    const res = await fetch(`/api/day-in-life/item/${encodeURIComponent(u.id)}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                        cache: "no-store",
                    });
                    if (!res.ok) {
                        const t = await res.text();
                        console.error("Update failed:", res.status, t);
                        throw new Error(`Update failed (${res.status}): ${t}`);
                    }
                }
            }

            // Creates
            for (const c of changes.creates) {
                const body = {
                    role,
                    section: c.section,
                    text: c.text,
                    order: c.order,
                    active: true,
                };
                const res = await fetch(`/api/day-in-life/item`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                    cache: "no-store",
                });
                if (!res.ok) {
                    const t = await res.text();
                    console.error("Create failed:", res.status, t);
                    throw new Error(`Create failed (${res.status}): ${t}`);
                }
            }

            await load();
            setIsEditing(false);
            setBanner("Saved.");
            setTimeout(() => setBanner(null), 1500);
        } catch (e: unknown) {
            console.error("Save failed", e);
            setBanner("We couldn't save your changes. See console for details.");
        } finally {
            setBusy(false);
        }
    }

    // -------------------------
    // EDIT TOGGLE
    // -------------------------
    function toggleEdit() {
        // Hard guard: read-only means no editing, ever.
        if (readOnly) return;

        if (!isEditing) {
            snapshotRef.current = structuredClone(sections);
            setIsEditing(true);
            setBanner(null);
        } else {
            void saveChangesAndExit();
        }
    }

    const daysOfWeekHref = useMemo(() => {
        const qp: string[] = [];
        qp.push(modeQuery);
        if (role) qp.push(`role=${encodeURIComponent(role)}`);
        const qs = qp.length ? `?${qp.join("&")}` : "";
        return `/day-in-life/days-of-week${qs}`;
    }, [modeQuery, role]);

    // For extra safety, prevent Board from receiving a live setter in read-only mode.
    // (Loading still uses setSections above; this only limits interactive child controls.)
    const boardSetSections = useMemo(() => {
        if (!readOnly) return setSections;
        return (() => {
            // no-op in read-only
        }) as unknown as React.Dispatch<React.SetStateAction<SectionsMap>>;
    }, [readOnly, setSections]);

    // -------------------------
    // RENDER
    // -------------------------
    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            {/* Top Toolbar */}
            <div className="mb-4 flex items-center justify-between gap-4">
                {/* Left: Role Picker */}
                <RolePicker value={role} onChange={setRole} />

                {/* Right: Edit + Days of Week Button */}
                <div className="flex items-center gap-2">
                    {!readOnly && <EditToolbar isEditing={isEditing} onToggle={toggleEdit} />}

                    <Link
                        href={daysOfWeekHref}
                        className="rounded bg-teal-100 px-3 py-1.5 text-sm font-medium text-slate-800 shadow hover:bg-teal-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                        aria-label="Open Days of Week matrix"
                        title="Open Days of Week matrix"
                    >
                        Days of Week
                    </Link>
                </div>
            </div>

            {/* Banner */}
            {banner && (
                <div
                    role="status"
                    className="mb-4 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm"
                >
                    {banner}
                </div>
            )}

            {/* Main Board */}
            <Board sections={sections} setSections={boardSetSections} isEditing={readOnly ? false : isEditing} role={role} />

            {/* Saving overlay */}
            {isEditing && busy && !readOnly && (
                <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center">
                    <div className="mt-8 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 shadow-lg">
                        Saving…
                    </div>
                </div>
            )}
        </div>
    );
}