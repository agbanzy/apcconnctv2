import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  X,
  Share2,
  ChevronLeft,
  ChevronRight,
  Download
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event } from "@shared/schema";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function EventsGallery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: eventsData, isLoading } = useQuery<{
    success: boolean;
    data: Event[];
  }>({
    queryKey: ["/api/events"],
  });

  const events = eventsData?.data || [];

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || event.category === categoryFilter;
    const matchesLocation = locationFilter === "all" || event.location.includes(locationFilter);
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Extract unique categories and locations
  const categories = Array.from(new Set(events.map(e => e.category)));
  const locations = Array.from(new Set(events.map(e => e.location.split(",")[0].trim())));

  const handleShare = () => {
    if (navigator.share && selectedEvent) {
      navigator.share({
        title: selectedEvent.title,
        text: `Check out this APC event: ${selectedEvent.title}`,
        url: window.location.href,
      });
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % 1); // Would cycle through multiple images if available
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + 1) % 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-12 bg-gradient-to-br from-primary/10 via-background to-background border-b">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge className="mb-4 text-base px-6 py-2" data-testid="badge-gallery">
              Events Gallery
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4" data-testid="text-page-title">
              Capturing APC Moments
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Explore our vibrant collection of rallies, town halls, training sessions, and community events across Nigeria
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="py-6 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-location">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchQuery || categoryFilter !== "all" || locationFilter !== "all") && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setLocationFilter("all");
                }}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {(categoryFilter !== "all" || locationFilter !== "all") && (
            <div className="flex flex-wrap gap-2 mt-4">
              {categoryFilter !== "all" && (
                <Badge variant="secondary" data-testid="badge-active-category">
                  Category: {categoryFilter}
                </Badge>
              )}
              {locationFilter !== "all" && (
                <Badge variant="secondary" data-testid="badge-active-location">
                  Location: {locationFilter}
                </Badge>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  variants={fadeIn}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  onClick={() => setSelectedEvent(event)}
                  className="cursor-pointer"
                  data-testid={`card-event-${index}`}
                >
                  <Card className="h-full overflow-hidden hover-elevate group">
                    {/* Event Image */}
                    <div className="relative h-56 bg-muted overflow-hidden">
                      {event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          data-testid={`image-event-${event.id}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <Calendar className="h-16 w-16 text-primary/40" />
                        </div>
                      )}
                      
                      {/* Category Badge */}
                      <Badge className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm">
                        {event.category}
                      </Badge>
                    </div>

                    {/* Event Details */}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg line-clamp-2 mb-3 leading-tight" data-testid={`text-event-title-${index}`}>
                        {event.title}
                      </h3>
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0 text-primary" />
                          <span>{new Date(event.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        
                        {event.maxAttendees && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 flex-shrink-0 text-primary" />
                            <span>Up to {event.maxAttendees} attendees</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Filter className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or search query
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setLocationFilter("all");
                }}
                data-testid="button-reset-filters"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-event-details">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl md:text-3xl pr-8" data-testid="text-modal-title">
                  {selectedEvent.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Image Carousel */}
                <div className="relative">
                  <div className="relative h-96 bg-muted rounded-lg overflow-hidden">
                    {selectedEvent.imageUrl ? (
                      <img
                        src={selectedEvent.imageUrl}
                        alt={selectedEvent.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="h-24 w-24 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Navigation Arrows (if multiple images) */}
                  {/* Placeholder for future multi-image support */}
                </div>

                {/* Event Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Category</h4>
                      <Badge variant="outline" className="text-base">{selectedEvent.category}</Badge>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Date & Time</h4>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span className="text-lg">
                          {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Location</h4>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="text-lg">{selectedEvent.location}</span>
                      </div>
                    </div>

                    {selectedEvent.maxAttendees && (
                      <div>
                        <h4 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Attendance</h4>
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          <span className="text-lg">Up to {selectedEvent.maxAttendees} attendees</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Description</h4>
                    <p className="text-muted-foreground leading-relaxed text-base">
                      {selectedEvent.description}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <Button onClick={handleShare} variant="outline" data-testid="button-share">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Event
                  </Button>
                  <Button variant="outline" data-testid="button-download">
                    <Download className="h-4 w-4 mr-2" />
                    Download Image
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
