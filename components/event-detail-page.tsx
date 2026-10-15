"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import type { Event } from "@/lib/events";
import { buildIcsCalendar, downloadIcs } from "@/lib/ics";

import styles from "./event-detail-page.module.css";

type Ranking = {
  score: number;
  reasons: string[];
  components?: Partial<Record<"relevance" | "practicalFit" | "trust" | "community", number>>;
};

interface EventDetailPageProps {
  event: Event;
  ranking: Ranking;
  relatedEvents: Event[];
}

type IconName =
  | "arrow-left"
  | "arrow-right"
  | "arrow-up-right"
  | "bookmark"
  | "bookmark-filled"
  | "calendar"
  | "check"
  | "clock"
  | "compare"
  | "info"
  | "pin"
  | "share"
  | "sparkle"
  | "user";

function Icon({ name, size = 17 }: { name: IconName; size?: number }) {
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
    case "arrow-left":
      return <svg {...common}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
    case "arrow-up-right":
      return <svg {...common}><path d="M7 17 17 7M8 7h9v9" /></svg>;
    case "bookmark":
      return <svg {...common}><path d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5V21l-5.5-3.5L6.5 21V4.5Z" /></svg>;
    case "bookmark-filled":
      return <svg {...common} fill="currentColor" stroke="currentColor"><path d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5V21l-5.5-3.5L6.5 21V4.5Z" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4.5 4.5L19 7" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.2 2" /></svg>;
    case "compare":
      return <svg {...common}><rect x="3.5" y="5" width="7" height="14" rx="1.5" /><rect x="13.5" y="5" width="7" height="14" rx="1.5" /><path d="M7 8.5h.01M7 12h.01M17 8.5h.01M17 12h.01" strokeWidth="2.5" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5v5M12 7.5h.01" strokeWidth="2.2" /></svg>;
    case "pin":
      return <svg {...common}><path d="M19 10c0 5-7 10.5-7 10.5S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.3" /></svg>;
    case "share":
      return <svg {...common}><circle cx="18" cy="5" r="2.3" /><circle cx="6" cy="12" r="2.3" /><circle cx="18" cy="19" r="2.3" /><path d="m8 11 7.7-4.5M8 13l7.7 4.5" /></svg>;
    case "sparkle":
      return <svg {...common}><path d="m12 2 1.3 5.2L18 9l-4.7 1.8L12 16l-1.3-5.2L6 9l4.7-1.8L12 2ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" /></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>;
  }
}

function text(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function safeScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}

function coverGradient(category: string) {
  const themes = [
    ["#17233f", "#536ee5", "#9b8ae7"],
    ["#202943", "#275e91", "#66b9bd"],
    ["#2a203f", "#7858a8", "#e19a80"],
    ["#162c32", "#367d79", "#c6dc60"],
    ["#34263a", "#9a5e78", "#e4b763"],
  ];
  const hash = [...category].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const theme = themes[hash % themes.length];
  return `linear-gradient(124deg, ${theme[0]} 0%, ${theme[1]} 57%, ${theme[2]} 125%)`;
}

function initials(name: string) {
  const parts = name.replace(/[^a-zA-Z\s]/g, " ").split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((part) => part[0]).join("") || "ER").toUpperCase();
}

function isFree(priceLabel: string) {
  return /free|no cost|no fee|\$0/i.test(priceLabel);
}

function isPast(event: Event) {
  const timestamp = Date.parse(event.endAt);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function readIds(key: string) {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Local storage is an optional demo enhancement.
  }
}

function scheduleFor(event: Event) {
  const format = text(event.format, "the event").toLowerCase();
  const handsOn = event.tags.some((tag) => /workshop|coding|hands-on|lab|build/i.test(tag));
  return [
    {
      time: text(event.timeLabel, "Before start"),
      title: "Arrive and settle in",
      copy: `Find the check-in point at ${text(event.location, "the listed venue")}. ${handsOn ? "Bring a laptop if you have one." : "A little early arrival keeps the start relaxed."}`,
    },
    {
      time: "Main session",
      title: "The event itself",
      copy: text(event.summary, "A focused campus experience shaped by the host team."),
    },
    {
      time: "Last 15 min",
      title: "Questions and next steps",
      copy: format.includes("virtual")
        ? "Stay in the room for questions and any links the organizer shares."
        : "Leave room for questions, conversations, and a clear next step.",
    },
  ];
}

function ActionButtons({
  event,
  saved,
  compared,
  registered,
  waitlisted,
  registering,
  onRegister,
  onSave,
  onCompare,
  onShare,
  onCalendar,
  mobile = false,
}: {
  event: Event;
  saved: boolean;
  compared: boolean;
  registered: boolean;
  waitlisted: boolean;
  registering: boolean;
  onRegister: () => void;
  onSave: () => void;
  onCompare: () => void;
  onShare: () => void;
  onCalendar: () => void;
  mobile?: boolean;
}) {
  const unavailable = event.status === "canceled" || event.status === "archived" || event.status === "completed" || isPast(event);
  const registrationLabel = waitlisted
    ? "Waitlisted"
    : registered
    ? "RSVP confirmed"
    : event.status === "full"
      ? "Join waitlist"
      : unavailable
        ? "Registration closed"
        : "RSVP / Register";

  if (mobile) {
    return (
      <div className={styles.mobileActions} aria-label="Event actions">
        <button className={styles.mobilePrimary} type="button" onClick={onRegister} disabled={unavailable || registering || registered || waitlisted}>
          <Icon name={registered || waitlisted ? "check" : "arrow-right"} size={15} />
          {registering ? "Working…" : registrationLabel}
        </button>
        <button className={`${styles.mobileSecondary} ${saved ? styles.active : ""}`} type="button" aria-pressed={saved} onClick={onSave}>
          <Icon name={saved ? "bookmark-filled" : "bookmark"} size={15} />
          {saved ? "Saved" : "Save"}
        </button>
        <button className={`${styles.mobileSecondary} ${compared ? styles.active : ""}`} type="button" aria-pressed={compared} onClick={onCompare}>
          <Icon name={compared ? "check" : "compare"} size={15} />
          {compared ? "Compared" : "Compare"}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.actionStack}>
      <button className={styles.primaryButton} type="button" onClick={onRegister} disabled={unavailable || registering || registered || waitlisted}>
        <Icon name={registered || waitlisted ? "check" : "arrow-right"} size={16} />
        {registering ? "Working…" : registrationLabel}
      </button>
      <div className={styles.actionRow}>
        <button className={`${styles.secondaryButton} ${saved ? styles.active : ""}`} type="button" aria-pressed={saved} onClick={onSave}>
          <Icon name={saved ? "bookmark-filled" : "bookmark"} size={15} />
          {saved ? "Saved" : "Save"}
        </button>
        <button className={`${styles.secondaryButton} ${compared ? styles.active : ""}`} type="button" aria-pressed={compared} onClick={onCompare}>
          <Icon name={compared ? "check" : "compare"} size={15} />
          {compared ? "Compared" : "Compare"}
        </button>
      </div>
      <button className={styles.shareButton} type="button" onClick={onShare}>
        <Icon name="share" size={14} /> Share event
      </button>
      <button className={styles.calendarButton} type="button" onClick={onCalendar}>
        <Icon name="calendar" size={14} /> Add to calendar
      </button>
    </div>
  );
}

export default function EventDetailPage({ event, ranking, relatedEvents }: EventDetailPageProps) {
  const eventId = String(event.id);
  const score = safeScore(ranking.score ?? event.score);
  const category = text(event.category, "Campus event");
  const organizer = text(event.organizer, "Northbridge campus community");
  const reasons = ranking.reasons.length ? ranking.reasons : ["Complete event information", "Relevant to the campus community"];
  const schedule = useMemo(() => scheduleFor(event), [event]);
  const [saved, setSaved] = useState(false);
  const [compared, setCompared] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const savedIds = readIds("eventrank:saved");
    const registeredIds = readIds("eventrank:registered");
    const waitlistedIds = readIds("eventrank:waitlisted");
    const compareIds = readIds("eventrank:compare");
    setSaved(savedIds.includes(eventId));
    setRegistered(registeredIds.includes(eventId));
    setWaitlisted(waitlistedIds.includes(eventId));
    setCompared(compareIds.includes(eventId));

    let cancelled = false;
    fetch("/api/me/saved")
      .then(async (response) => (response.ok ? (await response.json()) as { savedEventIds?: unknown[] } : null))
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.savedEventIds) && payload.savedEventIds.map(String).includes(eventId)) {
          setSaved(true);
        }
      })
      .catch(() => {
        // Local demo state remains the fallback when auth or persistence is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    const ids = readIds("eventrank:saved").filter((id) => id !== eventId);
    writeIds("eventrank:saved", next ? [...ids, eventId] : ids);
    setToast(next ? "Saved to your campus list" : "Removed from saved events");

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/save`, { method: next ? "POST" : "DELETE" });
      if (!response.ok) throw new Error("save unavailable");
    } catch {
      setToast(next ? "Saved for this demo" : "Removed for this demo");
    }
  };

  const toggleCompare = () => {
    const ids = readIds("eventrank:compare").filter((id) => id !== eventId);
    if (compared) {
      setCompared(false);
      writeIds("eventrank:compare", ids);
      setToast("Removed from compare");
      return;
    }
    if (ids.length >= 3) {
      setToast("Compare supports up to three events");
      return;
    }
    setCompared(true);
    writeIds("eventrank:compare", [...ids, eventId]);
    setToast("Added to compare · choose another event to see the decision view");
  };

  const register = async () => {
    if (registering || registered || waitlisted || event.status === "canceled" || event.status === "archived" || event.status === "completed" || isPast(event)) return;
    setRegistering(true);
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/register`, { method: "POST" });
      if (!response.ok) throw new Error("registration unavailable");
      const payload = (await response.json()) as { status?: string };
      setRegistered(true);
      setWaitlisted(payload.status === "waitlisted");
      const ids = readIds("eventrank:registered").filter((id) => id !== eventId);
      writeIds("eventrank:registered", [...ids, eventId]);
      const waitlistIds = readIds("eventrank:waitlisted").filter((id) => id !== eventId);
      writeIds("eventrank:waitlisted", payload.status === "waitlisted" ? [...waitlistIds, eventId] : waitlistIds);
      setToast(payload.status === "waitlisted" ? "You’re on the waitlist" : "RSVP confirmed — see you there");
    } catch {
      // Demo behavior stays useful when auth, the database, or the API is not configured.
      setRegistered(true);
      setWaitlisted(event.status === "full");
      const ids = readIds("eventrank:registered").filter((id) => id !== eventId);
      writeIds("eventrank:registered", [...ids, eventId]);
      const waitlistIds = readIds("eventrank:waitlisted").filter((id) => id !== eventId);
      writeIds("eventrank:waitlisted", event.status === "full" ? [...waitlistIds, eventId] : waitlistIds);
      setToast("RSVP saved for this demo");
    } finally {
      setRegistering(false);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast("Event link copied");
    } catch {
      setToast("Your event link is ready to share");
    }
  };

  const addToCalendar = () => {
    const calendar = buildIcsCalendar([
      {
        id: eventId,
        title: text(event.title, "Campus event"),
        description: text(event.description, text(event.summary, "")),
        location: text(event.location, "Northbridge campus"),
        startAt: event.startAt,
        endAt: event.endAt,
        url: typeof window === "undefined" ? undefined : window.location.href,
      },
    ]);
    downloadIcs(`${eventId}.ics`, calendar);
    setToast("Calendar file downloaded");
  };

  const componentScores = [
    { label: "Relevance", key: "relevance" as const, max: 30 },
    { label: "Practical fit", key: "practicalFit" as const, max: 25 },
    { label: "Trust", key: "trust" as const, max: 20 },
    { label: "Community", key: "community" as const, max: 10 },
  ].map((item) => {
    const ratio = typeof ranking.components?.[item.key] === "number" ? ranking.components[item.key] as number : score / 100;
    const value = Math.max(0, Math.min(item.max, Math.round(ratio * item.max)));
    return { ...item, value, ratio: item.max ? value / item.max : 0 };
  });

  const coverStyle: CSSProperties = { background: coverGradient(category) };
  const title = text(event.title, "Campus event");
  const description = text(event.description, text(event.summary, "A campus experience worth making time for."));
  const price = text(event.priceLabel, "See registration details");
  const statusNote = event.status === "full" ? "Waitlist available" : text(event.capacityStatus, "Capacity details available");

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="EventRank home">
          <span className={styles.brandMark}>ER</span>
          <span>Event<span className={styles.brandMuted}>Rank</span></span>
        </Link>
        <div className={styles.campusContext}>
          <span className={styles.campusDot} aria-hidden="true" />
          <strong>Northbridge University</strong>
          <span>· Main Campus</span>
        </div>
        <Link className={styles.backLink} href="/">
          <Icon name="arrow-left" size={14} /> Back to discover
        </Link>
      </header>

      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link className={styles.breadcrumbLink} href="/">For you</Link>
          <span className={styles.separator} aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>{title}</span>
        </nav>

        <div className={styles.layout}>
          <div className={styles.primary}>
            <section className={styles.cover} style={coverStyle} aria-label={`${category} event cover`}>
              <div className={styles.coverGrid} aria-hidden="true" />
              <div className={styles.coverTopline}>
                <span className={styles.coverCategory}>{category}</span>
                <span className={styles.coverCode}>ER / DETAIL 01</span>
              </div>
              <span className={styles.coverWord} aria-hidden="true">{category.slice(0, 3).toUpperCase()}</span>
              <div className={styles.coverBottomline}>
                <p className={styles.coverCaption}>A synthetic campus moment, made easier to plan around.</p>
                <div className={styles.coverScore} aria-label={`EventRank score ${score} out of 100`}>
                  <strong>{score}</strong>
                  <span>EventRank</span>
                </div>
              </div>
            </section>

            <header className={styles.heroCopy}>
              <p className={styles.eyebrow}><span className={styles.eyebrowDot} aria-hidden="true" /> Campus event detail</p>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.summary}>{text(event.summary, description)}</p>

              <div className={styles.logistics}>
                <div className={styles.logistic}>
                  <span className={styles.logisticIcon}><Icon name="calendar" size={17} /></span>
                  <span className={styles.logisticCopy}><strong>{text(event.dateLabel, "Date to be announced")}</strong><span>{text(event.timeLabel, "Time to be announced")}</span></span>
                </div>
                <div className={styles.logistic}>
                  <span className={styles.logisticIcon}><Icon name="pin" size={17} /></span>
                  <span className={styles.logisticCopy}><strong>{text(event.location, "Northbridge campus")}</strong><span>{text(event.format, "Format to be announced")}</span></span>
                </div>
                <div className={styles.logistic}>
                  <span className={styles.logisticIcon}><Icon name="user" size={17} /></span>
                  <span className={styles.logisticCopy}><strong>{text(event.audience, "All students")}</strong><span>{statusNote}</span></span>
                </div>
              </div>
            </header>

            <section className={styles.section} aria-labelledby="event-rank-heading">
              <div className={styles.scorePanel}>
                <div className={styles.scorePanelHeader}>
                  <div>
                    <p className={styles.kicker}>WHY THIS RANKS HIGH</p>
                    <h2 className={styles.scorePanelTitle} id="event-rank-heading">A strong fit for your week</h2>
                  </div>
                  <span className={styles.scorePill}><Icon name="sparkle" size={13} /> {score} / 100</span>
                </div>
                <p className={styles.scorePanelCopy}>EventRank combines relevance, practical fit, trust, and community signals. It is a useful fit signal, not a promise that every event will be right for everyone.</p>
                <div className={styles.reasonGrid}>
                  {reasons.slice(0, 4).map((reason) => <div className={styles.reason} key={reason}><span className={styles.check}><Icon name="check" size={13} /></span><span>{reason}</span></div>)}
                </div>
                <div className={styles.breakdown} aria-label="EventRank score details">
                  {componentScores.map((item) => <div className={styles.breakdownItem} key={item.key}><span className={styles.breakdownLabel}>{item.label}</span><strong className={styles.breakdownValue}>{item.value}/{item.max}</strong><span className={styles.breakdownBar}><span style={{ width: `${item.ratio * 100}%` }} /></span></div>)}
                </div>
              </div>
            </section>

            <section className={styles.section} aria-labelledby="about-heading">
              <div className={styles.sectionHeading}><div><p className={styles.kicker}>ABOUT THIS EVENT</p><h2 className={styles.sectionTitle} id="about-heading">Make the details work for you</h2></div></div>
              <p className={styles.aboutText}>{description}</p>
              <div className={styles.tagRow}>{event.tags.slice(0, 7).map((tag) => <span className={styles.tag} key={tag}>#{tag}</span>)}</div>
            </section>

            <section className={styles.section} aria-labelledby="schedule-heading">
              <div className={styles.sectionHeading}><div><p className={styles.kicker}>PLAN AROUND IT</p><h2 className={styles.sectionTitle} id="schedule-heading">Schedule</h2></div></div>
              <div className={styles.schedule}>
                {schedule.map((item) => <div className={styles.scheduleItem} key={item.title}><span className={styles.scheduleTime}>{item.time}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></div>)}
              </div>
            </section>

            <section className={styles.section} aria-labelledby="know-heading">
              <div className={styles.sectionHeading}><div><p className={styles.kicker}>BEFORE YOU GO</p><h2 className={styles.sectionTitle} id="know-heading">What to know</h2></div></div>
              <div className={styles.knowGrid}>
                <div className={styles.knowItem}><strong>Who it is for</strong><span>{text(event.audience, "All Northbridge students")}</span></div>
                <div className={styles.knowItem}><strong>Cost</strong><span>{price}{isFree(price) ? " · no payment at the door" : " · see organizer details"}</span></div>
                <div className={styles.knowItem}><strong>Format</strong><span>{text(event.format, "Format will be shared by the organizer")}</span></div>
                <div className={styles.knowItem}><strong>Capacity</strong><span>{statusNote}. Save your place early if you plan to attend.</span></div>
              </div>
            </section>

            <section className={styles.section} aria-labelledby="organizer-heading">
              <div className={styles.sectionHeading}><div><p className={styles.kicker}>WHO IS HOSTING</p><h2 className={styles.sectionTitle} id="organizer-heading">Organizer</h2></div></div>
              <div className={styles.organizerCard}><span className={styles.organizerAvatar} aria-hidden="true">{initials(organizer)}</span><div className={styles.organizerCopy}><strong>{organizer}</strong><span>Northbridge campus organizer · event details maintained by the host team</span></div></div>
            </section>

            {relatedEvents.length ? <section className={styles.section} aria-labelledby="related-heading"><div className={styles.sectionHeading}><div><p className={styles.kicker}>KEEP EXPLORING</p><h2 className={styles.sectionTitle} id="related-heading">Related events</h2></div><Link className={styles.breadcrumbLink} href="/">See all <Icon name="arrow-right" size={13} /></Link></div><div className={styles.relatedGrid}>{relatedEvents.slice(0, 3).map((related) => <Link className={styles.relatedLink} href={`/events/${encodeURIComponent(String(related.id))}`} key={String(related.id)}><span className={styles.relatedCategory}>{text(related.category, "Campus event")}</span><strong>{text(related.title, "Related campus event")}</strong><span className={styles.relatedMeta}>{text(related.dateLabel, "Date to be announced")} · {text(related.location, "Northbridge campus")}</span><span className={styles.relatedScore}>{safeScore(related.score)} EventRank</span></Link>)}</div></section> : null}
          </div>

          <aside className={styles.decision} aria-label="Event decision panel">
            <div className={styles.decisionPanel}>
              <div className={styles.decisionEyebrow}><span>YOUR DECISION PANEL</span><Icon name="sparkle" size={14} /></div>
              <div className={styles.decisionScore}>{score}<span>/ 100</span></div>
              <h2 className={styles.decisionHeadline}>Worth a closer look</h2>
              <p className={styles.decisionCopy}>Save it for later, compare the time with another event, or make an RSVP while space is available.</p>
              <ActionButtons event={event} saved={saved} compared={compared} registered={registered} waitlisted={waitlisted} registering={registering} onRegister={register} onSave={toggleSave} onCompare={toggleCompare} onShare={share} onCalendar={addToCalendar} />
              <p className={styles.decisionNote}><Icon name="info" size={14} /> EventRank explains fit from the information available today. You are always in control of the choice.</p>
            </div>
          </aside>
        </div>
      </div>

      <ActionButtons event={event} saved={saved} compared={compared} registered={registered} waitlisted={waitlisted} registering={registering} onRegister={register} onSave={toggleSave} onCompare={toggleCompare} onShare={share} onCalendar={addToCalendar} mobile />

      {toast ? <div className={styles.toast} role="status"><span className={styles.toastMark}><Icon name="check" size={13} /></span>{toast}</div> : null}
    </main>
  );
}
