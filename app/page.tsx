import { fetchPage, fetchDomainSummary, getDomains } from "@/lib/notion";
import { fetchAgenda } from "@/lib/agenda";
import {
  Telemetry,
  Blocks,
  DomainCards,
  Agenda,
  SetupCard,
  Colophon,
  LinkChips,
} from "./components";

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
  const tree = await getDomains();

  if (tree.error) {
    const empty = await fetchPage("none").catch(() => null);
    return (
      <main className="shell">
        <header className="masthead">
          <span className="wordmark">OS</span>
          <span className="masthead-date">{today()}</span>
        </header>
        <div className="telemetry">
          <span className="pulse down" aria-hidden />
          <span>Dashboard</span>
          <span className="sep">/</span>
          <span>sync down</span>
          <span className="sep">/</span>
          <span>{tree.error === "NO_TOKEN" ? "awaiting setup" : tree.error}</span>
        </div>
        <SetupCard error={tree.error} />
        <Colophon />
      </main>
    );
  }

  const [dash, agenda, ...summaries] = await Promise.all([
    tree.dashboardId
      ? fetchPage(tree.dashboardId)
      : Promise.resolve(null),
    fetchAgenda(),
    ...tree.domains.map((d) => fetchDomainSummary(d)),
  ]);

  return (
    <main className="shell">
      <header className="masthead">
        <span className="wordmark">OS</span>
        <span className="masthead-date">{today()}</span>
      </header>

      {dash && <Telemetry data={dash} label="Dashboard" />}

      <Agenda events={agenda} />

      {dash && <LinkChips links={dash.links} />}
      {dash && <Blocks blocks={dash.blocks} />}

      <DomainCards domains={summaries} />

      <Colophon />
    </main>
  );
}
