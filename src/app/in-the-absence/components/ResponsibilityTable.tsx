"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type SheetPayload = {
    name?: string;
    title?: string;
    metaLines?: string[];
    objective?: string | null;
    table?: {
        columns?: Array<{ key?: string; label?: string }>;
        // Rows in the role JSONs are keyed by the *display headers* (labels), not necessarily by column.key.
        // Values can be non-string (null/number/etc.) depending on the source file.
        rows?: Array<Record<string, unknown>>;
        rawHeaders?: string[];
    };
};

type ColumnDef = {
    /** Stable internal id for React keys */
    id: string;
    /** Display label shown in the header */
    label: string;
    /** Optional source key (from JSON) */
    key?: string;
    /** Preferred key to read/write in row objects */
    storageKey: string;
};

function asString(v: unknown): string {
    if (typeof v === "string") return v;
    if (v === null || v === undefined) return "";
    return String(v);
}

export default function ResponsibilityTable({
    sheet,
    isEditing,
    onChange,
}: {
    sheet: SheetPayload;
    isEditing: boolean;
    onChange: (next: SheetPayload) => void;
}) {
    const columns = sheet.table?.columns ?? [];
    const rows = sheet.table?.rows ?? [];

    // Build stable, unique column identities.
    // NOTE: We *display* label, but we *store* values under the same key the JSON already uses (label when present).
    const columnDefs: ColumnDef[] = useMemo(() => {
        const seen = new Map<string, number>();

        return columns.map((c, idx) => {
            const label = c.label || c.key || `Column ${idx + 1}`;
            const baseStorage = c.label || c.key || `col_${idx + 1}`;
            const n = (seen.get(baseStorage) ?? 0) + 1;
            seen.set(baseStorage, n);

            // If a label repeats (rare), disambiguate storageKey while keeping display label readable.
            const storageKey = n === 1 ? baseStorage : `${baseStorage} (${n})`;

            return {
                id: `${(c.key || c.label || "col").replace(/\s+/g, "_")}_${idx}`,
                label: n === 1 ? label : `${label} (${n})`,
                key: c.key,
                storageKey,
            };
        });
    }, [columns]);

    function readCell(row: Record<string, unknown>, col: ColumnDef): string {
        // Most role JSONs key rows by header label.
        // Fall back to column.key and internal id if needed.
        if (Object.prototype.hasOwnProperty.call(row, col.storageKey)) return asString(row[col.storageKey]);
        if (col.key && Object.prototype.hasOwnProperty.call(row, col.key)) return asString(row[col.key]);
        if (Object.prototype.hasOwnProperty.call(row, col.label)) return asString(row[col.label]);
        if (Object.prototype.hasOwnProperty.call(row, col.id)) return asString(row[col.id]);
        return "";
    }

    function writeCell(rowIndex: number, col: ColumnDef, value: string) {
        const next = structuredClone(sheet);
        next.table = next.table ?? {};
        next.table.rows = Array.isArray(next.table.rows) ? next.table.rows : [];
        if (!next.table.rows[rowIndex]) next.table.rows[rowIndex] = {};

        // Write to the same key shape as the source JSONs (label/header based)
        next.table.rows[rowIndex][col.storageKey] = value;

        // Optional mirror into key-based storage to future-proof
        if (col.key) next.table.rows[rowIndex][col.key] = value;

        onChange(next);
    }

    function addRow() {
        const next = structuredClone(sheet);
        next.table = next.table ?? {};
        next.table.rows = Array.isArray(next.table.rows) ? next.table.rows : [];

        const newRow: Record<string, unknown> = {};
        for (const col of columnDefs) {
            newRow[col.storageKey] = "";
            if (col.key) newRow[col.key] = "";
        }

        next.table.rows.push(newRow);
        onChange(next);
    }

    // -------------------------
    // SCROLLING + STICKY BARS
    // -------------------------
    const mainScrollRef = useRef<HTMLDivElement | null>(null);
    const bottomScrollRef = useRef<HTMLDivElement | null>(null);
    const [scrollWidth, setScrollWidth] = useState<number>(0);
    const [showStickyBottomBar, setShowStickyBottomBar] = useState<boolean>(false);

    // Measure scrollWidth and whether vertical overflow exists.
    // We only show the sticky bottom scrollbar when the table area scrolls vertically;
    // otherwise we'd get a "double" horizontal scrollbar (like you're seeing on DED).
    useEffect(() => {
        const el = mainScrollRef.current;
        if (!el) return;

        const measure = () => {
            setScrollWidth(el.scrollWidth);
            // +1 guard to avoid jitter from sub-pixel rounding
            const hasVerticalOverflow = el.scrollHeight > el.clientHeight + 1;
            setShowStickyBottomBar(hasVerticalOverflow);
        };

        measure();

        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [columnDefs.length, rows.length]);

    // Sync horizontal scroll main -> bottom
    useEffect(() => {
        const main = mainScrollRef.current;
        const bottom = bottomScrollRef.current;
        if (!main || !bottom) return;

        const onMainScroll = () => {
            if (bottom.scrollLeft !== main.scrollLeft) bottom.scrollLeft = main.scrollLeft;
        };

        main.addEventListener("scroll", onMainScroll, { passive: true });
        return () => main.removeEventListener("scroll", onMainScroll);
    }, []);

    // Sync horizontal scroll bottom -> main
    useEffect(() => {
        const main = mainScrollRef.current;
        const bottom = bottomScrollRef.current;
        if (!main || !bottom) return;

        const onBottomScroll = () => {
            if (main.scrollLeft !== bottom.scrollLeft) main.scrollLeft = bottom.scrollLeft;
        };

        bottom.addEventListener("scroll", onBottomScroll, { passive: true });
        return () => bottom.removeEventListener("scroll", onBottomScroll);
    }, []);

    if (columnDefs.length === 0) {
        return (
            <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-700">
                No table structure found.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {isEditing && (
                <button
                    type="button"
                    onClick={addRow}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                    Add Row
                </button>
            )}

            {/* Card wrapper */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* MAIN SCROLLER (vertical scrollbar on right) */}
                <div ref={mainScrollRef} className="max-h-[70vh] overflow-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                        {/* Sticky header */}
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                            <tr>
                                {columnDefs.map((col) => (
                                    <th
                                        key={col.id}
                                        className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold text-slate-800"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columnDefs.length} className="px-3 py-3 text-slate-600">
                                        No rows.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, rowIndex) => (
                                    <tr key={`row_${rowIndex}`} className="odd:bg-white even:bg-slate-50/40">
                                        {columnDefs.map((col) => {
                                            const value = readCell((row ?? {}) as Record<string, unknown>, col);
                                            return (
                                                <td
                                                    key={`${col.id}_${rowIndex}`}
                                                    className="align-top border-t border-slate-100 px-3 py-2"
                                                >
                                                    {isEditing ? (
                                                        <textarea
                                                            value={value}
                                                            onChange={(e) => writeCell(rowIndex, col, e.target.value)}
                                                            className="w-full min-w-[16rem] rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            rows={Math.min(6, Math.max(2, Math.ceil((value.length + 1) / 60)))}
                                                        />
                                                    ) : (
                                                        <div className="whitespace-pre-wrap wrap-break-word">{value}</div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* STICKY BOTTOM HORIZONTAL SCROLLBAR */}
                {showStickyBottomBar ? (
                    <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white">
                        <div ref={bottomScrollRef} className="h-4 overflow-x-auto overflow-y-hidden">
                            {/* Spacer creates the scrollbar track */}
                            <div style={{ width: scrollWidth, height: 1 }} />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
