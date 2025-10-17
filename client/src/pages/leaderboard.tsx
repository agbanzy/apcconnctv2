import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { LeaderboardItem } from "@/components/leaderboard-item";
import { BadgeDisplay } from "@/components/badge-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Award, Medal } from "lucide-react";

export default function Leaderboard() {
  const { member } = useAuth();

  const { data: leaderboardData, isLoading: isLoadingLeaderboard } = useQuery<{
    success: boolean;
    data: Array<{
      memberId: string;
      totalPoints: number;
      member: any;
      user: any;
    }>;
  }>({
    queryKey: ["/api/gamification/leaderboard"],
  });

  const { data: myStatsData, isLoading: isLoadingStats } = useQuery<{
    success: boolean;
    data: {
      totalPoints: number;
      badges: Array<{
        id: string;
        name: string;
        description: string;
        icon: string;
      }>;
    };
  }>({
    queryKey: ["/api/gamification/my-stats"],
    enabled: !!member,
  });

  const { data: badgesData } = useQuery<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
    }>;
  }>({
    queryKey: ["/api/gamification/badges"],
  });

  if (isLoadingLeaderboard || isLoadingStats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const leaderboard = leaderboardData?.data || [];
  const myStats = myStatsData?.data;
  const allBadges = badgesData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Leaderboard & Achievements</h1>
        <p className="text-muted-foreground">
          Track your progress and compete with other members
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Your Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono" data-testid="text-my-points">
              {myStats?.totalPoints || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Keep engaging to earn more!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-primary" />
              Your Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono" data-testid="text-my-rank">
              #{leaderboard.findIndex((l) => l.memberId === member?.id) + 1 || "N/A"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Out of {leaderboard.length} members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Badges Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono" data-testid="text-badges-count">
              {myStats?.badges?.length || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {allBadges.length} total available
            </p>
          </CardContent>
        </Card>
      </div>

      {myStats?.badges && myStats.badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {myStats.badges.map((badge) => (
                <BadgeDisplay
                  key={badge.id}
                  name={badge.name}
                  description={badge.description}
                  icon={badge.icon}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Top Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <LeaderboardItem
                key={entry.memberId}
                rank={index + 1}
                name={`${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim() || "Unknown"}
                points={entry.totalPoints || 0}
                avatar=""
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
