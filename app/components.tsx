import Link from "next/link";
import type { Block, DomainSummary, LinkItem, Metric, PageData } from "@/lib/notion";
import { NOTION_OS_URL } from "@/lib/notion";
import type { AgendaEvent } from "@/lib/agenda";
import { fmtDay, fmtTime } from "@/lib/dates";

export function Telemetry({ data, label }: { data: PageData; label: string }) {
  const live = !data.error;
  return (
    <div className="telemetry">
      <span className={`pulse${live ? "" : " down"}`} aria-hidden />
      <span>{label}</span>
      <span className="sep">/</span>
      <span>{live ? "Notion sync live" : "sync down"}</span>
      <span className="sep">/</span>
      {live ? (
        <>
          <span>
            <span className="open-count">{data.openCount} open</span>
            {data.doneCount > 0 ? ` · ${data.doneCount} done` : ""}
          </span>
          {data.updated && (
            <>
              <span className="sep">/</span>
              <span>upd {data.updated}</span>
            </>
          )}
        </>
      ) : (
        <span>{data.error === "NO_TOKEN" ? "awaiting setup" : data.error}</span>
      )}
    </div>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="content">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1":
            return <h2 className="h1" key={i}>{b.text}</h2>;
          case "h2":
            return <h3 className="h2" key={i}>{b.text}</h3>;
          case "h3":
            return <h4 className="h3" key={i}>{b.text}</h4>;
          case "p": {
            const meta =
              b.text.startsWith("Updated:") ||
              b.text.startsWith("Note:") ||
              b.text.startsWith("Pilot scope:") ||
              b.text.startsWith("Format rule:") ||
              b.text.startsWith("Status:");
            return <p className={`p${meta ? " meta" : ""}`} key={i}>{b.text}</p>;
          }
          case "li":
            return (
              <p className="li" key={i}>
                {b.href ? (
                  <a href={b.href} target="_blank" rel="noreferrer">{b.text}</a>
                ) : (
                  b.text
                )}
              </p>
            );
          case "todo":
            return (
              <div className={`todo${b.checked ? " done" : ""}`} key={i}>
                <span className="box" aria-hidden />
                <span className="label">{b.text}</span>
              </div>
            );
          case "divider":
            return <hr className="divider" key={i} />;
        }
      })}
    </div>
  );
}

export function Progress({ open, done }: { open: number; done: number }) {
  const total = open + done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="progress" role="img" aria-label={`${done} of ${total} done`}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function DomainCards({ domains }: { domains: DomainSummary[] }) {
  if (domains.length === 0) return null;
  return (
    <section className="domains">
      <p className="domains-label">Domains</p>
      <div className="domain-grid">
        {domains.map((d) => (
          <Link className="domain-card" href={`/p/${d.id}`} key={d.id}>
            <span className="name">{d.title}</span>
            <span className="stat">
              {d.error ? (
                "awaiting sync"
              ) : (
                <>
                  <strong>{d.open} open</strong>
                  {d.done > 0 ? ` · ${d.done} done` : ""}
                  {d.subPages > 0 ? ` · ${d.subPages} pages` : ""}
                </>
              )}
            </span>
            {!d.error && <Progress open={d.open} done={d.done} />}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SubPageCards({ pages, label = "Pages" }: { pages: { id: string; title: string }[]; label?: string }) {
  if (pages.length === 0) return null;
  return (
    <section className="domains" style={{ marginTop: 28 }}>
      <p className="domains-label">{label}</p>
      <div className="domain-grid">
        {pages.map((p) => (
          <Link className="domain-card" href={`/p/${p.id}`} key={p.id}>
            <span className="name">{p.title}</span>
            <span className="stat">open →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function MetricCards({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) return null;
  return (
    <div className="metric-grid">
      {metrics.map((m, i) => (
        <div className={`metric-card${m.pending ? " pending" : ""}`} key={i}>
          <span className="metric-value">{m.pending ? "—" : m.value}</span>
          <span className="metric-label">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LinkChips({ links }: { links: LinkItem[] }) {
  if (links.length === 0) return null;
  return (
    <div className="chips">
      {links.map((l, i) => (
        <a className="chip" href={l.url} target="_blank" rel="noreferrer" key={i}>
          {l.title}
        </a>
      ))}
    </div>
  );
}

export function Agenda({ events }: { events: AgendaEvent[] | null }) {
  if (events === null) return null; // not configured: stay silent
  return (
    <section className="agenda">
      <p className="domains-label">Next 7 days</p>
      {events.length === 0 ? (
        <p className="p meta">No events in the window, or calendar unreachable.</p>
      ) : (
        <div className="agenda-list">
          {events.map((e, i) => (
            <div className="agenda-row" key={i}>
              <span className="agenda-when">
                {fmtDay(e.start)}
                {!e.allDay && <em> {fmtTime(e.start)}</em>}
              </span>
              <span className="agenda-what">{e.summary}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function SetupCard({ error }: { error: string }) {
  return (
    <div className="setup">
      <h2>{error === "NO_TOKEN" ? "Connect Notion to go live" : "Sync is down"}</h2>
      {error === "NO_TOKEN" ? (
        <ol>
          <li>Create an internal integration at <code>notion.so/my-integrations</code>.</li>
          <li>On the OS page in Notion: ··· → Connections → add it.</li>
          <li>Add <code>NOTION_TOKEN</code> and <code>DASHBOARD_PASSWORD</code> in Vercel env vars, redeploy.</li>
        </ol>
      ) : (
        <ol>
          <li><code>NOT_SHARED</code>: connect the integration on the OS page in Notion.</li>
          <li>Other codes: check the token in Vercel env vars, then redeploy.</li>
        </ol>
      )}
    </div>
  );
}

export function Colophon() {
  return (
    <footer className="colophon">
      <span>Canonical state lives in Notion. This page only renders it.</span>
      <a href={NOTION_OS_URL}>Edit in Notion →</a>
    </footer>
  );
}
