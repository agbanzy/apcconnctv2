import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { List, Calendar, Search, Filter, X } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import type { Event } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_CATEGORIES = [
  "All Categories",
  "Rally",
  "Town Hall",
  "Training",
  "Meeting",
  "Summit",
  "Campaign",
  "Community Outreach"
];

const DATE_FILTERS = [
  { label: "All Dates", value: "all" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];

export default function Events() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [stateFilter, setStateFilter] = useState("All States");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  const { data: eventsData, isLoading } = useQuery<{ success: boolean; data: Event[] }>({
    queryKey: ["/api/events"],
  });

  const { data: statesData } = useQuery<{ success: boolean; data: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/locations/states"],
  });

  const events = eventsData?.data || [];
  const states = statesData?.data || [];
  const now = new Date();

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (searchQuery) {
      filtered = filtered.filter((event) =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== "All Categories") {
      filtered = filtered.filter((event) => event.category === categoryFilter);
    }

    if (stateFilter !== "All States") {
      const selectedState = states.find(s => s.name === stateFilter);
      if (selectedState) {
        filtered = filtered.filter((event) => event.stateId === selectedState.id);
      }
    }

    if (dateFilter === "week") {
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });
    } else if (dateFilter === "month") {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= monthStart && eventDate <= monthEnd;
      });
    }

    if (selectedCalendarDate) {
      filtered = filtered.filter((event) =>
        isSameDay(new Date(event.date), selectedCalendarDate)
      );
    }

    return filtered;
  }, [events, searchQuery, categoryFilter, stateFilter, dateFilter, selectedCalendarDate, states]);

  const upcomingEvents = filteredEvents.filter((e) => new Date(e.date) > now);
  const pastEvents = filteredEvents.filter((e) => new Date(e.date) <= now);

  const eventsWithDates = useMemo(() => {
    const eventDates: Date[] = [];
    events.forEach((event) => {
      eventDates.push(new Date(event.date));
    });
    return eventDates;
  }, [events]);

  const hasActiveFilters = searchQuery || categoryFilter !== "All Categories" || 
    stateFilter !== "All States" || dateFilter !== "all" || selectedCalendarDate;

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Categories");
    setStateFilter("All States");
    setDateFilter("all");
    setSelectedCalendarDate(undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">
            Events
          </h1>
          <p className="text-muted-foreground">
            Discover and register for APC events happening across Nigeria
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            data-testid="button-view-calendar"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-events"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} data-testid={`option-category-${cat}`}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger data-testid="select-state">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All States" data-testid="option-state-all">
                  All States
                </SelectItem>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.name} data-testid={`option-state-${state.id}`}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger data-testid="select-date-range">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value} data-testid={`option-date-${filter.value}`}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {viewMode === "list" ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
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
                  <Card>
                    <CardContent className="text-center py-12">
                      <p className="text-muted-foreground">
                        {hasActiveFilters 
                          ? "No upcoming events match your filters." 
                          : "No upcoming events at the moment."}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          onClick={clearFilters}
                          className="mt-4"
                          data-testid="button-clear-filters-empty"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </CardContent>
                  </Card>
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
                        maxAttendees={event.maxAttendees ?? undefined}
                        attendees={0}
                        imageUrl={event.imageUrl ?? undefined}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-6">
                {pastEvents.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <p className="text-muted-foreground">
                        {hasActiveFilters 
                          ? "No past events match your filters." 
                          : "No past events."}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          onClick={clearFilters}
                          className="mt-4"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </CardContent>
                  </Card>
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
                        maxAttendees={event.maxAttendees ?? undefined}
                        attendees={0}
                        imageUrl={event.imageUrl ?? undefined}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            key="calendar-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-6 lg:grid-cols-[1fr_400px]"
          >
            <Card>
              <CardHeader>
                <CardTitle>Event Calendar</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={setSelectedCalendarDate}
                  modifiers={{
                    hasEvent: eventsWithDates,
                  }}
                  modifiersClassNames={{
                    hasEvent: "bg-primary/20 font-bold",
                  }}
                  className="rounded-md border"
                  data-testid="calendar-events"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {selectedCalendarDate 
                      ? format(selectedCalendarDate, "PPP") 
                      : "Select a date"}
                  </span>
                  {selectedCalendarDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCalendarDate(undefined)}
                      data-testid="button-clear-date"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCalendarDate ? (
                  filteredEvents.length > 0 ? (
                    <div className="space-y-3">
                      {filteredEvents.map((event) => (
                        <Card key={event.id} className="hover-elevate" data-testid={`calendar-event-${event.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Badge variant="secondary">{event.category}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(event.date), "p")}
                              </span>
                            </div>
                            <h4 className="font-semibold mb-1">{event.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {event.description}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No events on this date
                    </p>
                  )
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Select a date to view events
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
