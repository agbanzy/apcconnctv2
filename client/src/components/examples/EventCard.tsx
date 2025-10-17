import { EventCard } from "../event-card";

export default function EventCardExample() {
  return (
    <div className="p-4 max-w-md">
      <EventCard
        title="Ward 5 Town Hall Meeting"
        description="Join us for an interactive town hall meeting to discuss youth employment initiatives and party policies."
        date={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
        location="Community Center, Lagos Island"
        attendees={156}
        maxAttendees={500}
        category="Town Hall"
      />
    </div>
  );
}
