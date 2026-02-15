import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/stats-card";
import { NewsCard } from "@/components/news-card";
import { EventCard } from "@/components/event-card";
import { MicroTaskCard } from "@/components/micro-task-card";
import { NigeriaMap } from "@/components/nigeria-map";
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
  Lightbulb,
  Coins,
  ShoppingCart,
  Gift,
  ArrowRight,
  Crown,
  Medal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  const { data: memberProfile } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/members/me"],
    retry: false,
  });

  const memberId = memberProfile?.data?.id;

  const { data: balanceData } = useQuery<{
    success: boolean;
    balance: number;
  }>({
    queryKey: ["/api/points/balance", memberId],
    enabled: !!memberId,
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
    queryKey: ["/api/tasks/micro"],
    retry: false,
  });

  const { data: memberOverviewData } = useQuery<{
    success: boolean;
    data: {
      points: number;
      badges: number;
      eventsAttended: number;
      tasksCompleted: number;
      rank: number;
      totalMembers: number;
    };
  }>({
    queryKey: ["/api/analytics/member-overview"],
    enabled: !!memberId,
    retry: false,
  });

  const { data: transactionsData } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ["/api/points/transactions", memberId, { limit: 3, offset: 0 }],
    enabled: !!memberId,
    retry: false,
  });

  const { data: leaderboardData } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ["/api/leaderboards/national", { limit: 5, offset: 0 }],
    retry: false,
  });

  const { data: myRankData } = useQuery<{
    success: boolean;
    data: {
      nationalRank: number;
      nationalTotal: number;
      totalPoints: number;
    };
  }>({
    queryKey: ["/api/leaderboards/my-rank"],
    enabled: !!memberId,
    retry: false,
  });

  const { data: referralCodeData } = useQuery<{
    success: boolean;
    data: {
      referralCode: string;
    };
  }>({
    queryKey: ["/api/referrals/my-code"],
    enabled: !!memberId,
    retry: false,
  });

  const { data: referralStatsData } = useQuery<{
    success: boolean;
    data: {
      totalReferrals: number;
      totalPointsEarned: number;
    };
  }>({
    queryKey: ["/api/referrals/stats"],
    enabled: !!memberId,
    retry: false,
  });

  const overview = overviewData?.data;
  const member = memberProfile?.data;
  const points = balanceData?.balance || 0;
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
                  {getGreeting()}, {user?.firstName || 'Member'}!
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
                  <p className="text-2xl font-bold" data-testid="text-tasks-completed">{memberOverviewData?.data?.tasksCompleted || 0}</p>
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
                  <p className="text-2xl font-bold" data-testid="text-events-attended">{memberOverviewData?.data?.eventsAttended || 0}</p>
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

      {/* Gamification Widgets Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Points & Transactions Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Points</CardTitle>
                <CardDescription>Recent activity and balance</CardDescription>
              </div>
              <Coins className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
              <p className="font-display text-4xl font-bold text-primary" data-testid="text-home-points-balance">
                {points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">points</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Recent Transactions</p>
              {transactionsData?.data && transactionsData.data.length > 0 ? (
                <div className="space-y-2">
                  {transactionsData.data.slice(0, 3).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{txn.source || txn.type}</p>
                        <p className="text-xs text-muted-foreground">{new Date(txn.createdAt).toLocaleDateString()}</p>
                      </div>
                      <p className={`font-mono font-semibold ${txn.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'earn' ? '+' : '-'}{txn.amount}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent transactions</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link href="/purchase-points">
                <Button variant="default" size="sm" className="w-full" data-testid="button-home-purchase-points">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Buy Points
                </Button>
              </Link>
              <Link href="/points">
                <Button variant="outline" size="sm" className="w-full" data-testid="button-home-view-all-points">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Preview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>Top members nationwide</CardDescription>
              </div>
              <Trophy className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {myRankData?.data && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Rank</p>
                    <p className="font-display text-2xl font-bold text-primary">
                      #{myRankData.data.nationalRank}
                    </p>
                    <p className="text-xs text-muted-foreground">of {myRankData.data.nationalTotal}</p>
                  </div>
                  <Trophy className="h-10 w-10 text-primary/50" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold">Top Members</p>
              {leaderboardData?.data && leaderboardData.data.length > 0 ? (
                <div className="space-y-2">
                  {leaderboardData.data.slice(0, 5).map((entry, index) => {
                    const userName = `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim() || "Unknown";
                    return (
                      <div key={entry.member?.id || index} className="flex items-center gap-3 p-2 rounded border">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                          {index === 0 ? <Crown className="h-4 w-4 text-yellow-500" /> : 
                           index === 1 ? <Medal className="h-4 w-4 text-gray-400" /> :
                           index === 2 ? <Medal className="h-4 w-4 text-amber-600" /> :
                           `#${index + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{userName}</p>
                        </div>
                        <p className="text-sm font-mono font-semibold text-primary">
                          {entry.totalPoints?.toLocaleString() || 0}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No leaderboard data</p>
              )}
            </div>

            <Link href="/leaderboard">
              <Button variant="outline" size="sm" className="w-full" data-testid="button-home-view-leaderboard">
                View Full Leaderboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Referral CTA Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
                <Gift className="h-7 w-7 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">Earn 100 Points Per Referral!</h3>
                <p className="text-muted-foreground">
                  Invite friends to join APC Connect
                  {referralCodeData?.data?.referralCode && (
                    <span className="ml-2 font-mono font-semibold text-primary">
                      Code: {referralCodeData.data.referralCode}
                    </span>
                  )}
                </p>
                {referralStatsData?.data && referralStatsData.data.totalReferrals > 0 && (
                  <p className="text-sm mt-1">
                    <span className="font-semibold text-green-600 dark:text-green-500">
                      {referralStatsData.data.totalReferrals}
                    </span>{" "}
                    referrals earned you{" "}
                    <span className="font-semibold text-green-600 dark:text-green-500">
                      {referralStatsData.data.totalPointsEarned} points
                    </span>
                  </p>
                )}
              </div>
            </div>
            <Link href="/referrals">
              <Button variant="default" className="bg-green-600 hover:bg-green-700" data-testid="button-home-refer-friends">
                Refer Friends
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

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

      {/* National Overview Map */}
      <Card>
        <CardHeader>
          <CardTitle>APC Presence Nationwide</CardTitle>
          <CardDescription>Interactive map showing party presence across Nigeria</CardDescription>
        </CardHeader>
        <CardContent>
          <NigeriaMap mode="members" showLegend={true} />
        </CardContent>
      </Card>

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
                  maxAttendees={event.maxAttendees ?? undefined}
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
