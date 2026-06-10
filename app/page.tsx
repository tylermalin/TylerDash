import Link from "next/link";
import { fetchPage, PAGES } from "@/lib/notion";
import { Telemetry, Blocks, SetupCard, Colophon } from "./components";

export const dynamic = "force-dynamic";

function today(): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function Home() {
  const [dash, malama, beneficial] = await Promise.all([
    fetchPage(PAGES.dashboard.id),
    fetchPage(PAGES.malama.id),
    fetchPage(PAGES.beneficial.id),
  ]);

  return (
    <main className="shell">
      <header className="masthead">
        <span className="wordmark">OS</span>
        <span className="masthead-date">{today()}</span>
      </header>

      <Telemetry data={dash} label="Dashboard" />

      {dash.error ? <SetupCard error={dash.error} /> : <Blocks blocks={dash.blocks} />}

      <section className="domains">
        <p className="domains-label">Domains</p>
        <div className="domain-grid">
          {[
            { page: PAGES.malama, data: malama },
            { page: PAGES.beneficial, data: beneficial },
          ].map(({ page, data }) => (
            <Link className="domain-card" href={`/d/${page.slug}`} key={page.slug}>
              <span className="name">{page.title}</span>
              <span className="stat">
                {data.error ? (
                  "awaiting sync"
                ) : (
                  <>
                    <strong>{data.openCount} open</strong>
                    {data.updated ? ` · upd ${data.updated}` : ""}
                  </>
                )}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Colophon />
    </main>
  );
}
