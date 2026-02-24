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

function StatusPill({ ok }: { ok: boolean }) {
    return (
        <span
            className={[
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                ok
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
            ].join(" ")}
        >
            {ok ? "✅ Complete" : "⚠️ Pending"}
        </span>
    );
}

export default async function EmployeeDashboardPage() {
    const data = await fetchAcknowledgements();

    // ✅ TEMP: matches current function fallback user
    // When SSO is added, this becomes the real UPN automatically
    const userKey = "dev-user@integracare.com";

    const userData = data[userKey] ?? {};
    const roles = Object.keys(userData);

    const rows = roles.map((role) => {
        const rec = userData[role];
        const times = [
            rec?.dayInLife?.acknowledgedAt,
            rec?.inAbsence?.acknowledgedAt,
        ].filter(Boolean) as string[];

        const lastActivity =
            times.length > 0 ? times.sort().at(-1) : undefined;

        return {
            role,
            dayComplete: !!rec?.dayInLife,
            absenceComplete: !!rec?.inAbsence,
            lastActivity,
        };
    });

    return (
        <main className="space-y-8">
            {/* Greeting */}
            <header>
                <h1 className="text-2xl font-bold">
                    Welcome [Jeremy Joyner](https://www.office.com/search?q=Jeremy+Joyner&EntityRepresentationId=a4e5c137-49f3-45dc-b4a1-d00c80c557bb)
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Here’s a snapshot of your role documentation status.
                </p>
            </header>

            {/* Employee table */}
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
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-4 py-6 text-center text-slate-500"
                                >
                                    No acknowledgement activity found yet.
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr
                                    key={r.role}
                                    className="border-t last:border-b-0 hover:bg-slate-50"
                                >
                                    <td className="px-4 py-2 font-medium">{r.role}</td>
                                    <td className="px-4 py-2">
                                        <StatusPill ok={r.dayComplete} />
                                    </td>
                                    <td className="px-4 py-2">
                                        <StatusPill ok={r.absenceComplete} />
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">
                                        {formatDate(r.lastActivity)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </main>
    );
}
