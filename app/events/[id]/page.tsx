import { notFound } from "next/navigation";

import EventDetailPage from "@/components/event-detail-page";
import { getEventById, getRelatedEvents, rankEvent } from "@/lib/events";

interface EventDetailRouteProps {
  params: {
    id: string;
  };
}

/**
 * The shareable, canonical event detail route. The catalog and ranking module
 * stay on the server boundary so this page always starts with authoritative
 * event data and deterministic score reasons.
 */
export default function EventDetailRoute({ params }: EventDetailRouteProps) {
  const event = getEventById(params.id);

  if (!event) {
    notFound();
  }

  const ranking = rankEvent(event);
  const relatedEvents = getRelatedEvents(event).filter((related) => related.id !== event.id);

  return (
    <EventDetailPage
      event={event}
      ranking={ranking}
      relatedEvents={relatedEvents}
    />
  );
}
