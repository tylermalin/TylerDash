// Server-side Notion reader. The site renders state; it never holds it.
// v2: the tree is discovered at request time. Add pages in Notion,
// they appear here. No code changes to grow the system.

export const OS_ROOT_ID = "37b6f3eb4f0f81bb8e45f668f390a314";
export const NOTION_OS_URL = "https://app.notion.com/p/37b6f3eb4f0f81bb8e45f668f390a314";

// Pages at the OS root that are not domains
const HIDDEN_TITLES = new Set(["Dashboard", "Domain Template"]);

export type Block =
  | { type: "h1" | "h2" | "h3" | "p" | "li"; text: string; href?: string }
  | { type: "todo"; text: string; checked: boolean }
  | { type: "divider" };

export type ChildPage = { id: string; title: string };
export type LinkItem = { title: string; url: string };
export type Metric = { label: string; value: string; pending: boolean };

export type PageData = {
  id: string;
  title: string | null;
  blocks: Block[];
  childPages: ChildPage[];
  links: LinkItem[];
  openCount: number;
  doneCount: number;
  updated: string | null;
  error: string | null;
};

const EMPTY = (id: string, error: string): PageData => ({
  id,
  title: null,
  blocks: [],
  childPages: [],
  links: [],
  openCount: 0,
  doneCount: 0,
  updated: null,
  error,
});

function plain(rich: any[] | undefined): string {
  if (!rich) return "";
  return rich.map((r) => r?.plain_text ?? "").join("");
}

function firstHref(rich: any[] | undefined): string | undefined {
  if (!rich) return undefined;
  for (const r of rich) if (r?.href) return r.href;
  return undefined;
}

async function notionGet(path: string): Promise<{ ok: boolean; status: number; data: any }> {
  const token = process.env.NOTION_TOKEN;
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
    cache: "no-store",
  });
  const data = res.ok ? await res.json() : null;
  return { ok: res.ok, status: res.status, data };
}

export async function fetchPage(pageId: string): Promise<PageData> {
  if (!process.env.NOTION_TOKEN) return EMPTY(pageId, "NO_TOKEN");

  const blocks: Block[] = [];
  const childPages: ChildPage[] = [];
  const links: LinkItem[] = [];
  let title: string | null = null;
  let cursor: string | undefined;

  try {
    // Page title (best effort; ignore failures)
    const meta = await notionGet(`pages/${pageId}`);
    if (meta.ok) {
      const t = meta.data?.properties?.title?.title;
      title = plain(t) || null;
    }

    do {
      const qs = cursor ? `?page_size=100&start_cursor=${cursor}` : "?page_size=100";
      const res = await notionGet(`blocks/${pageId}/children${qs}`);
      if (!res.ok) return EMPTY(pageId, res.status === 404 ? "NOT_SHARED" : `HTTP_${res.status}`);

      for (const b of res.data.results ?? []) {
        switch (b.type) {
          case "child_page":
            childPages.push({ id: b.id.replaceAll("-", ""), title: b.child_page?.title ?? "Untitled" });
            break;
          case "bookmark":
            links.push({
              title: plain(b.bookmark?.caption) || b.bookmark?.url || "Link",
              url: b.bookmark?.url ?? "#",
            });
            break;
          case "heading_1":
            blocks.push({ type: "h1", text: plain(b.heading_1?.rich_text) });
            break;
          case "heading_2":
            blocks.push({ type: "h2", text: plain(b.heading_2?.rich_text) });
            break;
          case "heading_3":
            blocks.push({ type: "h3", text: plain(b.heading_3?.rich_text) });
            break;
          case "paragraph": {
            const t = plain(b.paragraph?.rich_text);
            if (t.trim())
              blocks.push({ type: "p", text: t, href: firstHref(b.paragraph?.rich_text) });
            break;
          }
          case "bulleted_list_item":
          case "numbered_list_item": {
            const rich = b[b.type]?.rich_text;
            blocks.push({ type: "li", text: plain(rich), href: firstHref(rich) });
            break;
          }
          case "to_do":
            blocks.push({
              type: "todo",
              text: plain(b.to_do?.rich_text),
              checked: Boolean(b.to_do?.checked),
            });
            break;
          case "divider":
            blocks.push({ type: "divider" });
            break;
        }
      }
      cursor = res.data.has_more ? res.data.next_cursor : undefined;
    } while (cursor);
  } catch {
    return EMPTY(pageId, "FETCH_FAILED");
  }

  const todos = blocks.filter((b): b is Extract<Block, { type: "todo" }> => b.type === "todo");
  const openCount = todos.filter((t) => !t.checked).length;
  const doneCount = todos.length - openCount;

  const updatedLine = blocks.find((b) => "text" in b && b.text.startsWith("Updated:"));
  const updated =
    updatedLine && "text" in updatedLine ? updatedLine.text.replace("Updated:", "").trim() : null;

  return { id: pageId, title, blocks, childPages, links, openCount, doneCount, updated, error: null };
}

export type DomainSummary = {
  id: string;
  title: string;
  open: number;
  done: number;
  subPages: number;
  error: string | null;
};

// A domain's footprint = its index page + immediate children, aggregated.
export async function fetchDomainSummary(child: ChildPage): Promise<DomainSummary> {
  const page = await fetchPage(child.id);
  if (page.error)
    return { id: child.id, title: child.title, open: 0, done: 0, subPages: 0, error: page.error };

  const kids = await Promise.all(page.childPages.slice(0, 8).map((c) => fetchPage(c.id)));
  let open = page.openCount;
  let done = page.doneCount;
  for (const k of kids) {
    open += k.openCount;
    done += k.doneCount;
  }
  return {
    id: child.id,
    title: child.title,
    open,
    done,
    subPages: page.childPages.length,
    error: null,
  };
}

export async function getDomains(): Promise<{ domains: ChildPage[]; dashboardId: string | null; error: string | null }> {
  const root = await fetchPage(OS_ROOT_ID);
  if (root.error) return { domains: [], dashboardId: null, error: root.error };
  const dashboard = root.childPages.find((c) => c.title === "Dashboard") ?? null;
  const domains = root.childPages.filter((c) => !HIDDEN_TITLES.has(c.title));
  return { domains, dashboardId: dashboard?.id ?? null, error: null };
}

// Metrics pages use "Label: value" lines; bracketed values are pending.
export function parseMetrics(blocks: Block[]): Metric[] {
  const out: Metric[] = [];
  for (const b of blocks) {
    if (b.type !== "li" && b.type !== "p") continue;
    const m = b.text.match(/^([^:]{2,48}):\s*(.+)$/);
    if (!m) continue;
    const label = m[1].trim();
    if (label === "Updated" || label === "Status" || label === "Note" || label === "Format rule")
      continue;
    const value = m[2].trim();
    out.push({ label, value, pending: /^\[.*\]$/.test(value) });
  }
  return out;
}
