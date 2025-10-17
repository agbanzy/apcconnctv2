import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventDetailModal } from "@/components/event-detail-modal";
import { Calendar, MapPin, Users, Check, Info } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface EventCardProps {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  attendees: number;
  maxAttendees?: number;
  category: string;
  imageUrl?: string;
}

interface AttendeeData {
  id: string;
  member: {
    id: string;
  };
  status: string;
}

export function EventCard({
  id,
  title,
  description,
  date,
  location,
  attendees,
  maxAttendees,
  category,
  imageUrl,
}: EventCardProps) {
  const { member } = useAuth();
  const { toast } = useToast();
  const [showDetail, setShowDetail] = useState(false);

  const { data: attendeesData } = useQuery<{ success: boolean; data: AttendeeData[] }>({
    queryKey: ["/api/events", id, "attendees"],
    enabled: !!member,
  });

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${id}/rsvp`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id] });
      toast({
        title: "RSVP confirmed",
        description: "You have successfully registered for this event.",
      });
    },
    onError: () => {
      toast({
        title: "RSVP failed",
        description: "Failed to register for event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const hasRsvped = attendeesData?.data?.some(
    (attendee) => attendee.member.id === member?.id && attendee.status === "confirmed"
  );

  const actualAttendeeCount = attendeesData?.data?.filter(a => a.status === "confirmed").length || attendees;
  const isFull = maxAttendees && actualAttendeeCount >= maxAttendees;
  const isPast = new Date(date) < new Date();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className="hover-elevate transition-all h-full flex flex-col" 
          data-testid={`card-event-${id}`}
        >
          {imageUrl && (
            <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
              <img 
                src={imageUrl} 
                alt={title}
                className="w-full h-full object-cover"
                data-testid={`img-event-${id}`}
              />
              {hasRsvped && (
                <Badge 
                  className="absolute top-3 right-3 bg-green-600 hover:bg-green-700"
                  data-testid={`badge-rsvped-${id}`}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Registered
                </Badge>
              )}
            </div>
          )}
          
          <CardHeader className="gap-2 space-y-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" data-testid={`badge-category-${id}`}>
                  {category}
                </Badge>
                {isFull && !hasRsvped && (
                  <Badge variant="destructive" data-testid={`badge-full-${id}`}>
                    Full
                  </Badge>
                )}
                {isPast && (
                  <Badge variant="outline" data-testid={`badge-past-${id}`}>
                    Past Event
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl font-bold tabular-nums text-primary" data-testid={`text-day-${id}`}>
                  {format(date, "dd")}
                </div>
                <div className="text-xs text-muted-foreground uppercase" data-testid={`text-month-${id}`}>
                  {format(date, "MMM")}
                </div>
              </div>
            </div>
            <h3 className="font-display text-lg font-semibold mt-2 line-clamp-2" data-testid={`text-title-${id}`}>
              {title}
            </h3>
          </CardHeader>
          
          <CardContent className="space-y-3 flex-1">
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${id}`}>
              {description}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span data-testid={`text-datetime-${id}`}>{format(date, "PPP 'at' p")}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="truncate" data-testid={`text-location-${id}`}>{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span data-testid={`text-attendees-${id}`}>
                  {actualAttendeeCount} {maxAttendees && `/ ${maxAttendees}`} attending
                </span>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex items-center justify-between gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDetail(true)}
              data-testid={`button-details-${id}`}
            >
              <Info className="h-4 w-4 mr-2" />
              Details
            </Button>
            {!isPast && (
              <Button 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  rsvpMutation.mutate();
                }}
                disabled={rsvpMutation.isPending || hasRsvped || isFull || !member}
                data-testid={`button-rsvp-${id}`}
              >
                {rsvpMutation.isPending ? "..." : hasRsvped ? "Registered" : isFull ? "Full" : "RSVP"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>

      <EventDetailModal 
        eventId={id}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
}
