// 7-day agenda from one or more iCal URLs.
// GOOGLE_ICS_URL accepts a comma-separated list, e.g.
//   https://...personal.ics, https://...malama.ics
// Server-side only. No OAuth, no stored data. If the env var is
// absent, the module renders nothing.

import ical from "node-ical";

export type AgendaEvent = {
  start: Date;
  end: Date | null;
  summary: string;
  allDay: boolean;
};

const WINDOW_DAYS = 7;
const MAX_EVENTS = 24;

async function fetchOne(url: string, now: Date, windowEnd: Date): Promise<AgendaEvent[]> {
  try {
    const data = await ical.async.fromURL(url);
    const events: AgendaEvent[] = [];

    for (const key of Object.keys(data)) {
      const ev: any = (data as any)[key];
      if (ev?.type !== "VEVENT") continue;

      const durationMs =
        ev.end && ev.start ? new Date(ev.end).getTime() - new Date(ev.start).getTime() : 0;
      const allDay = ev.datetype === "date";

      if (ev.rrule) {
        const exdates = new Set(
          Object.values(ev.exdate ?? {}).map((d: any) => new Date(d).getTime())
        );
        const occurrences: Date[] = ev.rrule.between(now, windowEnd, true) ?? [];
        for (const occ of occurrences) {
          if (exdates.has(occ.getTime())) continue;
          events.push({
            start: occ,
            end: durationMs ? new Date(occ.getTime() + durationMs) : null,
            summary: ev.summary ?? "(untitled)",
            allDay,
          });
        }
      } else if (ev.start) {
        const start = new Date(ev.start);
        if (start >= now && start <= windowEnd) {
          events.push({
            start,
            end: ev.end ? new Date(ev.end) : null,
            summary: ev.summary ?? "(untitled)",
            allDay,
          });
        }
      }
    }
    return events;
  } catch {
    return []; // one unreachable calendar should not blank the others
  }
}

export async function fetchAgenda(): Promise<AgendaEvent[] | null> {
  const raw = process.env.GOOGLE_ICS_URL;
  if (!raw) return null;

  const urls = raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length === 0) return null;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const batches = await Promise.all(urls.map((u) => fetchOne(u, now, windowEnd)));

  // Merge + dedupe (same start time and summary = same event across calendars)
  const seen = new Set<string>();
  const merged: AgendaEvent[] = [];
  for (const ev of batches.flat()) {
    const key = `${ev.start.getTime()}|${ev.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(ev);
  }

  merged.sort((a, b) => a.start.getTime() - b.start.getTime());
  return merged.slice(0, MAX_EVENTS);
}
