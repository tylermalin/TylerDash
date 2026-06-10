// 7-day agenda from a secret iCal URL (GOOGLE_ICS_URL env var).
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

export async function fetchAgenda(): Promise<AgendaEvent[] | null> {
  const url = process.env.GOOGLE_ICS_URL;
  if (!url) return null;

  try {
    const data = await ical.async.fromURL(url);
    const now = new Date();
    const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
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

    events.sort((a, b) => a.start.getTime() - b.start.getTime());
    return events.slice(0, MAX_EVENTS);
  } catch {
    return []; // configured but unreachable: render the empty state, not a crash
  }
}
