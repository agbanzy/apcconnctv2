import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event } from "@shared/schema";

export default function Events() {
  const { member } = useAuth();
  const { toast } = useToast();

  const { data: eventsData, isLoading } = useQuery<{ success: boolean; data: Event[] }>({
    queryKey: ["/api/events"],
  });

  const rsvpMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/rsvp`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
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
    mutationFn: async (eventId: string) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}/rsvp`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const events = eventsData?.data || [];
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.date) > now);
  const pastEvents = events.filter((e) => new Date(e.date) <= now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Events</h1>
        <p className="text-muted-foreground">
          Discover and register for APC events happening across Nigeria
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList data-testid="tabs-events">
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            Upcoming ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" data-testid="tab-past">
            Past ({pastEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No upcoming events at the moment.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  description={event.description}
                  date={new Date(event.date)}
                  location={event.location}
                  category={event.category}
                  maxAttendees={event.maxAttendees}
                  attendees={0}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No past events.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  description={event.description}
                  date={new Date(event.date)}
                  location={event.location}
                  category={event.category}
                  maxAttendees={event.maxAttendees}
                  attendees={0}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
