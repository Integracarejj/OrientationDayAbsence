// src/app/exec/dashboard/page.tsx

import { headers } from "next/headers";

type AckRecord = { acknowledgedVersion: number; acknowledgedAt: string };
type AcknowledgementsJson = {
    [user: string]: {
        [role: string]: {
            dayInLife?: AckRecord;
            inAbsence?: AckRecord;
        };
    };
};

async function fetchAcknowledgements(): Promise<AcknowledgementsJson> {
    const base = process.env.AZURE_FUNCTION_BASE_URL;
    const code = process.env.AZURE_FUNCTION_CODE;

    if (!base || !code) {
        throw new Error("Missing AZURE_FUNCTION_BASE_URL or AZURE_FUNCTION_CODE");
    }

    const url = `${base}/api/Acknowledgements?code=${encodeURIComponent(code)}`;
    const res = await fetch(url, {
        cache: "no-store",
        headers: { "x-functions-key": code },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load acknowledgements: ${text}`);
    }

    return res.json();
}

function formatDate(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
}

function StatusPill({
    ok,
    labelOk,
    labelBad,
}: {
    ok: boolean;
    labelOk: string;
    labelBad: string;
}) {
    const cls = ok
        ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200"
        : "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200";

    return <span className={cls}>{ok ? `✅ ${labelOk}` : `⚠️ ${labelBad}`}</span>;
}

/**
 * Next 15+: headers() is async in some setups, so we await it.
 * This creates an absolute origin (proto + host) for server-side calls to /api/...
 */
async function getOriginFromHeaders(): Promise<string | null> {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    return `${proto}://${host}`;
}

async function fetchHeadcount(): Promise<number> {
    const origin = await getOriginFromHeaders();
    if (!origin) return 0;

    const url = `${origin}/api/employees/summary?top=500`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return 0;

    const json = (await res.json().catch(() => null)) as
        | { items?: unknown[] }
        | null;

    const items = Array.isArray(json?.items) ? (json!.items as unknown[]) : [];
    return items.length;
}

export default async function ExecDashboardPage() {
    const [ackData, headcount] = await Promise.all([
        fetchAcknowledgements(),
        fetchHeadcount(),
    ]);

    const users = Object.keys(ackData);

    const roles = new Set<string>();
    users.forEach((u) => {
        Object.keys(ackData[u] ?? {}).forEach((r) => roles.add(r));
    });

    const roleRows = Array.from(roles).map((role) => {
        let dayCount = 0;
        let absenceCount = 0;
        let latest: string | null = null;

        users.forEach((u) => {
            const rec = ackData[u]?.[role];

            if (rec?.dayInLife) {
                dayCount++;
                latest =
                    !latest || rec.dayInLife.acknowledgedAt > latest
                        ? rec.dayInLife.acknowledgedAt
                        : latest;
            }

            if (rec?.inAbsence) {
                absenceCount++;
                latest =
                    !latest || rec.inAbsence.acknowledgedAt > latest
                        ? rec.inAbsence.acknowledgedAt
                        : latest;
            }
        });

        return {
            role,
            dayComplete: dayCount === users.length && users.length > 0,
            absenceComplete: absenceCount === users.length && users.length > 0,
            latest,
        };
    });

    const outstanding = roleRows.filter(
        (r) => !r.dayComplete || !r.absenceComplete
    ).length;

    const dayCompleteCount = roleRows.filter((r) => r.dayComplete).length;
    const absenceCompleteCount = roleRows.filter((r) => r.absenceComplete).length;

    return (
        <div className="space-y-8">
            {/* Header */}
            <section>
                <h1 className="text-3xl font-bold">Executive Dashboard</h1>
                <p className="mt-2 text-slate-600">
                    Summary rollup of acknowledgement coverage and key counts.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                    Coverage is computed from acknowledgements ({users.length} users observed).
                </p>
            </section>

            {/* KPI cards */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">Employees</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">
                        {headcount}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                        From /api/employees/summary
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">Day in the Life</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">
                        {dayCompleteCount}/{roleRows.length}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Roles fully acknowledged</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">In the Absence</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">
                        {absenceCompleteCount}/{roleRows.length}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Roles fully acknowledged</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">Outstanding Roles</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">
                        {outstanding}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Need attention</div>
                </div>
            </section>

            {/* Role table */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Roles needing attention
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Coverage status by role (Day in the Life / In the Absence).
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="py-3 pr-4">Role</th>
                                <th className="py-3 pr-4">Day in the Life</th>
                                <th className="py-3 pr-4">In the Absence</th>
                                <th className="py-3">Last Activity</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {roleRows
                                .sort((a, b) => a.role.localeCompare(b.role))
                                .map((r) => (
                                    <tr key={r.role} className="hover:bg-slate-50">
                                        <td className="py-3 pr-4 font-medium text-slate-900">
                                            {r.role}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <StatusPill ok={r.dayComplete} labelOk="Complete" labelBad="Missing" />
                                        </td>
                                        <td className="py-3 pr-4">
                                            <StatusPill ok={r.absenceComplete} labelOk="Complete" labelBad="Missing" />
                                        </td>
                                        <td className="py-3 text-slate-700">
                                            {formatDate(r.latest ?? undefined)}
                                        </td>
                                    </tr>
                                ))}

                            {!roleRows.length && (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-sm text-slate-600">
                                        No roles found in acknowledgements data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
