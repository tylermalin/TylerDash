import type { Block, PageData } from "@/lib/notion";
import { NOTION_OS_URL } from "@/lib/notion";

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
              b.text.startsWith("Status:");
            return <p className={`p${meta ? " meta" : ""}`} key={i}>{b.text}</p>;
          }
          case "li":
            return <p className="li" key={i}>{b.text}</p>;
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

export function SetupCard({ error }: { error: string }) {
  return (
    <div className="setup">
      <h2>{error === "NO_TOKEN" ? "Connect Notion to go live" : "Sync is down"}</h2>
      {error === "NO_TOKEN" ? (
        <ol>
          <li>
            Create an internal integration at <code>notion.so/my-integrations</code> (any name,
            read-only capabilities are enough).
          </li>
          <li>
            In Notion, open the <code>OS</code> page → ··· menu → Connections → add your
            integration. Child pages inherit access.
          </li>
          <li>
            In Vercel → Project → Settings → Environment Variables, add{" "}
            <code>NOTION_TOKEN</code> (the integration secret) and{" "}
            <code>DASHBOARD_PASSWORD</code> (locks this site behind a password).
          </li>
          <li>Redeploy. The state renders on next load.</li>
        </ol>
      ) : (
        <ol>
          <li>
            <code>NOT_SHARED</code>: the OS page isn&apos;t shared with the integration yet. Add
            the connection on the OS page in Notion.
          </li>
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
