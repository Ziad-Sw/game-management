const CAIRO_TZ = "Africa/Cairo";

export function getCairoDayBoundaries(): { start: string; end: string } {
  const now = new Date();

  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const tzPart = new Intl.DateTimeFormat("en", {
    timeZone: CAIRO_TZ,
    timeZoneName: "longOffset",
  }).formatToParts(now);
  const tzName = tzPart.find((p) => p.type === "timeZoneName")!.value;
  const offsetMatch = tzName.match(/GMT([+-]\d{2}):(\d{2})/);
  const offset = offsetMatch ? `${offsetMatch[1]}:${offsetMatch[2]}` : "+02:00";

  const start = new Date(`${datePart}T00:00:00.000${offset}`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start: start.toISOString(), end: end.toISOString() };
}
