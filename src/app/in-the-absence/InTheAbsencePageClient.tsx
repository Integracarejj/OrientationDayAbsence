"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// ✅ Use relative imports so this works even if tsconfig path aliases differ
import RolePicker from "../day-in-life/components/RolePicker";
import ResponsibilityTable, { type SheetPayload } from "./components/ResponsibilityTable";

import AcknowledgementBanner, {
    type AcknowledgementState,
} from "@/components/acknowledgements/AcknowledgementBanner";

type InAbsenceSummaryResponse = {
    ok?: boolean;
    version?: number;
    updatedAt?: string | null;
    roles?: Record<string, RolePayload>;
    count?: number;
};

type RolePayload = {
    version?: number;
    updatedAt?: string;
    role?: string;
    sourceFile?: string;
    sheets?: SheetPayload[];
    [k: string]: unknown;
};

export default function InTheAbsencePageClient({ readOnly = false }: { readOnly?: boolean }) {
    const params = useSearchParams();
    const mode = params.get("mode") === "employee" ? "employee" : "supervisor";

    // Hard rule: employee mode is read-only (even if someone hits supervisor route)
    const effectiveReadOnly = readOnly || mode === "employee";

    const [role, setRole] = useState("");
    const [data, setData] = useState<InAbsenceSummaryResponse | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [banner, setBanner] = useState<string | null>(null);

    // Snapshot used to detect "no changes"
    const snapshotJsonRef = useRef<string | null>(null);

    // Ack state (employee mode; role-scoped)
    const [ack, setAck] = useState<AcknowledgementState | null>(null);

    // -------------------------
    // LOAD SUMMARY
    // -------------------------
    async function load() {
        const res = await fetch("/api/in-the-absence/summary", { cache: "no-store" });
        if (!res.ok) {
            const body = await res.text();
            console.error("Failed to load In Absence Of summary:", res.status, body);
            setBanner("We couldn't load the In the Absence Of data. See console for details.");
            return;
        }
        const json = (await res.json()) as InAbsenceSummaryResponse;
        setData(json);
    }

    useEffect(() => {
        void load();
    }, []);

    // Safety: never allow editing in read-only mode
    useEffect(() => {
        if (effectiveReadOnly && isEditing) {
            setIsEditing(false);
            setBusy(false);
            setBanner(null);
        }
    }, [effectiveReadOnly, isEditing]);

    // If role changes while editing, exit edit mode (prevents saving the wrong role)
    useEffect(() => {
        if (isEditing) {
            setIsEditing(false);
            setBusy(false);
            setBanner("Role changed — exited edit mode.");
            setTimeout(() => setBanner(null), 1200);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role]);

    const selectedRolePayload: RolePayload | null = useMemo(() => {
        if (!data?.roles) return null;
        if (!role) return null;
        return data.roles[role] ?? null;
    }, [data, role]);

    function setSelectedRolePayload(next: RolePayload) {
        setData((prev) => {
            if (!prev?.roles) return prev;
            const copy: InAbsenceSummaryResponse = structuredClone(prev);
            copy.roles = copy.roles ?? {};
            copy.roles[role] = next;
            return copy;
        });
    }

    // -------------------------
    // ACK LOAD (employee mode; role-scoped)
    // -------------------------
    async function loadAck(nextRole: string) {
        if (mode !== "employee") return;
        if (!nextRole) {
            setAck(null);
            return;
        }

        try {
            const res = await fetch(
                `/api/acknowledgements?role=${encodeURIComponent(nextRole)}&contentType=inAbsence`,
                { cache: "no-store" }
            );

            if (!res.ok) {
                setAck(null);
                return;
            }

            const json = (await res.json()) as {
                acknowledgedVersion?: number;
                acknowledgedAt?: string | null;
            };

            setAck({
                acknowledgedVersion: json?.acknowledgedVersion ?? null,
                acknowledgedAt: json?.acknowledgedAt ?? null,
            });
        } catch (e) {
            console.error("Failed to load acknowledgement", e);
            setAck(null);
        }
    }

    useEffect(() => {
        void loadAck(role);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role, mode]);

    function enterEditMode() {
        if (effectiveReadOnly) return;
        if (!selectedRolePayload) {
            setBanner("Please select a role before editing.");
            return;
        }
        snapshotJsonRef.current = JSON.stringify(selectedRolePayload);
        setIsEditing(true);
        setBanner(null);
    }

    async function saveChangesAndExit() {
        if (effectiveReadOnly) {
            setIsEditing(false);
            setBusy(false);
            setBanner(null);
            return;
        }
        if (!role) {
            setBanner("Please select a role before saving.");
            return;
        }
        if (!selectedRolePayload) {
            setBanner("No role data loaded for the selected role.");
            return;
        }

        // If no changes, exit gracefully (no PUT)
        const before = snapshotJsonRef.current ?? "";
        const after = JSON.stringify(selectedRolePayload);
        if (before && before === after) {
            setIsEditing(false);
            setBanner(null);
            return;
        }

        try {
            setBusy(true);
            setBanner("Saving…");
            const res = await fetch(`/api/in-the-absence/${encodeURIComponent(role)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(selectedRolePayload),
                cache: "no-store",
            });
            const text = await res.text();
            if (!res.ok) {
                console.error("Save failed:", res.status, text);
                throw new Error(`Save failed (${res.status}): ${text}`);
            }
            await load();
            setIsEditing(false);
            setBanner("Saved.");
            setTimeout(() => setBanner(null), 1500);
        } catch (e) {
            console.error("Save failed", e);
            setBanner("We couldn't save your changes. See console for details.");
        } finally {
            setBusy(false);
        }
    }

    function onEditToggle() {
        if (effectiveReadOnly) return;
        if (!isEditing) enterEditMode();
        else void saveChangesAndExit();
    }

    const currentVersion = useMemo(() => {
        // Prefer role-level version; fall back to summary version; then 1
        const v =
            (typeof selectedRolePayload?.version === "number" ? selectedRolePayload?.version : undefined) ??
            (typeof data?.version === "number" ? data?.version : undefined);
        return typeof v === "number" && v > 0 ? v : 1;
    }, [selectedRolePayload, data]);

    const updatedAt = useMemo(() => {
        return (
            (typeof selectedRolePayload?.updatedAt === "string" ? selectedRolePayload?.updatedAt : undefined) ??
            (typeof data?.updatedAt === "string" ? data?.updatedAt : undefined) ??
            null
        );
    }, [selectedRolePayload, data]);

    // -------------------------
    // RENDER
    // -------------------------
    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-start justify-between gap-3">
                {/* Left: Role Picker */}
                <div className="min-w-65">
                    <RolePicker value={role} onChange={setRole} />
                </div>

                {/* Middle: Acknowledgement area (employee mode only) */}
                <div className="flex-1">
                    {mode === "employee" && role ? (
                        <AcknowledgementBanner
                            roleCode={role}
                            contentType="inAbsence"
                            currentVersion={currentVersion}
                            updatedAt={updatedAt}
                            state={ack}
                            onAcknowledged={(next) => setAck(next)}
                        />
                    ) : null}
                </div>

                {/* Right: Edit */}
                <div className="flex items-center gap-2">
                    {!effectiveReadOnly && (
                        <button
                            type="button"
                            onClick={onEditToggle}
                            disabled={busy}
                            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-60"
                        >
                            {isEditing ? "Done" : "Edit"}
                        </button>
                    )}
                </div>
            </div>

            {/* Banner */}
            {banner && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                    {banner}
                </div>
            )}

            {/* Content */}
            {!role ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                    Select a role to begin.
                </div>
            ) : !selectedRolePayload ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                    No data found for the selected role.
                </div>
            ) : (
                <div className="space-y-6">
                    {(selectedRolePayload.sheets ?? []).map((sheet: SheetPayload, idx: number) => (
                        <div key={`${sheet.title ?? sheet.name ?? "sheet"}-${idx}`} className="space-y-3">
                            <h3 className="text-lg font-semibold text-white">
                                {sheet.title ?? sheet.name ?? "In the Absence Of"}
                            </h3>

                            {Array.isArray(sheet.metaLines) && sheet.metaLines.length > 0 && (
                                <div className="space-y-1 text-sm text-slate-300">
                                    {sheet.metaLines.map((line: string, i: number) => (
                                        <div key={i}>{line}</div>
                                    ))}
                                </div>
                            )}

                            {sheet.objective ? (
                                <div className="text-sm text-slate-300">
                                    <span className="font-medium text-slate-200">Objective:</span> {sheet.objective}
                                </div>
                            ) : null}

                            <ResponsibilityTable
                                sheet={sheet}
                                isEditing={!effectiveReadOnly && isEditing}
                                onChange={(nextSheet: SheetPayload) => {
                                    const nextRole = structuredClone(selectedRolePayload);
                                    const sheets = Array.isArray(nextRole.sheets) ? nextRole.sheets : [];
                                    sheets[idx] = nextSheet;
                                    nextRole.sheets = sheets;
                                    setSelectedRolePayload(nextRole);
                                }}
                            />

                        </div>
                    ))}
                </div>
            )}

            {/* Saving overlay */}
            {isEditing && busy && !effectiveReadOnly && (
                <div className="fixed bottom-4 right-4 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 shadow-lg">
                    Saving…
                </div>
            )}
        </div>
    );
}