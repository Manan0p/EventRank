"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { eventCatalog, getRelatedEvents, searchEvents } from "@/lib/events";
import { buildIcsCalendar, downloadIcs } from "@/lib/ics";

type EventRecord = (typeof eventCatalog)[number];

const catalog: EventRecord[] = Array.isArray(eventCatalog) ? [...eventCatalog] : [];

const preferenceOptions = [
  "Technology",
  "Career",
  "Entrepreneurship",
  "Arts & culture",
  "Community",
  "Wellness",
  "Sports",
  "Academic",
];

const defaultPreferences = ["Technology", "Career", "Entrepreneurship"];

const availabilityOptions = ["Weekday evenings", "Weekends", "Anytime"];
const formatPreferenceOptions = ["In person", "Hybrid", "Virtual"];
const costPreferenceOptions = ["Any", "Free only"];

const PREF_SETTINGS_KEY = "eventrank:preference-settings";

/** UI cost label <-> API cost value. The API also accepts "paid"; the UI folds it to "Any". */
function costLabelToApi(value: string): "any" | "free" {
  return value === "Free only" ? "free" : "any";
}

function costApiToLabel(value: unknown): string {
  return value === "free" ? "Free only" : "Any";
}

/** Flatten an EventRecord into the pure ICS builder input. */
function toIcsInput(event: EventRecord) {
  return {
    id: String(event.id),
    title: asText(event.title, "Campus event"),
    description: asText(event.description, asText(event.summary, "")),
    location: asText(event.location, ""),
    startAt: asText(event.startAt),
    endAt: asText(event.endAt),
  };
}

/**
 * Session identity resolution.
 *
 * A real signed-in session always wins. The Maya Chen demo identity is ONLY a
 * fallback when no session exists AND OAuth is unconfigured — in that case the
 * app cannot offer sign-in, so the UI stays usable with an explicitly local,
 * unsigned demo profile (never presented as an authenticated user). When OAuth
 * IS configured and no session exists, the UI offers "Sign in" instead.
 */
type SessionIdentity = {
  initials: string;
  name: string;
  roleLabel: string;
  isDemo: boolean;
};

const DEMO_IDENTITY: SessionIdentity = {
  initials: "MC",
  name: "Maya Chen",
  roleLabel: "Student · Demo",
  isDemo: true,
};

function initialsFor(name: string | null | undefined, email: string | null | undefined) {
  const source = (name || "").trim() || (email || "").split("@")[0] || "?";
  const parts = source.replace(/[^a-zA-Z\s.'-]/g, "").split(/[\s.'-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase() || "?";
}

function roleLabelFor(role: unknown) {
  const value = typeof role === "string" && role.trim() ? role.trim() : "Student";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
const formatOptions = ["Any format", "In person", "Hybrid", "Virtual"];
const priceOptions = ["Any price", "Free", "Paid"];
const dateOptions = ["Any day", "Today", "This week", "This weekend"];

function asText(value: unknown, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function listOf(value: unknown) {
  if (typeof value === "string") return value ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return asText(record.label ?? record.reason ?? record.text ?? record.name);
      }
      return String(item);
    })
    .filter(Boolean);
}

function scoreOf(event: EventRecord) {
  const score = Number(event.score);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}

function dateOf(value: unknown) {
  const date = new Date(asText(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPast(event: EventRecord) {
  const end = dateOf(event.endAt);
  return Boolean(end && end.getTime() < Date.now());
}

function eventText(event: EventRecord) {
  return [
    event.title,
    event.category,
    event.organizer,
    event.summary,
    event.description,
    event.location,
    event.format,
    event.audience,
    ...listOf(event.tags),
  ]
    .map((item) => asText(item).toLowerCase())
    .join(" ");
}

function isFree(event: EventRecord) {
  const label = asText(event.priceLabel, "").toLowerCase();
  return label.includes("free") || label.includes("$0") || label.includes("no cost");
}

function normalizedFormat(value: unknown) {
  return asText(value).toLowerCase().replace(/[\s_-]/g, "");
}

function isWeekend(event: EventRecord) {
  const date = dateOf(event.startAt);
  return Boolean(date && (date.getDay() === 0 || date.getDay() === 6));
}

function startsThisWeek(event: EventRecord) {
  const date = dateOf(event.startAt);
  if (!date) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - now.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function startsToday(event: EventRecord) {
  const date = dateOf(event.startAt);
  const now = new Date();
  return Boolean(
    date &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate(),
  );
}

function overlaps(first: EventRecord, second: EventRecord) {
  const firstStart = dateOf(first.startAt)?.getTime();
  const firstEnd = dateOf(first.endAt)?.getTime();
  const secondStart = dateOf(second.startAt)?.getTime();
  const secondEnd = dateOf(second.endAt)?.getTime();
  if (![firstStart, firstEnd, secondStart, secondEnd].every((value) => typeof value === "number")) {
    return false;
  }
  return (firstStart as number) < (secondEnd as number) && (secondStart as number) < (firstEnd as number);
}

function formatFallbackDate(event: EventRecord) {
  const date = dateOf(event.startAt);
  if (!date) return "Date to be announced";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function formatFallbackTime(event: EventRecord) {
  const start = dateOf(event.startAt);
  const end = dateOf(event.endAt);
  if (!start) return "Time to be announced";
  const formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  return `${formatter.format(start)}${end ? ` – ${formatter.format(end)}` : ""}`;
}

function categoryClass(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("tech") || normalized.includes("academic") || normalized.includes("research")) {
    return "category-tech";
  }
  if (normalized.includes("career") || normalized.includes("entrepreneur")) return "category-career";
  if (normalized.includes("art") || normalized.includes("culture") || normalized.includes("music")) {
    return "category-arts";
  }
  if (normalized.includes("wellness") || normalized.includes("health")) return "category-wellness";
  if (normalized.includes("sport")) return "category-sports";
  return "category-community";
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.2 4.2" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...common}>
          <path d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5V21l-5.5-3.5L6.5 21V4.5Z" />
        </svg>
      );
    case "bookmark-filled":
      return (
        <svg {...common} fill="currentColor" stroke="currentColor">
          <path d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5V21l-5.5-3.5L6.5 21V4.5Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M19 10c0 5-7 10.5-7 10.5S5 15 5 10a7 7 0 1 1 14 0Z" />
          <circle cx="12" cy="10" r="2.3" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.2 2" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="m12 2 1.3 5.2L18 9l-4.7 1.8L12 16l-1.3-5.2L6 9l4.7-1.8L12 2ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" />
        </svg>
      );
    case "sliders":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          <path d="m6.5 9 5.5 5.5L17.5 9" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common}>
          <path d="m9 5.5 6.5 6.5L9 18.5" />
        </svg>
      );
    case "arrow-up-right":
      return (
        <svg {...common}>
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="7" height="14" rx="1.5" />
          <rect x="13.5" y="5" width="7" height="14" rx="1.5" />
          <path d="M7 8.5h.01M7 12h.01M17 8.5h.01M17 12h.01" strokeWidth="2.5" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </svg>
      );
    case "filter":
      return (
        <svg {...common}>
          <path d="M4 5h16l-6.2 7v5.5l-3.6 1.7V12L4 5Z" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <path d="M5 21V4" />
          <path d="M5 4h12l-2.5 4L17 12H5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4.5 4.5L19 7" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 10.5v5M12 7.5h.01" strokeWidth="2.2" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="2.3" />
          <circle cx="6" cy="12" r="2.3" />
          <circle cx="18" cy="19" r="2.3" />
          <path d="m8 11 7.7-4.5M8 13l7.7 4.5" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" strokeWidth="2.4" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3.5 19 6v5.2c0 4.1-2.7 7.7-7 9.3-4.3-1.6-7-5.2-7-9.3V6l7-2.5Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    default:
      return null;
  }
}

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span>ER</span>
    </span>
  );
}

function ScoreBadge({ score, large = false }: { score: number; large?: boolean }) {
  const safeScore = Math.max(0, Math.min(100, score));
  return (
    <div className={`score-badge ${large ? "score-badge-large" : ""}`}>
      <div
        className="score-ring"
        style={{ background: `conic-gradient(var(--lime) ${safeScore * 3.6}deg, #e6e9f1 0deg)` }}
      >
        <div className="score-ring-inner">
          <strong>{safeScore}</strong>
          <span>score</span>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <span className="meta-item">
      <Icon name={icon} size={14} />
      <span>{children}</span>
    </span>
  );
}

function EventVisual({ event, featured = false }: { event: EventRecord; featured?: boolean }) {
  const category = asText(event.category, "Campus event");
  const title = asText(event.title, "Campus event");
  const visualLabel = `${category} visual for ${title}`;
  const initial = title.trim().charAt(0).toUpperCase() || "E";

  return (
    <div className={`event-visual ${categoryClass(category)} ${featured ? "event-visual-featured" : ""}`} role="img" aria-label={visualLabel}>
      <span className="event-visual-grid" aria-hidden="true" />
      <span className="event-visual-orb event-visual-orb-one" aria-hidden="true" />
      <span className="event-visual-orb event-visual-orb-two" aria-hidden="true" />
      <span className="event-visual-initial" aria-hidden="true">{initial}</span>
      <span className="event-visual-caption" aria-hidden="true">{category}</span>
    </div>
  );
}

function EventCard({
  event,
  saved,
  compared,
  featured = false,
  list = false,
  compact = false,
  onOpen,
  onSave,
  onCompare,
}: {
  event: EventRecord;
  saved: boolean;
  compared: boolean;
  featured?: boolean;
  list?: boolean;
  compact?: boolean;
  onOpen: () => void;
  onSave: () => void;
  onCompare: () => void;
}) {
  const category = asText(event.category, "Campus event");
  const reasons = listOf(event.scoreReasons).slice(0, 2);
  const tags = listOf(event.tags).slice(0, 2);
  const dateLabel = asText(event.dateLabel, formatFallbackDate(event));
  const timeLabel = asText(event.timeLabel, formatFallbackTime(event));
  const cardStatus = asText((event as { status?: unknown }).status, "published").toLowerCase();
  const cardStatusLabel =
    cardStatus === "canceled" ? "Canceled" :
    cardStatus === "full" ? "Full" :
    cardStatus === "completed" ? "Completed" : null;

  return (
    <article className={`event-card ${featured ? "event-card-featured" : ""} ${list ? "event-card-list" : ""} ${compact ? "event-card-compact" : ""}`}>
      <div className="event-card-visual-wrap">
        <EventVisual event={event} featured={featured} />
        <div className="event-visual-shade" aria-hidden="true" />
        <div className="event-card-topline">
          <div className="event-card-labels">
            <span className={`category-pill ${categoryClass(category)}`}>{category}</span>
            {cardStatusLabel ? <span className={`status-pill status-${cardStatus}`}>{cardStatusLabel}</span> : null}
            {!cardStatusLabel && event.featured ? <span className="featured-label"><Icon name="sparkle" size={12} /> Curated pick</span> : null}
          </div>
          <button
            type="button"
            className={`icon-button save-button ${saved ? "is-saved" : ""}`}
            aria-label={saved ? `Remove ${asText(event.title)} from saved events` : `Save ${asText(event.title)}`}
            aria-pressed={saved}
            onClick={onSave}
          >
            <Icon name={saved ? "bookmark-filled" : "bookmark"} size={18} />
          </button>
        </div>
      </div>

      <div className="event-card-content">
        <button className="event-card-main" type="button" onClick={onOpen}>
          <div className="event-card-heading">
            <h3>{asText(event.title, "Untitled campus event")}</h3>
            <span className="open-arrow" aria-hidden="true"><Icon name="arrow-up-right" size={16} /></span>
          </div>
          <p className="event-summary">{asText(event.summary, asText(event.description, "A campus experience worth making time for."))}</p>
          <div className="event-meta-grid">
            <MetaItem icon="calendar">{dateLabel}</MetaItem>
            <MetaItem icon="clock">{timeLabel}</MetaItem>
            <MetaItem icon="pin">{asText(event.location, "Northbridge campus")}</MetaItem>
            <MetaItem icon="user">{asText(event.organizer, "Campus community")}</MetaItem>
          </div>
          <div className="event-card-bottom">
            <div className="reason-row">
              {reasons.map((reason) => <span className="reason-chip" key={reason}><Icon name="check" size={12} />{reason}</span>)}
              {!reasons.length && tags.map((tag) => <span className="reason-chip" key={tag}>{tag}</span>)}
            </div>
            <div className="event-score-mini" aria-label={`EventRank score ${scoreOf(event)} out of 100`}>
              <span className="score-number">{scoreOf(event)}</span>
              <span className="score-copy">EventRank</span>
            </div>
          </div>
        </button>

        <div className="event-card-footer">
          <span className="event-card-pricing"><span className="price-label">{asText(event.priceLabel, "See details")}</span><span className="capacity-label">{asText(event.capacityStatus, "Open capacity")}</span></span>
          <button
            type="button"
            className={`compare-button ${compared ? "is-compared" : ""}`}
            aria-pressed={compared}
            onClick={onCompare}
          >
            <Icon name={compared ? "check" : "compare"} size={14} />
            {compared ? "Added to compare" : "Compare"}
          </button>
        </div>
      </div>
    </article>
  );
}

function EventRail({
  eyebrow,
  title,
  subtitle,
  events,
  savedIds,
  compareIds,
  onOpen,
  onSave,
  onCompare,
  onSeeAll,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  events: EventRecord[];
  savedIds: Set<string>;
  compareIds: string[];
  onOpen: (event: EventRecord) => void;
  onSave: (event: EventRecord) => void;
  onCompare: (event: EventRecord) => void;
  onSeeAll: () => void;
}) {
  if (!events.length) return null;

  return (
    <section className="event-rail" aria-labelledby={`rail-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <div className="event-rail-heading">
        <div>
          <p className="section-kicker">{eyebrow}</p>
          <h2 id={`rail-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="rail-link" onClick={onSeeAll}>See all <Icon name="arrow-right" size={15} /></button>
      </div>
      <div className="event-rail-track" tabIndex={0} aria-label={`${title} events`}>
        {events.slice(0, 6).map((event) => {
          const id = String(event.id);
          return (
            <EventCard
              key={id}
              event={event}
              saved={savedIds.has(id)}
              compared={compareIds.includes(id)}
              compact
              onOpen={() => onOpen(event)}
              onSave={() => onSave(event)}
              onCompare={() => onCompare(event)}
            />
          );
        })}
      </div>
    </section>
  );
}

function LoadingGrid() {
  return (
    <div className="event-grid loading-grid" aria-label="Loading events" aria-busy="true">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div className="event-skeleton" key={item}>
          <div className="skeleton-line skeleton-pill" />
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-title short" />
          <div className="skeleton-line skeleton-body" />
          <div className="skeleton-line skeleton-body shorter" />
          <div className="skeleton-footer" />
        </div>
      ))}
    </div>
  );
}

function Dialog({
  children,
  className = "",
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  className?: string;
  labelledBy: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="dialog-layer">
      <button className="dialog-backdrop" type="button" aria-label="Close dialog" onClick={onClose} />
      <div className={`dialog-card ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  );
}

const REPORT_REASONS = [
  { value: "inaccurate-info", label: "Inaccurate info" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

/**
 * Report dialog for an event or a review item. Posts to /api/reports and
 * reports success/failure through the toast callback. Target-agnostic so a
 * future review list (agent C) can reuse it with { reviewId }.
 */
function ReportDialog({
  eventId,
  reviewId,
  targetName,
  onClose,
  onToast,
}: {
  eventId?: string;
  reviewId?: string;
  targetName: string;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const [reason, setReason] = useState("inaccurate-info");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(eventId ? { eventId } : {}),
          ...(reviewId ? { reviewId } : {}),
          reason,
          ...(details.trim() ? { details: details.trim().slice(0, 2000) } : {}),
        }),
      });
      if (response.status === 201) {
        onClose();
        onToast("Thanks — your report was submitted");
      } else {
        onToast("Could not submit the report — try again");
      }
    } catch {
      onToast("Could not submit the report — try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog className="review-dialog" labelledBy="report-title" onClose={onClose}>
      <div className="dialog-heading-block review-heading">
        <div className="dialog-heading-icon review-icon"><Icon name="flag" size={20} /></div>
        <div><p className="section-kicker">HELP KEEP EVENTRANK TRUSTWORTHY</p><h2 id="report-title">Report {targetName}</h2><p>Tell us what looks off and our moderators will take a look.</p></div>
        <button type="button" className="dialog-close" aria-label="Close report form" onClick={onClose}><Icon name="x" size={20} /></button>
      </div>
      <form onSubmit={submit}>
        <label className="textarea-label" htmlFor="report-reason">Reason</label>
        <select id="report-reason" className="report-select" value={reason} onChange={(event) => setReason(event.target.value)}>
          {REPORT_REASONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <label className="textarea-label" htmlFor="report-details">Details <span>Optional</span></label>
        <textarea id="report-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Anything that helps a moderator understand the issue…" rows={3} />
        <div className="review-form-footer"><span className="privacy-note"><Icon name="shield" size={14} /> Shared only with moderators</span><button type="submit" className="primary-action" disabled={submitting}>{submitting ? "Submitting…" : "Submit report"} <Icon name="arrow-right" size={16} /></button></div>
      </form>
    </Dialog>
  );
}

function EventDetail({
  event,
  saved,
  compared,
  reviewed,
  registered,
  related,
  onClose,
  onSave,
  onCompare,
  onReview,
  onRegister,
  onSelectEvent,
  onToast,
}: {
  event: EventRecord;
  saved: boolean;
  compared: boolean;
  reviewed: boolean;
  registered: boolean;
  related: EventRecord[];
  onClose: () => void;
  onSave: () => void;
  onCompare: () => void;
  onReview: () => void;
  onRegister: () => void;
  onSelectEvent: (id: string) => void;
  onToast: (message: string) => void;
}) {
  const title = asText(event.title, "Event details");
  const reasons = listOf(event.scoreReasons);
  const tags = listOf(event.tags);
  const past = isPast(event);
  const status = asText((event as { status?: unknown }).status, "published").toLowerCase();
  const isCanceled = status === "canceled" || status === "archived";
  const isFull = status === "full";
  const isCompleted = status === "completed" || past;
  const statusLabel =
    status === "canceled" ? "Canceled" :
    status === "archived" ? "Archived" :
    status === "full" ? "Full · waitlist open" :
    status === "completed" || past ? "Completed" : null;
  const [reportOpen, setReportOpen] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onToast("Event link copied");
    } catch {
      onToast("Link ready to share");
    }
  };

  const addToCalendar = () => {
    const ics = buildIcsCalendar([toIcsInput(event)]);
    downloadIcs(`${String(event.id)}.ics`, ics);
    onToast("Calendar file downloaded");
  };

  return (
    <Dialog className="detail-dialog" labelledBy="event-detail-title" onClose={onClose}>
      <div className="detail-topbar">
        <span className="detail-topbar-labels">
          <span className={`category-pill ${categoryClass(asText(event.category, "Campus event"))}`}>
            {asText(event.category, "Campus event")}
          </span>
          {statusLabel ? <span className={`status-pill status-${status}`}>{statusLabel}</span> : null}
        </span>
        <button type="button" className="dialog-close" aria-label="Close event details" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </div>
      <div className="detail-scroll">
        <div className="detail-visual"><EventVisual event={event} featured /><div className="detail-visual-label"><span className="category-pill">{asText(event.category, "Campus event")}</span><span><Icon name="sparkle" size={13} /> EventRank context</span></div></div>
        <div className="detail-heading-row">
          <div>
            <p className="eyebrow eyebrow-small"><span className="eyebrow-dot" /> {event.featured ? "EDITOR'S PICK" : "CAMPUS EVENT"}</p>
            <h2 id="event-detail-title">{title}</h2>
            <p className="detail-organizer"><Icon name="shield" size={15} /> {asText(event.organizer, "Northbridge University community")} <span className="verified-label">Verified organizer</span></p>
          </div>
          <ScoreBadge score={scoreOf(event)} large />
        </div>

        <div className="detail-primary-actions">
          <button type="button" className={`primary-action ${saved ? "is-active" : ""}`} onClick={onSave}>
            <Icon name={saved ? "bookmark-filled" : "bookmark"} size={17} /> {saved ? "Saved" : "Save event"}
          </button>
          <button type="button" className={`secondary-action ${compared ? "is-active" : ""}`} onClick={onCompare}>
            <Icon name={compared ? "check" : "compare"} size={17} /> {compared ? "In compare" : "Compare"}
          </button>
          <button type="button" className="icon-button detail-share" onClick={copyLink} aria-label="Share event">
            <Icon name="share" size={18} />
          </button>
        </div>

        <div className="detail-logistics">
          <div className="logistics-item"><span className="logistics-icon"><Icon name="calendar" size={18} /></span><div><strong>{asText(event.dateLabel, formatFallbackDate(event))}</strong><span>{asText(event.timeLabel, formatFallbackTime(event))}</span></div></div>
          <div className="logistics-item"><span className="logistics-icon"><Icon name="pin" size={18} /></span><div><strong>{asText(event.location, "Northbridge campus")}</strong><span>{asText(event.format, "Event format")}</span></div></div>
          <div className="logistics-item"><span className="logistics-icon"><Icon name="user" size={18} /></span><div><strong>{asText(event.audience, "All students")}</strong><span>{asText(event.capacityStatus, "Open capacity")}</span></div></div>
          <div className="logistics-item"><span className="logistics-icon price-icon"><span>$</span></span><div><strong>{asText(event.priceLabel, "See registration")}</strong><span>Cost to attend</span></div></div>
        </div>

        <section className="score-explanation-panel" aria-labelledby="score-explanation-title">
          <div className="score-explanation-head"><div><p className="section-kicker">WHY THIS RANKS HIGH</p><h3 id="score-explanation-title">A good fit for your week</h3></div><span className="score-pill"><Icon name="sparkle" size={13} /> {scoreOf(event)} / 100</span></div>
          <p className="score-explanation-copy">EventRank weighs relevance, practical fit, trust, and community signals so you can make a decision with context.</p>
          <div className="detail-reasons">
            {(reasons.length ? reasons : ["Complete event information", "Relevant to the campus community"]).map((reason) => <div className="detail-reason" key={reason}><span className="detail-reason-check"><Icon name="check" size={13} /></span><span>{reason}</span></div>)}
          </div>
        </section>

        <section className="detail-description">
          <p className="section-kicker">ABOUT THIS EVENT</p>
          <p>{asText(event.description, asText(event.summary, "Join fellow students for a thoughtful campus experience."))}</p>
          <div className="tag-row">{tags.map((tag) => <span className="tag-chip" key={tag}>#{tag}</span>)}</div>
        </section>

        <div className="detail-bottom-actions">
          {isCanceled ? (
            <p className="canceled-note">This event was canceled and is no longer actionable.</p>
          ) : (
            <button type="button" className="registration-button" onClick={onRegister}>
              {registered ? "Registered ✓" : isCompleted ? "Event completed" : isFull ? "Join waitlist" : "Register"}<Icon name="arrow-up-right" size={17} />
            </button>
          )}
          <button type="button" className="review-link" onClick={onReview}>
            <Icon name={reviewed ? "check" : "star"} size={16} /> {reviewed ? "Review submitted" : isCompleted ? "Write a review" : "Preview review form"}
          </button>
        </div>

        <div className="detail-secondary-actions">
          <button type="button" className="secondary-action detail-ics-button" onClick={addToCalendar}>
            <Icon name="calendar" size={15} /> Add to calendar
          </button>
          <button type="button" className="review-link" onClick={() => setReportOpen(true)}>
            <Icon name="flag" size={14} /> Report
          </button>
        </div>

        {related.length ? (
          <section className="detail-related" aria-labelledby="related-events-title">
            <p className="section-kicker">KEEP EXPLORING</p>
            <h3 id="related-events-title">Related events</h3>
            <div className="related-row">
              {related.map((item) => (
                <button
                  type="button"
                  className="related-card"
                  key={String(item.id)}
                  onClick={() => onSelectEvent(String(item.id))}
                  aria-label={`View ${asText(item.title, "related event")}`}
                >
                  <span className={`category-pill ${categoryClass(asText(item.category, "Campus event"))}`}>
                    {asText(item.category, "Campus event")}
                  </span>
                  <strong>{asText(item.title, "Untitled campus event")}</strong>
                  <span className="related-meta">
                    {asText(item.dateLabel, formatFallbackDate(item))} · {asText(item.location, "Northbridge campus")}
                  </span>
                  <span className="related-score">{scoreOf(item)} EventRank</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      {reportOpen ? (
        <ReportDialog eventId={String(event.id)} targetName={title} onClose={() => setReportOpen(false)} onToast={onToast} />
      ) : null}
    </Dialog>
  );
}

export interface PreferenceSettings {
  availability: string[];
  format: string;
  cost: string;
}

export const defaultPreferenceSettings: PreferenceSettings = {
  availability: [],
  format: "Any format",
  cost: "Any",
};

function PreferencesDialog({
  selected,
  settings,
  onToggle,
  onSettingsChange,
  onClose,
  onSave,
}: {
  selected: string[];
  settings: PreferenceSettings;
  onToggle: (preference: string) => void;
  onSettingsChange: (next: PreferenceSettings) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const toggleAvailability = (option: string) => {
    const current = settings.availability.includes(option)
      ? settings.availability.filter((item) => item !== option)
      : [...settings.availability, option];
    onSettingsChange({ ...settings, availability: current });
  };

  return (
    <Dialog className="preferences-dialog" labelledBy="preferences-title" onClose={onClose}>
      <div className="dialog-heading-block">
        <div className="dialog-heading-icon"><Icon name="sparkle" size={20} /></div>
        <div><p className="section-kicker">PERSONALIZE YOUR FEED</p><h2 id="preferences-title">What are you curious about?</h2><p>Choose a few interests. We’ll use them to make your EventRank feed feel more like yours.</p></div>
        <button type="button" className="dialog-close" aria-label="Close preferences" onClick={onClose}><Icon name="x" size={20} /></button>
      </div>
      <div className="preference-grid">
        {preferenceOptions.map((preference) => {
          const active = selected.includes(preference);
          return <button type="button" key={preference} className={`preference-chip ${active ? "is-selected" : ""}`} aria-pressed={active} onClick={() => onToggle(preference)}><span className="preference-check">{active ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}</span>{preference}</button>;
        })}
      </div>
      <div className="preference-section">
        <p className="section-kicker">AVAILABILITY</p>
        <p className="preference-hint">When can you usually go? Weekday evenings boost events from 5pm; weekends boost Saturday and Sunday picks.</p>
        <div className="preference-grid">
          {availabilityOptions.map((option) => {
            const active = settings.availability.includes(option);
            return <button type="button" key={option} className={`preference-chip ${active ? "is-selected" : ""}`} aria-pressed={active} onClick={() => toggleAvailability(option)}><span className="preference-check">{active ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}</span>{option}</button>;
          })}
        </div>
      </div>
      <div className="preference-section">
        <p className="section-kicker">FORMAT</p>
        <div className="preference-grid">
          {["Any format", ...formatPreferenceOptions].map((option) => {
            const active = settings.format === option;
            return <button type="button" key={option} className={`preference-chip ${active ? "is-selected" : ""}`} aria-pressed={active} onClick={() => onSettingsChange({ ...settings, format: option })}><span className="preference-check">{active ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}</span>{option}</button>;
          })}
        </div>
      </div>
      <div className="preference-section">
        <p className="section-kicker">COST</p>
        <div className="preference-grid">
          {costPreferenceOptions.map((option) => {
            const active = settings.cost === option;
            return <button type="button" key={option} className={`preference-chip ${active ? "is-selected" : ""}`} aria-pressed={active} onClick={() => onSettingsChange({ ...settings, cost: option })}><span className="preference-check">{active ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}</span>{option}</button>;
          })}
        </div>
      </div>
      <div className="preference-footer"><span>{selected.length} interests selected</span><button type="button" className="primary-action" onClick={onSave}>Save preferences <Icon name="arrow-right" size={16} /></button></div>
    </Dialog>
  );
}

function ReviewDialog({
  event,
  onClose,
  onSubmit,
}: {
  event: EventRecord;
  onClose: () => void;
  onSubmit: (rating: number, tags: string[], comment: string) => Promise<string | null>;
}) {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const reviewTags = ["Useful", "Welcoming", "Well organized", "Worth the time", "Would recommend"];

  const toggleTag = (tag: string) => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    if (!rating || submitting) return;
    setSubmitting(true);
    setError("");
    const failure = await onSubmit(rating, selectedTags, comment);
    setSubmitting(false);
    if (failure) setError(failure);
  };

  return (
    <Dialog className="review-dialog" labelledBy="review-title" onClose={onClose}>
      <div className="dialog-heading-block review-heading">
        <div className="dialog-heading-icon review-icon"><Icon name="star" size={20} /></div>
        <div><p className="section-kicker">CLOSE THE LOOP</p><h2 id="review-title">How was {asText(event.title)}?</h2><p>Your perspective helps other students decide what is worth their time.</p></div>
        <button type="button" className="dialog-close" aria-label="Close review form" onClick={onClose}><Icon name="x" size={20} /></button>
      </div>
      <form onSubmit={submit}>
        <fieldset className="rating-fieldset">
          <legend>How would you rate it?</legend>
          <div className="star-picker" role="radiogroup" aria-label="Event rating">
            {[1, 2, 3, 4, 5].map((value) => <button type="button" role="radio" aria-checked={rating === value} aria-label={`${value} out of 5 stars`} className={value <= rating ? "is-selected" : ""} key={value} onClick={() => setRating(value)}><Icon name="star" size={28} /></button>)}
          </div>
        </fieldset>
        <fieldset className="review-tag-fieldset"><legend>What stood out? <span>Optional</span></legend><div className="review-tag-row">{reviewTags.map((tag) => <button type="button" key={tag} className={`review-tag ${selectedTags.includes(tag) ? "is-selected" : ""}`} onClick={() => toggleTag(tag)}>{selectedTags.includes(tag) ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}{tag}</button>)}</div></fieldset>
        <label className="textarea-label" htmlFor="review-comment">Add a note <span>Optional</span></label>
        <textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What would you tell a friend who is considering this event?" rows={4} />
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="review-form-footer"><span className="privacy-note"><Icon name="shield" size={14} /> Shared anonymously with students</span><button type="submit" className="primary-action" disabled={!rating || submitting}>{submitting ? "Submitting…" : "Submit review"} <Icon name="arrow-right" size={16} /></button></div>
      </form>
    </Dialog>
  );
}

function CompareDialog({ events, onClose, onRemove, onToast }: { events: EventRecord[]; onClose: () => void; onRemove: (id: string) => void; onToast: (message: string) => void }) {
  const hasConflict = events.length > 1 && events.some((event, index) => events.slice(index + 1).some((other) => overlaps(event, other)));
  const rows = [
    { label: "EventRank", key: "score" },
    { label: "When", key: "when" },
    { label: "Where", key: "location" },
    { label: "Format", key: "format" },
    { label: "Audience", key: "audience" },
    { label: "Cost", key: "price" },
    { label: "Capacity", key: "capacity" },
  ];

  return (
    <Dialog className="compare-dialog" labelledBy="compare-title" onClose={onClose}>
      <div className="compare-dialog-head"><div><p className="section-kicker">DECISION VIEW</p><h2 id="compare-title">Compare events</h2><p>See the details side by side before you commit your time.</p></div><button type="button" className="dialog-close" aria-label="Close comparison" onClick={onClose}><Icon name="x" size={20} /></button></div>
      {hasConflict ? <div className="conflict-banner"><span className="conflict-icon"><Icon name="clock" size={16} /></span><div><strong>Schedule conflict detected</strong><span>These events overlap. Pick the one that fits your week best.</span></div></div> : null}
      <div className="comparison-table" role="table" aria-label="Event comparison">
        <div className="comparison-label-column" role="rowgroup"><div className="comparison-label-spacer" />{rows.map((row) => <div className="comparison-label" role="row" key={row.key}>{row.label}</div>)}<div className="comparison-label reasons-label">Why it ranks</div></div>
        {events.map((event) => <div className="comparison-event-column" role="rowgroup" key={String(event.id)}><div className="comparison-event-heading"><span className={`category-pill ${categoryClass(asText(event.category, "Event"))}`}>{asText(event.category, "Event")}</span><button type="button" className="remove-compare" aria-label={`Remove ${asText(event.title)} from comparison`} onClick={() => onRemove(String(event.id))}><Icon name="x" size={15} /></button><h3>{asText(event.title)}</h3><span className="comparison-organizer">{asText(event.organizer, "Campus community")}</span></div><div className="comparison-score" role="cell"><ScoreBadge score={scoreOf(event)} /></div><div className="comparison-cell" role="cell"><Icon name="calendar" size={14} />{asText(event.dateLabel, formatFallbackDate(event))}<br /><span>{asText(event.timeLabel, formatFallbackTime(event))}</span></div><div className="comparison-cell" role="cell"><Icon name="pin" size={14} />{asText(event.location, "Northbridge campus")}</div><div className="comparison-cell" role="cell">{asText(event.format, "—")}</div><div className="comparison-cell" role="cell">{asText(event.audience, "All students")}</div><div className="comparison-cell" role="cell">{asText(event.priceLabel, "—")}</div><div className="comparison-cell" role="cell"><span className="capacity-dot" />{asText(event.capacityStatus, "Open")}</div><div className="comparison-reasons" role="cell">{listOf(event.scoreReasons).slice(0, 3).map((reason) => <span key={reason}><Icon name="check" size={12} />{reason}</span>)}</div><button type="button" className="registration-button comparison-cta" onClick={() => onToast("Registration flow is ready for the next step")}>View event <Icon name="arrow-up-right" size={15} /></button></div>)}
      </div>
      <div className="compare-dialog-foot"><span><Icon name="info" size={15} /> EventRank is a fit signal, not a guarantee.</span><button type="button" className="secondary-action" onClick={onClose}>Keep exploring</button></div>
    </Dialog>
  );
}

function EventRankAppInner() {
  const router = useRouter();
  const { data: session, status } = useSession();
  // Whether an OAuth provider is registered server-side, detected via the
  // built-in providers endpoint ({} when unconfigured). null while checking.
  const [oauthReady, setOauthReady] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<string[]>(defaultPreferences);
  const [preferenceSettings, setPreferenceSettings] = useState<PreferenceSettings>(defaultPreferenceSettings);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All events");
  const [activeView, setActiveView] = useState<"discover" | "explore" | "saved" | "rsvps">("discover");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ format: "Any format", price: "Any price", date: "Any day" });
  const [sort, setSort] = useState("Recommended");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [reviewEventId, setReviewEventId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // NextAuth's built-in provider list: empty object when OAuth is
    // unconfigured (demo fallback), non-empty once Google is registered.
    fetch("/api/auth/providers")
      .then((response) => (response.ok ? response.json() : {}))
      .then((providers) => {
        if (!cancelled) setOauthReady(Boolean(providers && Object.keys(providers).length));
      })
      .catch(() => {
        if (!cancelled) setOauthReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let saved: string[] = [];
    let storedPreferences: string[] = [];
    let storedRegistered: string[] = [];
    let storedSettings: PreferenceSettings = defaultPreferenceSettings;
    try {
      saved = JSON.parse(window.localStorage.getItem("eventrank:saved") || "[]");
      storedPreferences = JSON.parse(window.localStorage.getItem("eventrank:preferences") || "[]");
      storedRegistered = JSON.parse(window.localStorage.getItem("eventrank:registered") || "[]");
      // Migration guard: the settings key may hold the legacy string[] shape or
      // be absent; only adopt it when it parses to a settings-shaped object.
      const rawSettings = window.localStorage.getItem(PREF_SETTINGS_KEY);
      if (rawSettings) {
        const parsed: unknown = JSON.parse(rawSettings);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const record = parsed as Partial<PreferenceSettings>;
          const availability = Array.isArray(record.availability)
            ? record.availability.map(String).filter((item) => availabilityOptions.includes(item))
            : [];
          const format = typeof record.format === "string" && ["Any format", ...formatPreferenceOptions].includes(record.format)
            ? record.format
            : "Any format";
          const cost = typeof record.cost === "string" && costPreferenceOptions.includes(record.cost)
            ? record.cost
            : "Any";
          storedSettings = { availability, format, cost };
        }
      }
    } catch {
      saved = [];
      storedPreferences = [];
      storedRegistered = [];
      storedSettings = defaultPreferenceSettings;
    }
    if (Array.isArray(saved)) setSavedIds(new Set(saved.map(String)));
    if (Array.isArray(storedPreferences) && storedPreferences.length) setPreferences(storedPreferences.map(String));
    if (Array.isArray(storedRegistered)) setRegisteredIds(new Set(storedRegistered.map(String)));
    setPreferenceSettings(storedSettings);
    const timer = window.setTimeout(() => {
      setHydrated(true);
      setLoading(false);
    }, 520);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("eventrank:saved", JSON.stringify([...savedIds]));
      window.localStorage.setItem("eventrank:preferences", JSON.stringify(preferences));
      window.localStorage.setItem("eventrank:registered", JSON.stringify([...registeredIds]));
      window.localStorage.setItem(PREF_SETTINGS_KEY, JSON.stringify(preferenceSettings));
    } catch {
      // Local persistence is a progressive enhancement for the demo.
    }
  }, [hydrated, savedIds, registeredIds, preferences, preferenceSettings]);

  // Persist the full preference shape to the server (best-effort; localStorage
  // stays the offline fallback). Availability is stored as strings and
  // translated to rank context at search time; format/cost map to the API's
  // formats/cost fields.
  useEffect(() => {
    if (!hydrated) return;
    const formats = preferenceSettings.format === "Any format" ? [] : [preferenceSettings.format];
    fetch("/api/me/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        interests: preferences,
        availability: preferenceSettings.availability,
        formats,
        cost: costLabelToApi(preferenceSettings.cost),
      }),
    }).catch(() => {
      // Offline or unauthenticated — localStorage keeps the settings.
    });
  }, [hydrated, preferences, preferenceSettings]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    fetch("/api/me/saved")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (cancelled || !payload || typeof payload !== "object") return;
        const record = payload as { savedEventIds?: unknown; registeredEventIds?: unknown };
        const remoteSaved = Array.isArray(record.savedEventIds) ? record.savedEventIds.map(String) : [];
        const remoteRegistered = Array.isArray(record.registeredEventIds) ? record.registeredEventIds.map(String) : [];
        if (remoteSaved.length) setSavedIds((current) => new Set([...current, ...remoteSaved]));
        if (remoteRegistered.length) setRegisteredIds((current) => new Set([...current, ...remoteRegistered]));
      })
      .catch(() => {
        // Demo/local state remains the fallback when the API is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Identity: a real session always wins. Demo identity shows ONLY when there
  // is no session AND OAuth is unconfigured (oauthReady === false). While the
  // session/provider state is still loading, keep the demo placeholder so the
  // UI paints identically to today's demo on first frame.
  const sessionUser = session?.user;
  const isRealSession = Boolean(sessionUser && !sessionUser.isDemo && !session?.isDemo);
  const showDemoIdentity = !isRealSession && oauthReady !== true;
  const identity: SessionIdentity = isRealSession
    ? {
        initials: initialsFor(sessionUser?.name, sessionUser?.email),
        name: sessionUser?.name || sessionUser?.email?.split("@")[0] || "Student",
        roleLabel: roleLabelFor((sessionUser as { role?: unknown })?.role),
        isDemo: false,
      }
    : DEMO_IDENTITY;
  const sessionLoading = status === "loading" || oauthReady === null;

  const categories = useMemo(() => {    const unique = new Map<string, string>();
    catalog.forEach((event) => {
      const category = asText(event.category).trim();
      if (category) unique.set(category.toLowerCase(), category);
    });
    return [...unique.values()].slice(0, 8);
  }, []);

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    // Availability translation: "Weekday evenings" boosts events starting at
    // 5pm or later; "Weekends" keeps only Saturday/Sunday events; "Anytime"
    // is a no-op. Format/cost map to hard search filters via searchEvents.
    const wantsEvenings = preferenceSettings.availability.includes("Weekday evenings");
    const wantsWeekends = preferenceSettings.availability.includes("Weekends");
    const preferredFormats = preferenceSettings.format === "Any format" ? [] : [preferenceSettings.format];
    const freeOnlyPref = preferenceSettings.cost === "Free only";

    // The server GET /api/events accepts the same structured params (query,
    // category, free, format, dateFrom, dateTo, sort, limit, offset); the
    // client call below mirrors that contract against the local catalog so
    // preference changes re-rank immediately without a round trip.
    return searchEvents({
      query,
      category: activeCategory === "All events" ? undefined : activeCategory,
      formats: preferredFormats.length ? preferredFormats : undefined,
      freeOnly: freeOnlyPref || undefined,
      availableStartHour: wantsEvenings ? 17 : undefined,
      interests: preferences,
      events: catalog.filter((event) => {
        if (activeView === "saved" && !savedIds.has(String(event.id))) return false;
        if (activeView === "rsvps" && !registeredIds.has(String(event.id))) return false;
        if (normalizedQuery && !eventText(event).includes(normalizedQuery)) return false;
        if (filters.format !== "Any format" && normalizedFormat(event.format) !== normalizedFormat(filters.format)) return false;
        if (filters.price === "Free" && !isFree(event)) return false;
        if (filters.price === "Paid" && isFree(event)) return false;
        if (filters.date === "Today" && !startsToday(event)) return false;
        if (filters.date === "This week" && !startsThisWeek(event)) return false;
        if (filters.date === "This weekend" && !isWeekend(event)) return false;
        if (wantsWeekends && !isWeekend(event)) return false;
        return true;
      }),
    }).sort((first, second) => {
      if (sort === "Soonest") {
        return (dateOf(first.startAt)?.getTime() || Number.MAX_SAFE_INTEGER) - (dateOf(second.startAt)?.getTime() || Number.MAX_SAFE_INTEGER);
      }
      if (sort === "Highest rated") return Number(second.rating || 0) - Number(first.rating || 0);
      if (sort === "Most reviewed") return Number(second.reviewCount || 0) - Number(first.reviewCount || 0);
      return scoreOf(second) - scoreOf(first);
    });
  }, [activeCategory, activeView, filters, preferences, preferenceSettings, query, registeredIds, savedIds, sort]);

  const selectedEvent = selectedEventId ? catalog.find((event) => String(event.id) === selectedEventId) : undefined;
  const reviewEvent = reviewEventId ? catalog.find((event) => String(event.id) === reviewEventId) : undefined;
  const comparedEvents = compareIds.map((id) => catalog.find((event) => String(event.id) === id)).filter(Boolean) as EventRecord[];
  // Related events for the detail dialog, re-ranked with the same preference
  // context as the feed so they reflect Availability/Format/Cost settings.
  const relatedEvents = useMemo(() => {
    if (!selectedEvent) return [];
    return getRelatedEvents(
      selectedEvent,
      catalog,
      {
        interests: preferences,
        preferredFormats: preferenceSettings.format === "Any format" ? [] : [preferenceSettings.format],
        freeOnly: preferenceSettings.cost === "Free only" ? true : undefined,
        availableStartHour: preferenceSettings.availability.includes("Weekday evenings") ? 17 : undefined,
      },
      3,
    ) as EventRecord[];
  }, [selectedEvent, preferences, preferenceSettings]);
  const featuredEvent = visibleEvents.find((event) => event.featured) || visibleEvents[0];
  const filterCount = [filters.format !== "Any format", filters.price !== "Any price", filters.date !== "Any day"].filter(Boolean).length;
  const savedCount = savedIds.size;
  const registeredCount = registeredIds.size;
  const homeRailEvents = useMemo(() => {
    const available = visibleEvents.filter((event) => {
      const state = asText((event as { status?: unknown }).status, "published").toLowerCase();
      return state !== "canceled" && state !== "archived" && !isPast(event);
    });
    const unique = (events: EventRecord[]) => [...new Map(events.map((event) => [String(event.id), event])).values()];
    return {
      picked: unique(available),
      today: unique(available.filter(startsToday)),
      week: unique(available.filter(startsThisWeek)),
      free: unique(available.filter(isFree)),
    };
  }, [visibleEvents]);
  const showHomeRails = activeView === "discover" && !query.trim() && activeCategory === "All events" && filterCount === 0;

  const showToast = (message: string) => setToast(message);

  const toggleSaved = (event: EventRecord) => {
    const id = String(event.id);
    const nextSaved = !savedIds.has(id);
    setSavedIds((current) => {
      const next = new Set(current);
      if (!nextSaved) {
        next.delete(id);
        showToast("Removed from saved events");
      } else {
        next.add(id);
        showToast("Saved to your events");
      }
      return next;
    });
    void fetch(`/api/events/${encodeURIComponent(id)}/save`, { method: nextSaved ? "POST" : "DELETE" }).then((response) => {
      if (!response.ok && oauthReady === true) {
        setSavedIds((current) => {
          const reverted = new Set(current);
          if (nextSaved) reverted.delete(id);
          else reverted.add(id);
          return reverted;
        });
        showToast("Could not sync that save — try again");
      }
    }).catch(() => {
      // Keep local state for offline/demo use.
    });
  };

  const toggleCompared = (event: EventRecord) => {
    const id = String(event.id);
    setCompareIds((current) => {
      if (current.includes(id)) {
        showToast("Removed from comparison");
        return current.filter((item) => item !== id);
      }
      if (current.length >= 3) {
        showToast("Compare up to three events at a time");
        return current;
      }
      showToast("Added to comparison");
      return [...current, id];
    });
  };

  const savePreferences = () => {
    setPreferencesOpen(false);
    showToast("Your feed has been updated");
  };

  const openReview = (event: EventRecord) => setReviewEventId(String(event.id));

  const registerForEvent = async (event: EventRecord) => {
    const id = String(event.id);
    if (registeredIds.has(id)) {
      showToast("You're already registered for this event");
      return;
    }
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(id)}/register`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 403) {
        showToast(typeof payload?.error?.message === "string" ? payload.error.message : "Registration is closed for this event");
        return;
      }
      if (!response.ok) {
        showToast("Could not register — try again");
        return;
      }
      setRegisteredIds((current) => new Set(current).add(id));
      showToast(payload?.status === "waitlisted" ? "You're on the waitlist" : "You're registered");
    } catch {
      showToast("Could not register — try again");
    }
  };

  const navigateTo = (view: "discover" | "explore" | "saved" | "rsvps") => {
    setActiveView(view);
    if (view === "discover") {
      setActiveCategory("All events");
      setQuery("");
      setFilters({ format: "Any format", price: "Any price", date: "Any day" });
    }
    setMobileMenuOpen(false);
  };

  const openEvent = (event: EventRecord) => {
    router.push(`/events/${encodeURIComponent(String(event.id))}`);
  };

  const resetDiscovery = () => {
    setActiveView("discover");
    setActiveCategory("All events");
    setQuery("");
    setFilters({ format: "Any format", price: "Any price", date: "Any day" });
  };

  return (
    <main className="eventrank-app">
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="brand-lockup" onClick={resetDiscovery} aria-label="EventRank home">
            <LogoMark /><span className="brand-name">Event<span>Rank</span></span>
          </button>
          <nav className="top-nav" aria-label="Main navigation">
            <button type="button" className={activeView === "discover" ? "nav-link active" : "nav-link"} onClick={() => navigateTo("discover")}>For You</button>
            <button type="button" className={activeView === "explore" ? "nav-link active" : "nav-link"} onClick={() => navigateTo("explore")}>Explore</button>
            <button type="button" className={activeView === "saved" ? "nav-link active" : "nav-link"} onClick={() => navigateTo("saved")}>Saved <span className="nav-count">{savedCount}</span></button>
            <button type="button" className={activeView === "rsvps" ? "nav-link active" : "nav-link"} onClick={() => navigateTo("rsvps")}>My RSVPs <span className="nav-count">{registeredCount}</span></button>
          </nav>
          <div className="topbar-actions">
            <div className="campus-pill"><span className="campus-pill-dot" /> Northbridge University <span className="campus-pill-muted">· Main Campus</span></div>
            <button type="button" className="preference-nav-button" onClick={() => setPreferencesOpen(true)}><Icon name="sparkle" size={16} /><span>Preferences</span></button>
            <span className="topbar-divider" />
            <button type="button" className="profile-button" onClick={() => setPreferencesOpen(true)} aria-label={isRealSession ? `Signed in as ${identity.name} — open profile preferences` : showDemoIdentity ? "Demo profile — open profile preferences" : "Sign in — open profile preferences"}><span className="avatar">{identity.initials}</span><span className="profile-copy"><strong>{identity.name}</strong><small>{identity.roleLabel}</small></span><Icon name="chevron-down" size={15} /></button>
            {sessionLoading ? null : isRealSession ? <button type="button" className="text-action" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button> : oauthReady ? <button type="button" className="text-action" onClick={() => signIn("google", { callbackUrl: "/" })}>Sign in</button> : null}
          </div>
          <button type="button" className="mobile-menu-button" aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((value) => !value)}><Icon name={mobileMenuOpen ? "x" : "menu"} size={21} /></button>
        </div>
        {mobileMenuOpen ? <div className="mobile-nav-panel"><button type="button" className={activeView === "discover" ? "active" : ""} onClick={() => navigateTo("discover")}>For You</button><button type="button" className={activeView === "explore" ? "active" : ""} onClick={() => navigateTo("explore")}>Explore</button><button type="button" className={activeView === "saved" ? "active" : ""} onClick={() => navigateTo("saved")}>Saved <span>{savedCount}</span></button><button type="button" className={activeView === "rsvps" ? "active" : ""} onClick={() => navigateTo("rsvps")}>My RSVPs <span>{registeredCount}</span></button><button type="button" onClick={() => { setPreferencesOpen(true); setMobileMenuOpen(false); }}><Icon name="sparkle" size={15} /> Preferences</button>{sessionLoading ? null : isRealSession ? <button type="button" onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: "/" }); }}>Sign out ({identity.name})</button> : oauthReady ? <button type="button" onClick={() => { setMobileMenuOpen(false); signIn("google", { callbackUrl: "/" }); }}>Sign in with Google</button> : <button type="button" disabled aria-label="Demo mode profile">Demo — {identity.name}</button>}</div> : null}
      </header>

      <div className="page-shell">
        <section className="hero-section" aria-labelledby="welcome-title">
          <div className="hero-copy">
            <div className="campus-context"><span className="eyebrow-dot pulse" /> <strong>Northbridge University</strong><span>· Main Campus</span><span className="campus-context-status">Live campus feed</span></div>
            <p className="eyebrow">YOUR CAMPUS, IN CONTEXT <span className="eyebrow-separator">/</span> OCTOBER 2026</p>
            <h1 id="welcome-title">Find what’s worth<br /><em>your time.</em></h1>
            <p className="hero-description">A calm, intelligent campus district for discovering events, understanding the fit, and choosing with confidence.</p>
            <form className="global-search" onSubmit={(event) => { event.preventDefault(); setActiveView("explore"); showToast(query ? `Showing results for “${query}”` : "Try a search to shape your feed"); }}>
              <Icon name="search" size={20} />
              <input aria-label="Search campus events, interests, or goals" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, interests, or goals…" />
              <kbd>⌘ K</kbd>
              <button type="submit" aria-label="Search events"><Icon name="arrow-right" size={18} /></button>
            </form>
            <div className="search-examples"><span>Try</span><button type="button" onClick={() => { setQuery("hands-on AI workshop"); setActiveView("explore"); }}>“hands-on AI workshop”</button><button type="button" onClick={() => { setQuery("free events this weekend"); setActiveView("explore"); }}>“free this weekend”</button></div>
          </div>
          {featuredEvent ? <article className="hero-event-card">
            <EventVisual event={featuredEvent} featured />
            <div className="hero-event-overlay" />
            <div className="hero-event-topline"><span className="hero-featured-label"><Icon name="sparkle" size={14} /> PICKED FOR YOU</span><span className="hero-score"><strong>{scoreOf(featuredEvent)}</strong><span>/100 EventRank</span></span></div>
            <div className="hero-event-content">
              <span className={`category-pill ${categoryClass(asText(featuredEvent.category, "Campus event"))}`}>{asText(featuredEvent.category, "Campus event")}</span>
              <h2>{asText(featuredEvent.title, "A campus event worth your time")}</h2>
              <p>{asText(featuredEvent.summary, "A thoughtful campus experience with the details ready to plan around.")}</p>
              <div className="hero-event-meta"><MetaItem icon="calendar">{asText(featuredEvent.dateLabel, formatFallbackDate(featuredEvent))}</MetaItem><MetaItem icon="pin">{asText(featuredEvent.location, "Northbridge campus")}</MetaItem></div>
              <div className="hero-event-bottom"><span className="hero-reason"><Icon name="check" size={13} /> {listOf(featuredEvent.scoreReasons)[0] || "Strong fit for your interests"}</span><button type="button" className="hero-event-cta" onClick={() => setSelectedEventId(String(featuredEvent.id))}>View event <Icon name="arrow-up-right" size={16} /></button></div>
            </div>
          </article> : <div className="hero-event-empty"><Icon name="sparkle" size={24} /><strong>Good things are loading in.</strong><span>Browse Explore to see the full campus calendar.</span></div>}
        </section>

        <section className="personalize-strip" aria-label="Personalize your recommendations">
          <div className="personalize-icon"><Icon name="sparkle" size={18} /></div>
          <div className="personalize-copy"><strong>Make EventRank more you</strong><span>Tell us what you’re into and we’ll tune your recommendations.</span></div>
          <div className="personalize-preview">{preferences.slice(0, 3).map((preference) => <span key={preference}>{preference}</span>)}</div>
          <button type="button" className="text-action" onClick={() => setPreferencesOpen(true)}>Edit preferences <Icon name="arrow-right" size={15} /></button>
        </section>

        {showHomeRails ? <div className="home-rails">
          <EventRail eyebrow="YOUR SIGNALS" title="Picked for you" subtitle="High-fit ideas based on what you care about." events={homeRailEvents.picked} savedIds={savedIds} compareIds={compareIds} onOpen={openEvent} onSave={toggleSaved} onCompare={toggleCompared} onSeeAll={() => navigateTo("explore")} />
          <EventRail eyebrow="RIGHT NOW" title="Happening today" subtitle="Make a little room for what is already in motion." events={homeRailEvents.today} savedIds={savedIds} compareIds={compareIds} onOpen={openEvent} onSave={toggleSaved} onCompare={toggleCompared} onSeeAll={() => { setActiveView("explore"); setFilters((current) => ({ ...current, date: "Today" })); }} />
          <EventRail eyebrow="ON THE HORIZON" title="This week on campus" subtitle="A balanced shortlist for the days ahead." events={homeRailEvents.week} savedIds={savedIds} compareIds={compareIds} onOpen={openEvent} onSave={toggleSaved} onCompare={toggleCompared} onSeeAll={() => { setActiveView("explore"); setFilters((current) => ({ ...current, date: "This week" })); }} />
          <EventRail eyebrow="LOW-LIFT PICKS" title="Free to attend" subtitle="Good experiences that leave room in your budget." events={homeRailEvents.free} savedIds={savedIds} compareIds={compareIds} onOpen={openEvent} onSave={toggleSaved} onCompare={toggleCompared} onSeeAll={() => { setActiveView("explore"); setFilters((current) => ({ ...current, price: "Free" })); }} />
        </div> : null}

        <section className="discovery-section" aria-labelledby="discovery-heading">
          <div className="section-heading-row">
            <div><p className="section-kicker">{activeView === "saved" ? "YOUR SHORTLIST" : activeView === "rsvps" ? "YOUR PLAN" : activeView === "explore" ? "EXPLORE" : "ALL CAMPUS EVENTS"}</p><h2 id="discovery-heading">{activeView === "saved" ? "Events you want to remember" : activeView === "rsvps" ? "My upcoming RSVPs" : activeView === "explore" ? "Explore the full campus calendar" : "Keep exploring"}</h2><p className="section-subtitle">{activeView === "saved" ? `${savedCount} event${savedCount === 1 ? "" : "s"} saved for later.` : activeView === "rsvps" ? `${registeredCount} event${registeredCount === 1 ? "" : "s"} in your upcoming plan.` : "Search intentionally or browse every event with the context to choose well."}</p></div>
            <div className="section-actions">{activeView === "saved" && visibleEvents.length ? <button type="button" className="control-button" onClick={() => { downloadIcs("eventrank-saved.ics", buildIcsCalendar(visibleEvents.map(toIcsInput))); showToast("Saved events exported to calendar"); }}><Icon name="calendar" size={16} /> Export .ics</button> : null}<button type="button" className={`control-button ${showFilters ? "is-active" : ""}`} onClick={() => setShowFilters((value) => !value)}><Icon name="sliders" size={16} /> Filters {filterCount ? <span className="control-count">{filterCount}</span> : null}</button><label className="sort-control"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Recommended</option><option>Soonest</option><option>Highest rated</option><option>Most reviewed</option></select><Icon name="chevron-down" size={14} /></label><div className="view-toggle" aria-label="Change event layout"><button type="button" className={viewMode === "grid" ? "selected" : ""} onClick={() => setViewMode("grid")} aria-label="Grid view"><Icon name="grid" size={16} /></button><button type="button" className={viewMode === "list" ? "selected" : ""} onClick={() => setViewMode("list")} aria-label="List view"><Icon name="list" size={16} /></button></div></div>
          </div>

          <div className="category-row" aria-label="Event categories"><button type="button" className={`category-filter-chip ${activeCategory === "All events" ? "active" : ""}`} onClick={() => setActiveCategory("All events")}>All events <span>{catalog.length}</span></button>{categories.map((category) => <button type="button" className={`category-filter-chip ${activeCategory.toLowerCase() === category.toLowerCase() ? "active" : ""}`} key={category} onClick={() => setActiveCategory(category)}>{category}</button>)}</div>

          {showFilters ? <div className="filter-panel" aria-label="Event filters"><div className="filter-panel-heading"><div><strong>Refine your feed</strong><span>Combine filters to find a better fit.</span></div><button type="button" className="clear-filters" onClick={() => { setFilters({ format: "Any format", price: "Any price", date: "Any day" }); setActiveCategory("All events"); setQuery(""); }}>Clear all</button></div><label>When<select value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}>{dateOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label>Format<select value={filters.format} onChange={(event) => setFilters((current) => ({ ...current, format: event.target.value }))}>{formatOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label>Cost<select value={filters.price} onChange={(event) => setFilters((current) => ({ ...current, price: event.target.value }))}>{priceOptions.map((option) => <option key={option}>{option}</option>)}</select></label><div className="filter-tip"><Icon name="sparkle" size={16} /><span>Filters never hide an event from your saved list.</span></div></div> : null}

          <div className="results-meta"><span>{loading ? "Finding your next event…" : <><strong>{visibleEvents.length}</strong> event{visibleEvents.length === 1 ? "" : "s"} {query ? `matching “${query}”` : "worth a look"}</>}</span>{query || activeCategory !== "All events" || filterCount ? <button type="button" onClick={() => { setQuery(""); setActiveCategory("All events"); setFilters({ format: "Any format", price: "Any price", date: "Any day" }); }}>Reset search <Icon name="x" size={13} /></button> : null}</div>

          {loading ? <LoadingGrid /> : visibleEvents.length ? <div className={`event-grid ${viewMode === "list" ? "event-grid-list" : ""}`}>{visibleEvents.map((event, index) => <EventCard key={String(event.id)} event={event} saved={savedIds.has(String(event.id))} compared={compareIds.includes(String(event.id))} featured={viewMode === "grid" && (event === featuredEvent || (index === 0 && visibleEvents.length > 2))} list={viewMode === "list"} onOpen={() => openEvent(event)} onSave={() => toggleSaved(event)} onCompare={() => toggleCompared(event)} />)}</div> : <div className="empty-state"><div className="empty-illustration"><Icon name="search" size={28} /></div><h3>{activeView === "saved" ? "Your shortlist is waiting" : activeView === "rsvps" ? "Your plan is still open" : "No events match that yet"}</h3><p>{activeView === "saved" ? "Save an event while you explore and it will show up here." : activeView === "rsvps" ? "Register for an event and it will appear here with calendar-ready details." : "Nothing matches that combination yet. Try removing one filter or explore what is happening this week."}</p><button type="button" className="secondary-action" onClick={resetDiscovery}>{activeView === "rsvps" ? "Explore events" : "Show all events"} <Icon name="arrow-right" size={16} /></button></div>}
        </section>

        <section className="bottom-callout"><div className="callout-mark"><Icon name="star" size={20} /></div><div><p className="section-kicker">AFTER THE EVENT</p><h2>Good choices get better with your perspective.</h2><p>Reviews help your campus community find the events that live up to the promise.</p></div><button type="button" className="secondary-action" onClick={() => { const pastEvent = catalog.find(isPast); if (pastEvent) openReview(pastEvent); else showToast("Reviews unlock after an event ends"); }}>Share a review <Icon name="arrow-right" size={16} /></button></section>
      </div>

      <nav className="bottom-navigation" aria-label="Mobile navigation">
        <button type="button" className={activeView === "discover" ? "active" : ""} onClick={() => navigateTo("discover")}><Icon name="sparkle" size={18} /><span>For You</span></button>
        <button type="button" className={activeView === "explore" ? "active" : ""} onClick={() => navigateTo("explore")}><Icon name="search" size={18} /><span>Explore</span></button>
        <button type="button" className={activeView === "saved" ? "active" : ""} onClick={() => navigateTo("saved")}><span className="bottom-nav-icon-wrap"><Icon name="bookmark" size={18} />{savedCount ? <b>{savedCount}</b> : null}</span><span>Saved</span></button>
        <button type="button" className={activeView === "rsvps" ? "active" : ""} onClick={() => navigateTo("rsvps")}><span className="bottom-nav-icon-wrap"><Icon name="calendar" size={18} />{registeredCount ? <b>{registeredCount}</b> : null}</span><span>My RSVPs</span></button>
        <button type="button" onClick={() => setPreferencesOpen(true)}><Icon name="user" size={18} /><span>Profile</span></button>
      </nav>

      {compareIds.length ? <div className="compare-tray"><div className="compare-tray-copy"><span className="tray-icon"><Icon name="compare" size={17} /></span><div><strong>{compareIds.length} event{compareIds.length === 1 ? "" : "s"} selected</strong><span>{compareIds.length < 2 ? "Add one more to compare side by side" : "Ready for a closer look"}</span></div></div><div className="compare-tray-events">{comparedEvents.map((event) => <span key={String(event.id)}>{asText(event.title)}<button type="button" aria-label={`Remove ${asText(event.title)} from comparison`} onClick={() => toggleCompared(event)}><Icon name="x" size={12} /></button></span>)}</div><button type="button" className="compare-open-button" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>Compare now <Icon name="arrow-right" size={16} /></button></div> : null}

      {selectedEvent ? <EventDetail event={selectedEvent} saved={savedIds.has(String(selectedEvent.id))} compared={compareIds.includes(String(selectedEvent.id))} reviewed={reviewedIds.has(String(selectedEvent.id))} registered={registeredIds.has(String(selectedEvent.id))} related={relatedEvents} onClose={() => setSelectedEventId(null)} onSave={() => toggleSaved(selectedEvent)} onCompare={() => toggleCompared(selectedEvent)} onReview={() => openReview(selectedEvent)} onRegister={() => registerForEvent(selectedEvent)} onSelectEvent={(id) => setSelectedEventId(id)} onToast={showToast} /> : null}
      {preferencesOpen ? <PreferencesDialog selected={preferences} settings={preferenceSettings} onToggle={(preference) => setPreferences((current) => current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference])} onSettingsChange={setPreferenceSettings} onClose={() => setPreferencesOpen(false)} onSave={savePreferences} /> : null}
      {reviewEvent ? <ReviewDialog event={reviewEvent} onClose={() => setReviewEventId(null)} onSubmit={async (rating, tags, comment) => {
        try {
          const response = await fetch(`/api/events/${encodeURIComponent(String(reviewEvent.id))}/review`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ rating, body: comment || undefined, title: tags.join(", ") || undefined }),
          });
          const payload = await response.json().catch(() => ({}));
          if (response.status === 403) {
            const message = typeof payload?.error?.message === "string" ? payload.error.message : "Reviews open after the event ends.";
            return message;
          }
          if (!response.ok) return "Could not submit the review — try again.";
          setReviewedIds((current) => new Set(current).add(String(reviewEvent.id)));
          setReviewEventId(null);
          showToast(`Thanks — your ${rating}-star review was saved`);
          return null;
        } catch {
          return "Could not submit the review — try again.";
        }
      }} /> : null}
      {compareOpen ? <CompareDialog events={comparedEvents} onClose={() => setCompareOpen(false)} onRemove={(id) => setCompareIds((current) => current.filter((item) => item !== id))} onToast={showToast} /> : null}
      {toast ? <div className="toast" role="status"><span className="toast-check"><Icon name="check" size={14} /></span>{toast}</div> : null}
    </main>
  );
}

/**
 * Default export: the app wrapped in next-auth's SessionProvider so useSession
 * works. next-auth/react is a declared dependency (verified in node_modules),
 * so no fetch-based fallback is needed. The session cookie stays HttpOnly and
 * is only read server-side or via this provider — nothing auth-related is
 * written to localStorage (saved IDs + preferences remain the only keys).
 */
export default function EventRankApp() {
  return (
    <SessionProvider>
      <EventRankAppInner />
    </SessionProvider>
  );
}
