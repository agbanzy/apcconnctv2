import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/stats-card";
import { NewsCard } from "@/components/news-card";
import { EventCard } from "@/components/event-card";
import { MicroTaskCard } from "@/components/micro-task-card";
import { 
  Users, 
  Vote, 
  Calendar, 
  Trophy,
  Award,
  CheckSquare,
  TrendingUp,
  Target,
  Heart,
  Briefcase,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import apcLogo from "@assets/logo_1760719840683.png";
import type { NewsPost, Event, MicroTask } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();

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

  const { data: memberProfile } = useQuery({
    queryKey: ["/api/members/me"],
    retry: false,
  });

  const { data: userPoints } = useQuery({
    queryKey: ["/api/members/points"],
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
  const member = memberProfile?.data;
  const points = userPoints?.data?.totalPoints || 0;
  const news = newsData?.data?.slice(0, 3) || [];
  const allEvents = eventsData?.data || [];
  const now = new Date();
  const upcomingEvents = allEvents.filter(e => new Date(e.date) > now).slice(0, 3);
  const tasks = tasksData?.data?.slice(0, 3) || [];

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <img src={apcLogo} alt="APC" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold" data-testid="text-welcome-message">
                  {getGreeting()}, {user?.username || 'Member'}!
                </h1>
                <p className="text-muted-foreground mt-1">
                  Welcome to APC Connect - Your political engagement hub
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Your Points</p>
                <p className="font-bold text-2xl text-primary">{points}</p>
              </div>
              <Trophy className="h-10 w-10 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump into key activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/elections">
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 py-4 w-full hover-elevate"
                data-testid="button-quick-vote"
              >
                <Vote className="h-6 w-6 text-primary" />
                <span className="text-sm">Vote</span>
              </Button>
            </Link>
            <Link href="/events">
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 py-4 w-full hover-elevate"
                data-testid="button-quick-events"
              >
                <Calendar className="h-6 w-6 text-primary" />
                <span className="text-sm">Events</span>
              </Button>
            </Link>
            <Link href="/tasks">
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 py-4 w-full hover-elevate"
                data-testid="button-quick-tasks"
              >
                <CheckSquare className="h-6 w-6 text-primary" />
                <span className="text-sm">Tasks</span>
              </Button>
            </Link>
            <Link href="/donations">
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 py-4 w-full hover-elevate"
                data-testid="button-quick-donate"
              >
                <Heart className="h-6 w-6 text-primary" />
                <span className="text-sm">Donate</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Your Stats */}
      <div>
        <h2 className="font-display text-xl font-bold mb-4">Your Activity</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-elevate">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Points Earned</p>
                  <p className="text-2xl font-bold">{points}</p>
                </div>
                <Award className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasks Completed</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Events Attended</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Member Status</p>
                  <Badge className="mt-1">{member?.status || 'Active'}</Badge>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Overview */}
      <div>
        <h2 className="font-display text-xl font-bold mb-4">Platform Statistics</h2>
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
              icon={TrendingUp}
            />
            <StatsCard
              title="Upcoming Events"
              value={overview?.totalEvents?.toString() || "0"}
              change={0}
              icon={Calendar}
            />
            <StatsCard
              title="Votes Cast"
              value={overview?.totalVotes?.toString() || "0"}
              change={0}
              icon={Vote}
            />
          </div>
        )}
      </div>

      {/* Quick Tasks Section */}
      {tasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Available Tasks</h2>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" data-testid="button-view-all-tasks">
                View All →
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {tasks.map((task) => (
              <MicroTaskCard key={task.id} {...task} />
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout for News and Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest News */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Latest News</h2>
            <Link href="/news">
              <Button variant="ghost" size="sm" data-testid="button-view-all-news">
                View All →
              </Button>
            </Link>
          </div>
          {isLoadingNews ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-4">
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
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No news available
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Upcoming Events</h2>
            <Link href="/events">
              <Button variant="ghost" size="sm" data-testid="button-view-all-events">
                View All →
              </Button>
            </Link>
          </div>
          {isLoadingEvents ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-4">
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
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No upcoming events
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Call to Action */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-display text-xl font-bold mb-2">
                Ready to make a difference?
              </h3>
              <p className="opacity-90">
                Explore volunteer opportunities, join campaigns, and contribute to Nigeria's future.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/volunteer">
                <Button variant="secondary" data-testid="button-volunteer">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Volunteer
                </Button>
              </Link>
              <Link href="/campaigns">
                <Button variant="secondary" data-testid="button-campaigns">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  View Campaigns
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
