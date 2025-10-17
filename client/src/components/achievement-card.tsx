import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Medal, Crown, CheckCircle, Lock } from "lucide-react";

const rarityConfig = {
  bronze: {
    color: "text-amber-700 dark:text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: Award,
  },
  silver: {
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/30",
    border: "border-slate-200 dark:border-slate-800",
    icon: Medal,
  },
  gold: {
    color: "text-yellow-600 dark:text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: Trophy,
  },
  platinum: {
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    icon: Crown,
  },
};

interface AchievementCardProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    requirement: { type: string; value: number };
    category: string;
    points: number;
    rarity: "bronze" | "silver" | "gold" | "platinum";
  };
  progress?: number;
  completed?: boolean;
  completedAt?: Date | string | null;
  className?: string;
}

export function AchievementCard({ 
  achievement, 
  progress = 0, 
  completed = false, 
  completedAt,
  className = "" 
}: AchievementCardProps) {
  const rarity = rarityConfig[achievement.rarity];
  const RarityIcon = rarity.icon;
  const progressPercentage = achievement.requirement.value > 0 
    ? (progress / achievement.requirement.value) * 100 
    : 0;

  return (
    <Card 
      className={`relative ${rarity.border} ${
        completed ? rarity.bg : "opacity-75"
      } hover-elevate ${className}`}
      data-testid={`achievement-card-${achievement.id}`}
    >
      {completed && (
        <div className="absolute top-2 right-2">
          <CheckCircle className={`h-5 w-5 ${rarity.color}`} />
        </div>
      )}
      {!completed && (
        <div className="absolute top-2 right-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${rarity.bg}`}>
            <RarityIcon className={`h-6 w-6 ${rarity.color}`} />
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold" data-testid={`achievement-name-${achievement.id}`}>
                {achievement.name}
              </h3>
              <Badge 
                variant="outline" 
                className={`capitalize text-xs ${rarity.color} ${rarity.border}`}
              >
                {achievement.rarity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {achievement.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {achievement.requirement.type === "tasks_completed" && "Tasks Completed"}
            {achievement.requirement.type === "total_points" && "Total Points"}
            {achievement.requirement.type === "quizzes_completed" && "Quizzes Completed"}
            {achievement.requirement.type === "events_attended" && "Events Attended"}
            {achievement.requirement.type === "campaigns_supported" && "Campaigns Supported"}
            {achievement.requirement.type === "ideas_submitted" && "Ideas Submitted"}
          </span>
          <span className="font-mono font-semibold">
            {progress}/{achievement.requirement.value}
          </span>
        </div>

        <Progress value={progressPercentage} className="h-2" />

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              +{achievement.points} pts
            </span>
          </div>
          
          {completed && completedAt && (
            <span className="text-xs text-muted-foreground">
              Completed {new Date(completedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
