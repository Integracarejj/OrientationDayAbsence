type AckRecord = {
    acknowledgedVersion: number;
    acknowledgedAt: string;
};

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
        headers: {
            "x-functions-key": code,
        },
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
    return (
        <span
            className={[
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                ok
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
            ].join(" ")}
        >
            {ok ? `✅ ${labelOk}` : `⚠️ ${labelBad}`}
        </span>
    );
}

export default async function SupervisorDashboardPage() {
    const data = await fetchAcknowledgements();

    const users = Object.keys(data);
    const roles = new Set<string>();

    users.forEach((u) => {
        Object.keys(data[u] || {}).forEach((r) => roles.add(r));
    });

    const roleRows = Array.from(roles).map((role) => {
        let dayCount = 0;
        let absenceCount = 0;
        let latest: string | null = null;

        users.forEach((u) => {
            const rec = data[u]?.[role];
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

    return (
        <main className="space-y-8">
            {/* Header */}
            <header>
                <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Review acknowledgement coverage across roles.
                </p>
            </header>

            {/* KPI cards */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                        Employees
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{users.length}</div>
                </div>

                <div className="rounded-lg border bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                        Day in the Life
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                        {roleRows.filter((r) => r.dayComplete).length}/{roleRows.length}
                    </div>
                </div>

                <div className="rounded-lg border bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                        In the Absence
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                        {roleRows.filter((r) => r.absenceComplete).length}/{roleRows.length}
                    </div>
                </div>

                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-amber-700">
                        Outstanding Roles
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-amber-800">
                        {outstanding}
                    </div>
                    <div className="mt-1 text-xs text-amber-700">
                        Roles needing attention
                    </div>
                </div>
            </section>

            {/* Role table */}
            <section className="overflow-hidden rounded-lg border bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-2 text-left font-semibold">Role</th>
                            <th className="px-4 py-2 text-left font-semibold">
                                Day in the Life
                            </th>
                            <th className="px-4 py-2 text-left font-semibold">
                                In the Absence
                            </th>
                            <th className="px-4 py-2 text-left font-semibold">
                                Last Activity
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {roleRows.map((r) => (
                            <tr
                                key={r.role}
                                className="border-t last:border-b-0 hover:bg-slate-50"
                            >
                                <td className="px-4 py-2 font-medium">{r.role}</td>
                                <td className="px-4 py-2">
                                    <StatusPill
                                        ok={r.dayComplete}
                                        labelOk="Complete"
                                        labelBad="Pending"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <StatusPill
                                        ok={r.absenceComplete}
                                        labelOk="Complete"
                                        labelBad="Pending"
                                    />
                                </td>
                                <td className="px-4 py-2 text-slate-500">
                                    {formatDate(r.latest ?? undefined)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </main>
    );
}