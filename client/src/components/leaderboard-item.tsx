import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardItemProps {
  rank: number;
  name: string;
  points: number;
  ward: string;
  isCurrentUser?: boolean;
}

export function LeaderboardItem({ rank, name, points, ward, isCurrentUser }: LeaderboardItemProps) {
  const getRankIcon = () => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  return (
    <Card
      className={`p-4 hover-elevate transition-all ${
        isCurrentUser ? "border-primary border-2" : ""
      }`}
      data-testid={`leaderboard-item-${rank}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12">
          {getRankIcon() || (
            <span className="font-display text-2xl font-bold text-muted-foreground" data-testid="text-rank">
              {rank}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold" data-testid="text-member-name">{name}</h4>
            {isCurrentUser && (
              <Badge variant="secondary" data-testid="badge-current-user">You</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-ward">{ward}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl font-bold text-primary tabular-nums" data-testid="text-points">
            {points.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">points</p>
        </div>
      </div>
    </Card>
  );
}
