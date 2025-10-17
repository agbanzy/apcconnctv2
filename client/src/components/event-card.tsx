import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
  title: string;
  description: string;
  date: Date;
  location: string;
  attendees: number;
  maxAttendees?: number;
  category: string;
}

export function EventCard({
  title,
  description,
  date,
  location,
  attendees,
  maxAttendees,
  category,
}: EventCardProps) {
  return (
    <Card className="hover-elevate transition-all" data-testid="card-event">
      <CardHeader className="gap-2 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" data-testid="badge-event-category">{category}</Badge>
          <div className="text-right">
            <div className="font-mono text-2xl font-bold tabular-nums text-primary" data-testid="text-event-day">
              {format(date, "dd")}
            </div>
            <div className="text-xs text-muted-foreground uppercase" data-testid="text-event-month">
              {format(date, "MMM")}
            </div>
          </div>
        </div>
        <h3 className="font-display text-lg font-semibold mt-2" data-testid="text-event-title">{title}</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-event-description">
          {description}
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span data-testid="text-event-datetime">{format(date, "PPP 'at' p")}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span data-testid="text-event-location">{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span data-testid="text-event-attendees">
              {attendees} {maxAttendees && `/ ${maxAttendees}`} attending
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" data-testid="button-rsvp">
          RSVP to Event
        </Button>
      </CardFooter>
    </Card>
  );
}
