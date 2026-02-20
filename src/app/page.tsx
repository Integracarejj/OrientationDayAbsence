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
      <p className="mt-2 text-sm text-[hsl(var(--app-fg)/0.75)]">{description}</p>
    </Link>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const mode = params.mode === "employee" ? "employee" : "supervisor";
  const modeQuery = `?mode=${mode}`;

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <section>
        <h1 className="text-2xl font-bold">Department Orientation</h1>
        <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--app-fg)/0.75)]">
          Manage employee orientation, role playbooks, and coverage guidance in one place.
        </p>
      </section>

      {/* Primary actions */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--app-fg)/0.6)]">
          Get started
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <HomeCard
            title="Dashboard"
            description="See progress, alerts, and upcoming orientation activity."
            href={`/dashboard${modeQuery}`}
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
            href={`${mode === "employee" ? `/me/day-in-life` : `/day-in-life`}${modeQuery}`}
          />

          <HomeCard
            title="In the Absence Of"
            description="Coverage plans and handoff guidance."
            href={`/in-the-absence${modeQuery}`}
          />
        </div>
      </section>
    </div>
  );
}