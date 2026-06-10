// Server-side Notion reader. The site renders state; it never holds it.

export const PAGES = {
  dashboard: { id: "37b6f3eb4f0f81afac50c6926ac7bcc6", title: "Dashboard", slug: "" },
  malama: { id: "37b6f3eb4f0f81f0bcf8c7d5a535a6ad", title: "Mālama Labs", slug: "malama" },
  beneficial: { id: "37b6f3eb4f0f81a8bf04e980a095ea5f", title: "Beneficial Technology", slug: "beneficial" },
} as const;

export const NOTION_OS_URL = "https://app.notion.com/p/37b6f3eb4f0f81bb8e45f668f390a314";

export type Block =
  | { type: "h1" | "h2" | "h3" | "p" | "li"; text: string }
  | { type: "todo"; text: string; checked: boolean }
  | { type: "divider" };

export type PageData = {
  blocks: Block[];
  openCount: number;
  doneCount: number;
  updated: string | null;
  error: string | null;
};

function plain(rich: any[] | undefined): string {
  if (!rich) return "";
  return rich.map((r) => r?.plain_text ?? "").join("");
}

export async function fetchPage(pageId: string): Promise<PageData> {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return { blocks: [], openCount: 0, doneCount: 0, updated: null, error: "NO_TOKEN" };
  }

  const blocks: Block[] = [];
  let cursor: string | undefined;

  try {
    do {
      const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
      url.searchParams.set("page_size", "100");
      if (cursor) url.searchParams.set("start_cursor", cursor);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const code = res.status === 404 ? "NOT_SHARED" : `HTTP_${res.status}`;
        return { blocks: [], openCount: 0, doneCount: 0, updated: null, error: code };
      }

      const data = await res.json();
      for (const b of data.results ?? []) {
        switch (b.type) {
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
            if (t.trim()) blocks.push({ type: "p", text: t });
            break;
          }
          case "bulleted_list_item":
            blocks.push({ type: "li", text: plain(b.bulleted_list_item?.rich_text) });
            break;
          case "numbered_list_item":
            blocks.push({ type: "li", text: plain(b.numbered_list_item?.rich_text) });
            break;
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
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
  } catch {
    return { blocks: [], openCount: 0, doneCount: 0, updated: null, error: "FETCH_FAILED" };
  }

  const todos = blocks.filter((b): b is Extract<Block, { type: "todo" }> => b.type === "todo");
  const openCount = todos.filter((t) => !t.checked).length;
  const doneCount = todos.length - openCount;

  const updatedLine = blocks.find((b) => "text" in b && b.text.startsWith("Updated:"));
  const updated =
    updatedLine && "text" in updatedLine ? updatedLine.text.replace("Updated:", "").trim() : null;

  return { blocks, openCount, doneCount, updated, error: null };
}
