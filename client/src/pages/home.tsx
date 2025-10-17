import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/stats-card";
import { NewsCard } from "@/components/news-card";
import { EventCard } from "@/components/event-card";
import { MicroTaskCard } from "@/components/micro-task-card";
import { Users, Vote, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import heroImage from "@assets/generated_images/APC_youth_rally_hero_f3829ce8.png";
import type { NewsPost, Event, MicroTask } from "@shared/schema";

export default function Home() {
  const { data: overviewData, isLoading: isLoadingOverview } = useQuery<{
    success: boolean;
    data: {
      totalMembers: number;
      activeMembers: number;
      totalEvents: number;
      totalVotes: number;
    };
  }>({
    queryKey: ["/api/analytics/overview"],
    retry: false,
  });

  const { data: newsData, isLoading: isLoadingNews } = useQuery<{
    success: boolean;
    data: (NewsPost & { author: any })[];
  }>({
    queryKey: ["/api/news"],
  });

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery<{
    success: boolean;
    data: Event[];
  }>({
    queryKey: ["/api/events"],
  });

  const { data: tasksData, isLoading: isLoadingTasks } = useQuery<{
    success: boolean;
    data: MicroTask[];
  }>({
    queryKey: ["/api/micro-tasks"],
    retry: false,
  });

  const overview = overviewData?.data;
  const news = newsData?.data?.slice(0, 5) || [];
  const allEvents = eventsData?.data || [];
  const now = new Date();
  const upcomingEvents = allEvents.filter(e => new Date(e.date) > now).slice(0, 3);
  const tasks = tasksData?.data?.slice(0, 2) || [];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div
        className="relative h-[50vh] rounded-lg overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.4)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="font-display text-4xl md:text-6xl font-black text-white mb-4" data-testid="text-hero-title">
            MODERNIZING NIGERIAN POLITICS
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl">
            Join APC Connect - The digital platform empowering youth, enabling transparent governance, and revolutionizing political engagement across Nigeria.
          </p>
          <div className="flex gap-4">
            <Button size="lg" variant="default" data-testid="button-get-started">
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20" data-testid="button-learn-more">
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Platform Overview</h2>
        {isLoadingOverview ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Members"
              value={overview?.totalMembers?.toString() || "0"}
              change={0}
              icon={Users}
            />
            <StatsCard
              title="Active Members"
              value={overview?.activeMembers?.toString() || "0"}
              change={0}
              icon={Users}
            />
            <StatsCard
              title="Upcoming Events"
              value={overview?.totalEvents?.toString() || "0"}
              change={0}
              icon={Calendar}
            />
            <StatsCard
              title="Votes Cast (Primaries)"
              value={overview?.totalVotes?.toString() || "0"}
              change={0}
              icon={Vote}
            />
          </div>
        )}
      </div>

      {/* Quick Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">Quick Tasks</h2>
          <Link href="/micro-tasks">
            <Button variant="ghost" size="sm" data-testid="button-view-all-tasks">
              View All
            </Button>
          </Link>
        </div>
        {isLoadingTasks ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : tasks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tasks.map((task) => (
              <MicroTaskCard key={task.id} {...task} />
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">No tasks available</p>
        )}
      </div>

      {/* News Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">Latest News</h2>
          <Link href="/news">
            <Button variant="ghost" size="sm" data-testid="button-view-all-news">
              View All
            </Button>
          </Link>
        </div>
        {isLoadingNews ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : news.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {news.map((post) => (
              <NewsCard
                key={post.id}
                id={post.id}
                title={post.title}
                excerpt={post.excerpt}
                category={post.category}
                timestamp={new Date(post.publishedAt || "")}
                imageUrl={post.imageUrl || undefined}
                likes={post.likes || 0}
                comments={post.comments || 0}
              />
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">No news available</p>
        )}
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">Upcoming Events</h2>
          <Link href="/events">
            <Button variant="ghost" size="sm" data-testid="button-view-all-events">
              View All
            </Button>
          </Link>
        </div>
        {isLoadingEvents ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : upcomingEvents.length > 0 ? (
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
        ) : (
          <p className="text-center py-8 text-muted-foreground">No upcoming events</p>
        )}
      </div>
    </div>
  );
}
