import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialShare } from "@/components/social-share";
import { Calendar, MapPin, Users, Clock, User, Check, X } from "lucide-react";
import { format } from "date-fns";
import type { Event, EventRsvp } from "@shared/schema";
import { motion } from "framer-motion";

interface EventDetailModalProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EventWithRsvpCount extends Event {
  rsvpCount: number;
}

interface AttendeeData {
  id: string;
  member: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  status: string;
}

export function EventDetailModal({ eventId, open, onOpenChange }: EventDetailModalProps) {
  const { member } = useAuth();
  const { toast } = useToast();

  const { data: eventData, isLoading: eventLoading } = useQuery<{ success: boolean; data: EventWithRsvpCount }>({
    queryKey: ["/api/events", eventId],
    enabled: open && !!eventId,
  });

  const { data: attendeesData, isLoading: attendeesLoading } = useQuery<{ success: boolean; data: AttendeeData[] }>({
    queryKey: ["/api/events", eventId, "attendees"],
    enabled: open && !!eventId && !!member,
  });

  const { data: myRsvpData } = useQuery<{ success: boolean; data: EventRsvp[] }>({
    queryKey: ["/api/events", eventId, "my-rsvp"],
    queryFn: async () => {
      if (!member) return { success: true, data: [] };
      const attendees = await fetch(`/api/events/${eventId}/attendees`).then(r => r.json());
      const myRsvp = attendees.data?.find((a: AttendeeData) => a.member.id === member.id);
      return { success: true, data: myRsvp ? [myRsvp] : [] };
    },
    enabled: open && !!eventId && !!member,
  });

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${eventId}/rsvp`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
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

  const cancelRsvpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}/rsvp`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: "RSVP cancelled",
        description: "Your registration has been cancelled.",
      });
    },
    onError: () => {
      toast({
        title: "Cancellation failed",
        description: "Failed to cancel RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (eventLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]" data-testid="dialog-event-detail">
          <DialogHeader>
            <Skeleton className="h-8 w-64" />
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const event = eventData?.data;
  if (!event) return null;

  const hasRsvped = myRsvpData?.data && myRsvpData.data.length > 0 && myRsvpData.data[0].status === "confirmed";
  const attendeeCount = event.rsvpCount || 0;
  const isFull = event.maxAttendees && attendeeCount >= event.maxAttendees;
  const attendees = attendeesData?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0" data-testid="dialog-event-detail">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="space-y-4">
              {event.imageUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-48 rounded-lg overflow-hidden"
                >
                  <img 
                    src={event.imageUrl} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                    data-testid="img-event-banner"
                  />
                </motion.div>
              )}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" data-testid="badge-event-category">
                      {event.category}
                    </Badge>
                    {hasRsvped && (
                      <Badge className="bg-green-600 hover:bg-green-700" data-testid="badge-rsvp-confirmed">
                        <Check className="h-3 w-3 mr-1" />
                        Registered
                      </Badge>
                    )}
                    {isFull && !hasRsvped && (
                      <Badge variant="destructive" data-testid="badge-event-full">
                        Event Full
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="font-display text-2xl" data-testid="text-event-title">
                    {event.title}
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium" data-testid="text-event-date">
                      {format(new Date(event.date), "PPP 'at' p")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium" data-testid="text-event-location">
                      {event.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Attendance</p>
                    <p className="font-medium" data-testid="text-event-attendance">
                      {attendeeCount} {event.maxAttendees && `/ ${event.maxAttendees}`} attending
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">2-3 hours</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-lg mb-3">About This Event</h3>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-event-description">
                  {event.description}
                </p>
              </div>

              {attendees.length > 0 && hasRsvped && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-lg mb-3">
                      Attendees ({attendees.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attendees.slice(0, 6).map((attendee) => (
                        <div 
                          key={attendee.id} 
                          className="flex items-center gap-3 p-2 rounded-lg hover-elevate"
                          data-testid={`attendee-${attendee.id}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {attendee.member.user.firstName[0]}{attendee.member.user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {attendee.member.user.firstName} {attendee.member.user.lastName}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {attendees.length > 6 && (
                      <p className="text-sm text-muted-foreground mt-3">
                        +{attendees.length - 6} more attendees
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <SocialShare
                    title={event.title}
                    description={`${event.description} - ${format(new Date(event.date), "PPP")} at ${event.location}`}
                    url={`/events/${event.id}`}
                    variant="dropdown"
                  />
                </div>
                <div className="flex gap-2">
                  {hasRsvped ? (
                    <Button 
                      variant="outline" 
                      onClick={() => cancelRsvpMutation.mutate()}
                      disabled={cancelRsvpMutation.isPending}
                      data-testid="button-cancel-rsvp"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {cancelRsvpMutation.isPending ? "Cancelling..." : "Cancel RSVP"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => rsvpMutation.mutate()}
                      disabled={rsvpMutation.isPending || isFull || !member}
                      data-testid="button-rsvp"
                    >
                      {rsvpMutation.isPending ? "Processing..." : isFull ? "Event Full" : "RSVP to Event"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
