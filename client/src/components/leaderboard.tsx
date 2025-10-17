import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface LeaderboardEntry {
  memberId: string;
  totalPoints: number;
  member: {
    id: string;
    memberId: string;
  };
  user: {
    firstName: string;
    lastName: string;
  };
  badgeCount?: number;
  trend?: "up" | "down" | "same";
}

interface LeaderboardProps {
  data: LeaderboardEntry[];
  currentUserId?: string;
  title?: string;
  showPodium?: boolean;
  className?: string;
}

export function Leaderboard({ 
  data = [], 
  currentUserId, 
  title = "Leaderboard",
  showPodium = true,
  className = "" 
}: LeaderboardProps) {
  const top3 = showPodium ? data.slice(0, 3) : [];
  const rest = showPodium ? data.slice(3) : data;

  const getPodiumIcon = (rank: number) => {
    switch(rank) {
      case 1: return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2: return <Medal className="h-6 w-6 text-slate-400" />;
      case 3: return <Award className="h-6 w-6 text-amber-700" />;
      default: return null;
    }
  };

  const getTrendIcon = (trend?: "up" | "down" | "same") => {
    switch(trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "same": return <Minus className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <Card className={className} data-testid="leaderboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {showPodium && top3.length > 0 && (
          <div className="flex items-end justify-center gap-4 pb-6">
            {top3[1] && (
              <div className="flex flex-col items-center gap-2" data-testid="podium-2">
                <Avatar className="h-16 w-16 border-4 border-slate-400">
                  <AvatarFallback className="bg-slate-100 dark:bg-slate-900 text-lg font-bold">
                    {top3[1].user.firstName[0]}{top3[1].user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-semibold text-sm">
                    {top3[1].user.firstName} {top3[1].user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {top3[1].totalPoints.toLocaleString()} pts
                  </p>
                </div>
                <div className="h-20 w-20 bg-slate-100 dark:bg-slate-900 rounded-t-lg flex items-center justify-center border-t-4 border-slate-400">
                  <Medal className="h-8 w-8 text-slate-400" />
                </div>
              </div>
            )}

            {top3[0] && (
              <div className="flex flex-col items-center gap-2" data-testid="podium-1">
                <Avatar className="h-20 w-20 border-4 border-yellow-500">
                  <AvatarFallback className="bg-yellow-100 dark:bg-yellow-950 text-xl font-bold">
                    {top3[0].user.firstName[0]}{top3[0].user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-semibold">
                    {top3[0].user.firstName} {top3[0].user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {top3[0].totalPoints.toLocaleString()} pts
                  </p>
                </div>
                <div className="h-28 w-20 bg-yellow-100 dark:bg-yellow-950 rounded-t-lg flex items-center justify-center border-t-4 border-yellow-500">
                  <Trophy className="h-10 w-10 text-yellow-500" />
                </div>
              </div>
            )}

            {top3[2] && (
              <div className="flex flex-col items-center gap-2" data-testid="podium-3">
                <Avatar className="h-16 w-16 border-4 border-amber-700">
                  <AvatarFallback className="bg-amber-100 dark:bg-amber-950 text-lg font-bold">
                    {top3[2].user.firstName[0]}{top3[2].user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-semibold text-sm">
                    {top3[2].user.firstName} {top3[2].user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {top3[2].totalPoints.toLocaleString()} pts
                  </p>
                </div>
                <div className="h-16 w-20 bg-amber-100 dark:bg-amber-950 rounded-t-lg flex items-center justify-center border-t-4 border-amber-700">
                  <Award className="h-8 w-8 text-amber-700" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {rest.map((entry, index) => {
            const rank = showPodium ? index + 4 : index + 1;
            const isCurrentUser = currentUserId && entry.member?.id === currentUserId;

            return (
              <div
                key={entry.memberId}
                className={`flex items-center gap-3 p-3 rounded-lg hover-elevate ${
                  isCurrentUser ? "bg-primary/10 border-2 border-primary" : "bg-muted/30"
                }`}
                data-testid={`leaderboard-entry-${entry.memberId}`}
              >
                <div className="flex items-center justify-center w-8">
                  <span className="font-mono font-bold text-muted-foreground">
                    #{rank}
                  </span>
                </div>

                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {entry.user?.firstName?.[0]}{entry.user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {entry.user?.firstName} {entry.user?.lastName}
                    {isCurrentUser && (
                      <Badge variant="default" className="ml-2">You</Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {entry.totalPoints?.toLocaleString() || 0} points
                  </p>
                </div>

                {entry.badgeCount !== undefined && (
                  <div className="text-center">
                    <p className="text-sm font-semibold">{entry.badgeCount}</p>
                    <p className="text-xs text-muted-foreground">badges</p>
                  </div>
                )}

                {entry.trend && (
                  <div className="flex items-center justify-center w-8">
                    {getTrendIcon(entry.trend)}
                  </div>
                )}
              </div>
            );
          })}

          {data.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No leaderboard data available yet.</p>
              <p className="text-sm">Start earning points to appear here!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
