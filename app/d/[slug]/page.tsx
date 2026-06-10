import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPage, PAGES } from "@/lib/notion";
import { Telemetry, Blocks, SetupCard, Colophon } from "../../components";

export const dynamic = "force-dynamic";

export default async function DomainPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = Object.values(PAGES).find((p) => p.slug === slug);
  if (!page || !page.slug) notFound();

  const data = await fetchPage(page.id);

  return (
    <main className="shell">
      <header className="masthead">
        <span className="wordmark">
          <Link href="/">OS</Link>
          <span style={{ color: "var(--ink-faint)" }}> / {page.title}</span>
        </span>
      </header>

      <Telemetry data={data} label={page.title} />

      <Link className="backlink" href="/" style={{ marginTop: 18 }}>
        ← Dashboard
      </Link>

      {data.error ? <SetupCard error={data.error} /> : <Blocks blocks={data.blocks} />}

      <Colophon />
    </main>
  );
}
