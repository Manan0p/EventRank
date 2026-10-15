import Link from "next/link";

import styles from "@/components/event-detail-page.module.css";

export default function EventNotFound() {
  return (
    <main className={styles.notFoundPage}>
      <div className={styles.notFoundMark} aria-hidden="true">
        ER
      </div>
      <p className={styles.kicker}>EVENTRANK · NORTHBRIDGE CAMPUS</p>
      <h1>That event has moved on.</h1>
      <p>
        We couldn&apos;t find an event with that link. Browse the campus catalog
        to find the next thing worth your time.
      </p>
      <Link className={styles.primaryButton} href="/">
        Explore events <span aria-hidden="true">↗</span>
      </Link>
    </main>
  );
}
