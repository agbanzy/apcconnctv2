import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResourceToolbar } from "@/components/admin/ResourceToolbar";
import { ResourceTable, Column } from "@/components/admin/ResourceTable";
import { ResourceDrawer } from "@/components/admin/ResourceDrawer";
import { useResourceController } from "@/hooks/use-resource-controller";
import { useResourceList } from "@/hooks/use-resource-list";
import { useResourceMutations } from "@/hooks/use-resource-mutations";
import { ExportButton } from "@/components/admin/ExportButton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  location: string;
  maxAttendees: number | null;
  rsvpCount?: number;
  attendedCount?: number;
  points: number;
  coordinates?: { lat: number; lng: number } | null;
  createdAt: string;
}

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  location: z.string().min(3, "Location is required"),
  maxAttendees: z.coerce.number().nullable().optional(),
  points: z.coerce.number().min(0, "Points must be at least 0"),
  lat: z.string().optional(),
  lng: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function AdminEvents() {
  const { toast } = useToast();
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "date",
    sortOrder: "desc",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const { data, isLoading } = useResourceList<Event>("/api/admin/events", filters);
  const { create, update, remove } = useResourceMutations<Event>("/api/admin/events");

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      date: "",
      location: "",
      maxAttendees: null,
      points: 50,
      lat: "",
      lng: "",
    },
  });

  const columns: Column<Event>[] = [
    {
      key: "title",
      header: "Event",
      render: (event) => (
        <div className="max-w-md" data-testid={`text-title-${event.id}`}>
          <p className="font-medium">{event.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{event.category}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (event) => (
        <span className="text-sm" data-testid={`text-date-${event.id}`}>
          {format(new Date(event.date), "MMM d, yyyy h:mm a")}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (event) => (
        <span className="text-sm" data-testid={`text-location-${event.id}`}>
          {event.location}
        </span>
      ),
    },
    {
      key: "attendees",
      header: "Attendees",
      render: (event) => (
        <span className="text-sm font-mono" data-testid={`text-attendees-${event.id}`}>
          {event.rsvpCount || 0}
          {event.maxAttendees ? ` / ${event.maxAttendees}` : ""}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (event) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingEvent(event);
              form.reset({
                title: event.title,
                description: event.description,
                category: event.category,
                date: format(new Date(event.date), "yyyy-MM-dd'T'HH:mm"),
                location: event.location,
                maxAttendees: event.maxAttendees,
                points: event.points,
                lat: event.coordinates?.lat?.toString() || "",
                lng: event.coordinates?.lng?.toString() || "",
              });
              setDrawerOpen(true);
            }}
            data-testid={`button-edit-${event.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteEventId(event.id)}
            data-testid={`button-delete-${event.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = async (data: EventFormData) => {
    try {
      const eventData: any = {
        title: data.title,
        description: data.description,
        category: data.category,
        date: new Date(data.date).toISOString(),
        location: data.location,
        maxAttendees: data.maxAttendees || null,
        points: data.points,
      };

      if (data.lat && data.lng) {
        eventData.coordinates = {
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
        };
      }

      if (editingEvent) {
        await update.mutateAsync({ id: editingEvent.id, data: eventData });
        toast({ title: "Success", description: "Event updated successfully" });
      } else {
        await create.mutateAsync(eventData);
        toast({ title: "Success", description: "Event created successfully" });
      }

      setDrawerOpen(false);
      setEditingEvent(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save event",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteEventId) return;

    try {
      await remove.mutateAsync(deleteEventId);
      toast({ title: "Success", description: "Event deleted successfully" });
      setDeleteEventId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const handleSort = (column: string) => {
    const newSortOrder =
      filters.sortBy === column && filters.sortOrder === "desc" ? "asc" : "desc";
    setFilters({ ...filters, sortBy: column, sortOrder: newSortOrder });
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Event Management" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Event Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage party events and activities
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingEvent(null);
            form.reset();
            setDrawerOpen(true);
          }}
          data-testid="button-create-event"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      <Card className="p-6">
        <ResourceToolbar
          searchValue={filters.search || ""}
          onSearchChange={(value) => updateFilter("search", value)}
          filterSlot={
            <Select
              value={filters.category || "all"}
              onValueChange={(value) =>
                updateFilter("category", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Town Hall">Town Hall</SelectItem>
                <SelectItem value="Rally">Rally</SelectItem>
                <SelectItem value="Meeting">Meeting</SelectItem>
                <SelectItem value="Training">Training</SelectItem>
                <SelectItem value="Community">Community</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <div className="mt-6">
          <ResourceTable
            columns={columns}
            data={data?.data || []}
            isLoading={isLoading}
            currentPage={filters.page}
            totalPages={data?.totalPages || 1}
            onPageChange={(page) => updateFilter("page", page)}
            onSort={handleSort}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder as "asc" | "desc"}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <ExportButton
            endpoint="/api/admin/events/export"
            filters={filters}
            filename={`events_${Date.now()}.csv`}
            label="Export to CSV"
          />
        </div>
      </Card>

      <ResourceDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingEvent(null);
          form.reset();
        }}
        title={editingEvent ? "Edit Event" : "Create Event"}
        description={editingEvent ? "Update event details" : "Add a new event"}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Event title"
                      {...field}
                      data-testid="input-title"
                    />
                  </FormControl>
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
                    <Textarea
                      placeholder="Event description..."
                      {...field}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Town Hall">Town Hall</SelectItem>
                        <SelectItem value="Rally">Rally</SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Training">Training</SelectItem>
                        <SelectItem value="Community">Community</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        data-testid="input-date"
                      />
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
                    <Input
                      placeholder="Event location"
                      {...field}
                      data-testid="input-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxAttendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Attendees (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-max-attendees"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Points for attendance"
                        {...field}
                        data-testid="input-points"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 6.5244"
                        {...field}
                        data-testid="input-lat"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 3.3792"
                        {...field}
                        data-testid="input-lng"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDrawerOpen(false);
                  setEditingEvent(null);
                  form.reset();
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || update.isPending}
                data-testid="button-save"
              >
                {create.isPending || update.isPending
                  ? "Saving..."
                  : editingEvent
                  ? "Update Event"
                  : "Create Event"}
              </Button>
            </div>
          </form>
        </Form>
      </ResourceDrawer>

      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
