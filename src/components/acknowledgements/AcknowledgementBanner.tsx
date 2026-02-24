"use client";

import { useMemo, useState } from "react";

export type AcknowledgementState = {
    acknowledgedVersion?: number | null;
    acknowledgedAt?: string | null;
};

type Props = {
    roleCode: string;
    contentType: "dayInLife" | "inAbsence";
    currentVersion: number;
    updatedAt?: string | null;
    state?: AcknowledgementState | null;
    onAcknowledged?: (next: { acknowledgedVersion: number; acknowledgedAt: string }) => void;
};

function formatDate(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AcknowledgementBanner({
    roleCode,
    contentType,
    currentVersion,
    updatedAt,
    state,
    onAcknowledged,
}: Props) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const acknowledgedVersion = state?.acknowledgedVersion ?? null;
    const acknowledgedAt = state?.acknowledgedAt ?? null;

    const needsAck = useMemo(() => {
        if (!roleCode) return false;
        if (!currentVersion || currentVersion < 1) return true;
        if (!acknowledgedVersion) return true;
        return acknowledgedVersion < currentVersion;
    }, [roleCode, currentVersion, acknowledgedVersion]);

    const updatedSince = useMemo(() => {
        if (!acknowledgedVersion) return false;
        return acknowledgedVersion < currentVersion;
    }, [acknowledgedVersion, currentVersion]);

    const reviewedLabel = useMemo(() => {
        const d = formatDate(acknowledgedAt);
        return d ? `Reviewed on ${d}` : `Reviewed`;
    }, [acknowledgedAt]);

    const helper = useMemo(() => {
        if (!needsAck) return null;
        if (updatedSince) {
            const d = formatDate(updatedAt);
            return d
                ? `This document has been updated since you last reviewed it (${d}). Please review the changes and re‑acknowledge when ready.`
                : `This document has been updated since you last reviewed it. Please review the changes and re‑acknowledge when ready.`;
        }
        return `We trust you. Here’s the information. Please acknowledge when you’ve reviewed it.`;
    }, [needsAck, updatedSince, updatedAt]);

    const checkboxText =
        contentType === "dayInLife"
            ? "Acknowledge that you have reviewed the Day in the Life and Days of Week documentation for this role."
            : "Acknowledge that you have reviewed the In the Absence Of documentation for this role.";

    async function confirm() {
        if (!roleCode) return;
        setBusy(true);
        setErr(null);
        try {
            const res = await fetch(`/api/acknowledgements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    roleCode,
                    contentType,
                    acknowledgedVersion: currentVersion && currentVersion > 0 ? currentVersion : 1,
                }),
            });

            const text = await res.text();
            if (!res.ok) {
                throw new Error(text || `Failed (${res.status})`);
            }

            let nextAt = new Date().toISOString();
            try {
                const json = JSON.parse(text);
                if (json?.acknowledgedAt) nextAt = json.acknowledgedAt;
            } catch { }

            onAcknowledged?.({
                acknowledgedVersion: currentVersion && currentVersion > 0 ? currentVersion : 1,
                acknowledgedAt: nextAt,
            });

            setOpen(false);
        } catch (e: unknown) {
            console.error("Acknowledgement POST failed", e);
            setErr("We couldn't save your acknowledgement. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    // ✅ UPDATED: reviewed state uses SAME container styling, no checkbox
    if (!needsAck) {
        return (
            <div className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50">
                <div className="text-sm font-semibold text-slate-800">
                    {reviewedLabel}
                </div>
            </div>
        );
    }

    return (
        <div className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50">
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    disabled={busy}
                    className={[
                        "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded",
                        "border-2 border-slate-400 bg-white",
                        "hover:bg-slate-100",
                        "focus:outline-none focus:ring-2 focus:ring-teal-500",
                        "disabled:opacity-60",
                    ].join(" ")}
                    aria-label="Acknowledge"
                    title="Acknowledge"
                >
                    <span className="block h-2.5 w-2.5 rounded-sm bg-transparent" />
                </button>

                <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">
                        {checkboxText}
                    </div>

                    {helper ? (
                        <div className="mt-1 text-xs text-slate-600">{helper}</div>
                    ) : null}

                    {err ? (
                        <div className="mt-1 text-xs text-rose-600">{err}</div>
                    ) : null}
                </div>
            </div>

            {open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
                        <div className="text-lg font-semibold text-slate-900">
                            Confirm acknowledgment
                        </div>

                        <div className="mt-2 text-sm text-slate-600">
                            By acknowledging this, your supervisor will be able to see that
                            you’ve reviewed{" "}
                            {contentType === "dayInLife"
                                ? "the Day in the Life and the Days of the Week documentation"
                                : "the In the Absence Of documentation"}{" "}
                            for this role.
                        </div>

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={busy}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => void confirm()}
                                disabled={busy}
                                className="rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                            >
                                {busy ? "Saving…" : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
