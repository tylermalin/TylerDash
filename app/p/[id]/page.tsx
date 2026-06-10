import Link from "next/link";
import { fetchPage, parseMetrics } from "@/lib/notion";
import {
  Telemetry,
  Blocks,
  SubPageCards,
  MetricCards,
  LinkChips,
  SetupCard,
  Colophon,
} from "../../components";

export const dynamic = "force-dynamic";

export default async function NotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clean = id.replaceAll("-", "");
  const data = await fetchPage(clean);
  const title = data.title ?? "Page";

  const isMetricsPage = title.toLowerCase().includes("metric");
  const metrics = isMetricsPage ? parseMetrics(data.blocks) : [];

  return (
    <main className="shell">
      <header className="masthead">
        <span className="wordmark">
          <Link href="/">OS</Link>
          <span style={{ color: "var(--ink-faint)" }}> / {title}</span>
        </span>
      </header>

      <Telemetry data={data} label={title} />

      <Link className="backlink" href="/" style={{ marginTop: 18 }}>
        ← Dashboard
      </Link>

      {data.error ? (
        <SetupCard error={data.error} />
      ) : (
        <>
          <LinkChips links={data.links} />
          {metrics.length > 0 && <MetricCards metrics={metrics} />}
          <Blocks blocks={data.blocks} />
          <SubPageCards pages={data.childPages} label="Sub-pages" />
        </>
      )}

      <Colophon />
    </main>
  );
}
