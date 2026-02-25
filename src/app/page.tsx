import Link from "next/link";

type HomeCardProps = {
  title: string;
  description: string;
  href: string;
};

function HomeCard({ title, description, href }: HomeCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-[hsl(var(--app-border))] bg-white p-6 transition hover:shadow-sm hover:border-[hsl(var(--app-border))]"
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[hsl(var(--app-fg)/0.75)]">
        {description}
      </p>
    </Link>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;

  // ✅ recognize exec as a third mode; default remains supervisor
  const mode =
    params?.mode === "employee"
      ? "employee"
      : params?.mode === "exec"
        ? "exec"
        : "supervisor";

  const modeQuery = `?mode=${mode}`;

  const dashboardHref =
    mode === "employee" ? "/me/dashboard" : mode === "exec" ? "/exec/dashboard" : "/dashboard";

  // ✅ Paste your SharePoint "Copy link" URL here (the macro workbook is [Hallmarks.xlsm](https://integracare.sharepoint.com/sites/ITHub/_layouts/15/Doc.aspx?sourcedoc=%7BD4150662-E4DF-43E4-9C2E-2335A587B8DE%7D&file=Hallmarks.xlsm&action=default&mobileredirect=true&DefaultItemOpen=1&EntityRepresentationId=64772b1b-31a8-4842-bd6e-96cfbb018d6d))
  // Found in tenant search: [Hallmarks.xlsm](https://integracare.sharepoint.com/sites/ITHub/_layouts/15/Doc.aspx?sourcedoc=%7BD4150662-E4DF-43E4-9C2E-2335A587B8DE%7D&file=Hallmarks.xlsm&action=default&mobileredirect=true&DefaultItemOpen=1&EntityRepresentationId=64772b1b-31a8-4842-bd6e-96cfbb018d6d) [1](https://integracare.sharepoint.com/sites/ITHub/_layouts/15/Doc.aspx?sourcedoc=%7BD4150662-E4DF-43E4-9C2E-2335A587B8DE%7D&file=Hallmarks.xlsm&action=default&mobileredirect=true&DefaultItemOpen=1)
  const HALLMARKS_URL = "PASTE_SHAREPOINT_LINK_TO_Hallmarks.xlsm_HERE";

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">Department Orientation</h1>
        <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--app-fg)/0.75)]">
          Manage employee orientation, role playbooks, and coverage guidance in one place.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--app-fg)/0.6)]">
          Get started
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <HomeCard
            title="Dashboard"
            description="See progress, alerts, and upcoming orientation activity."
            href={dashboardHref}
          />

          {mode === "employee" ? (
            <HomeCard
              title="My Orientation"
              description="View and update your orientation items."
              href={`/me/orientation${modeQuery}`}
            />
          ) : (
            <HomeCard
              title="Employees"
              description="Manage employees and release orientation items."
              href={`/employees${modeQuery}`}
            />
          )}

          <HomeCard
            title="Day in the Life"
            description="Living role playbooks and calendars by role."
            href={`${mode === "employee" ? "/me/day-in-life" : "/day-in-life"}${modeQuery}`}
          />

          <HomeCard
            title="In the Absence Of"
            description="Coverage plans and handoff guidance."
            href={`${mode === "employee" ? "/me/in-the-absence" : "/in-the-absence"}${modeQuery}`}
          />
        </div>

        {/* ✅ Supervisor + Exec only: Hallmarks external Excel link */}
        {mode !== "employee" ? (
          <div className="mt-6">
            <a
              href={"https://integracare.sharepoint.com/sites/ITHub/Dashboards/36_Hallmarks"}
              target="_blank"
              rel="noreferrer"
              className="flex items-start justify-between gap-4 rounded-lg border border-[hsl(var(--app-border))] bg-white p-6 transition hover:shadow-sm hover:border-[hsl(var(--app-border))]"
            >
              <div>
                <h3 className="text-base font-semibold">Hallmarks Tracker</h3>
                <p className="mt-2 text-sm text-[hsl(var(--app-fg)/0.75)]">
                  Opens the SharePoint Excel used by supervisors to update Hallmarks.
                </p>
              </div>
              <div className="text-sm font-semibold text-[hsl(var(--brand,220_90%_56%))]">
                Open →
              </div>
            </a>
          </div>
        ) : null}
      </section>
    </div>
  );
}