/**
 * Client-side .ics (iCalendar) generation for EventRank exports.
 *
 * Pure functions with no dependencies: build the calendar string manually and
 * trigger the download via a Blob URL. Only `downloadIcs` touches the DOM, so
 * everything else is unit-testable in Node.
 */

export interface IcsEventInput {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  location?: string;
  startAt: string;
  endAt: string;
  url?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Format an ISO date (or Date) as a UTC iCalendar timestamp: YYYYMMDDTHHMMSSZ.
 * Returns null when the value does not parse.
 */
export function formatIcsDate(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Escape text per RFC 5545: backslash, semicolon, comma, and newlines. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Fold a content line past 75 chars with CRLF + space continuations. */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

/** Build a single VEVENT block, or null when the dates do not parse. */
export function buildIcsEvent(input: IcsEventInput, now: Date = new Date()): string | null {
  const start = formatIcsDate(input.startAt);
  const end = formatIcsDate(input.endAt);
  const stamp = formatIcsDate(now);
  if (!start || !end || !stamp) return null;
  const lines = [
    "BEGIN:VEVENT",
    `UID:${input.id}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(input.title.trim() || "Campus event")}`,
  ];
  const description = (input.description ?? input.summary ?? "").trim();
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  if (input.location && input.location.trim()) {
    lines.push(`LOCATION:${escapeIcsText(input.location.trim())}`);
  }
  if (input.url && input.url.trim()) {
    lines.push(`URL:${escapeIcsText(input.url.trim())}`);
  }
  lines.push("END:VEVENT");
  return lines.map(foldIcsLine).join("\r\n");
}

/** Build a complete VCALENDAR document; events with bad dates are skipped. */
export function buildIcsCalendar(inputs: readonly IcsEventInput[], now?: Date): string {
  const blocks = inputs
    .map((input) => buildIcsEvent(input, now))
    .filter((block): block is string => block !== null);
  return (
    ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EventRank//Campus Events//EN", ...blocks, "END:VCALENDAR"].join(
      "\r\n",
    ) + "\r\n"
  );
}

/**
 * Trigger a client-side .ics file download. Call from a click handler;
 * no-ops during server rendering.
 */
export function downloadIcs(filename: string, ics: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
