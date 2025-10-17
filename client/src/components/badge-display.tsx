import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Shield, Trophy, Star, Target, Zap } from "lucide-react";

const badgeIcons = {
  grassroots: Award,
  voter: Shield,
  champion: Trophy,
  activist: Star,
  organizer: Target,
  pioneer: Zap,
};

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof badgeIcons;
  earned: boolean;
  earnedDate?: string;
}

interface BadgeDisplayProps {
  badges: BadgeItem[];
  totalPoints: number;
}

export function BadgeDisplay({ badges, totalPoints }: BadgeDisplayProps) {
  const earnedBadges = badges.filter((b) => b.earned);
  
  return (
    <Card data-testid="card-badges">
      <CardHeader className="gap-2 space-y-0">
        <div className="flex items-center justify-between">
          <CardTitle>Achievements</CardTitle>
          <Badge variant="secondary" data-testid="badge-count">
            {earnedBadges.length} / {badges.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Total Points: <span className="font-mono font-bold text-primary" data-testid="text-total-points">{totalPoints}</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const Icon = badgeIcons[badge.icon];
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${
                  badge.earned
                    ? "bg-primary/10 border-primary"
                    : "bg-muted/50 border-border opacity-50"
                }`}
                data-testid={`badge-${badge.id}`}
              >
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    badge.earned ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-sm text-center" data-testid={`text-badge-name-${badge.id}`}>
                  {badge.name}
                </h4>
                <p className="text-xs text-muted-foreground text-center line-clamp-2">
                  {badge.description}
                </p>
                {badge.earned && badge.earnedDate && (
                  <p className="text-xs text-primary font-mono" data-testid={`text-earned-date-${badge.id}`}>
                    {badge.earnedDate}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
