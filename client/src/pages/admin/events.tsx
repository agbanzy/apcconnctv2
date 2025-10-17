import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, List, Plus, Download, Send, XCircle, BarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(3, "Category is required"),
  date: z.string(),
  location: z.string().min(3, "Location is required"),
  maxAttendees: z.string().optional(),
});

export default function AdminEvents() {
  const { toast } = useToast();
  const [view, setView] = useState<"calendar" | "list">("list");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [rsvpsDialogOpen, setRsvpsDialogOpen] = useState(false);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["/api/events"],
  });

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      date: "",
      location: "",
      maxAttendees: "",
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/events", {
      ...data,
      maxAttendees: data.maxAttendees ? parseInt(data.maxAttendees) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Success", description: "Event created successfully" });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create event", variant: "destructive" });
    },
  });

  const cancelEventMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Success", description: "Event cancelled successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel event", variant: "destructive" });
    },
  });

  const events = eventsData?.data || [];

  const viewRSVPs = (event: any) => {
    setSelectedEvent(event);
    setRsvpsDialogOpen(true);
  };

  const exportRSVPs = (event: any) => {
    toast({ title: "Info", description: "Exporting RSVPs..." });
  };

  const sendNotification = (event: any) => {
    toast({ title: "Info", description: "Sending notification to attendees..." });
  };

  if (isLoading) {
    return <div className="p-6">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Events' }]} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-events-title">Events Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage events</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "list")}>
            <TabsList>
              <TabsTrigger value="list" data-testid="tab-list-view">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar-view">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-event">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="grid gap-4">
          {events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No events found
              </CardContent>
            </Card>
          ) : (
            events.map((event: any) => (
              <Card key={event.id} data-testid={`event-card-${event.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{event.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{event.category}</p>
                    </div>
                    <Badge variant="secondary">{new Date(event.date).toLocaleDateString()}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm">{event.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>📍 {event.location}</span>
                      <span>👥 {event.rsvpCount || 0} RSVPs</span>
                      {event.maxAttendees && <span>Max: {event.maxAttendees}</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewRSVPs(event)}
                        data-testid={`button-view-rsvps-${event.id}`}
                      >
                        <BarChart className="h-4 w-4 mr-2" />
                        View RSVPs
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportRSVPs(event)}
                        data-testid={`button-export-rsvps-${event.id}`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => sendNotification(event)}
                        data-testid={`button-notify-${event.id}`}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Notify
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => cancelEventMutation.mutate(event.id)}
                        data-testid={`button-cancel-${event.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Calendar view - Coming soon</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-event">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Set up a new event for members</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createEventMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Event title" data-testid="input-event-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Town Hall">Town Hall</SelectItem>
                        <SelectItem value="Rally">Rally</SelectItem>
                        <SelectItem value="Summit">Summit</SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Event description" rows={3} data-testid="input-event-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" data-testid="input-event-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Attendees (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="No limit" data-testid="input-event-max" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Event location" data-testid="input-event-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-event">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-event">Create Event</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={rsvpsDialogOpen} onOpenChange={setRsvpsDialogOpen}>
        <DialogContent data-testid="dialog-rsvps">
          <DialogHeader>
            <DialogTitle>Event RSVPs</DialogTitle>
            <DialogDescription>{selectedEvent?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-md">
                <p className="text-2xl font-bold">{selectedEvent?.rsvpCount || 0}</p>
                <p className="text-sm text-muted-foreground">Total RSVPs</p>
              </div>
              <div className="p-4 border rounded-md">
                <p className="text-2xl font-bold">{selectedEvent?.attendedCount || 0}</p>
                <p className="text-sm text-muted-foreground">Attended</p>
              </div>
              <div className="p-4 border rounded-md">
                <p className="text-2xl font-bold">
                  {selectedEvent?.rsvpCount ? Math.round((selectedEvent?.attendedCount || 0) / selectedEvent.rsvpCount * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">RSVP list will be displayed here</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
