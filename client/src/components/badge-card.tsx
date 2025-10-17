import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Award, Trophy, Star, Shield, CheckCircle, Zap, Heart, GraduationCap, Calendar, Megaphone, Lightbulb, Brain } from "lucide-react";
import { format } from "date-fns";

const iconMap: Record<string, any> = {
  star: Star,
  "check-square": CheckCircle,
  brain: Brain,
  calendar: Calendar,
  megaphone: Megaphone,
  lightbulb: Lightbulb,
  trophy: Trophy,
  heart: Heart,
  zap: Zap,
  "graduation-cap": GraduationCap,
  award: Award,
  shield: Shield,
};

interface BadgeCardProps {
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    imageUrl?: string | null;
    category?: string;
    points: number;
    criteria: { type: string; value: number };
  };
  earned?: boolean;
  earnedAt?: Date | string | null;
  progress?: number;
  className?: string;
}

export function BadgeCard({ badge, earned = false, earnedAt, progress = 0, className = "" }: BadgeCardProps) {
  const Icon = iconMap[badge.icon] || Award;
  const progressPercentage = badge.criteria.value > 0 ? (progress / badge.criteria.value) * 100 : 0;
  const isInProgress = !earned && progress > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={`relative transition-all ${
              earned 
                ? "border-primary bg-primary/5 hover-elevate" 
                : isInProgress
                ? "border-muted-foreground/30 hover-elevate"
                : "opacity-60 border-muted"
            } ${className}`}
            data-testid={`badge-card-${badge.id}`}
          >
            {!earned && (
              <div className="absolute top-2 right-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-center justify-center mb-2">
                <div 
                  className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    earned 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`badge-icon-${badge.id}`}
                >
                  <Icon className="h-8 w-8" />
                </div>
              </div>
              
              <CardTitle className="text-center text-base" data-testid={`badge-name-${badge.id}`}>
                {badge.name}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground text-center line-clamp-2">
                {badge.description}
              </p>
              
              {badge.points > 0 && (
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-3 w-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    +{badge.points} pts
                  </span>
                </div>
              )}
              
              {isInProgress && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">
                      {progress}/{badge.criteria.value}
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              )}
              
              {earned && earnedAt && (
                <div className="flex items-center justify-center">
                  <Badge variant="secondary" className="text-xs">
                    Earned {format(new Date(earnedAt), "MMM d, yyyy")}
                  </Badge>
                </div>
              )}
              
              {!earned && !isInProgress && (
                <p className="text-xs text-center text-muted-foreground">
                  {badge.criteria.type === "tasks_completed" && `Complete ${badge.criteria.value} tasks`}
                  {badge.criteria.type === "quizzes_completed" && `Complete ${badge.criteria.value} quizzes`}
                  {badge.criteria.type === "events_attended" && `Attend ${badge.criteria.value} events`}
                  {badge.criteria.type === "campaigns_supported" && `Support ${badge.criteria.value} campaigns`}
                  {badge.criteria.type === "ideas_submitted" && `Submit ${badge.criteria.value} ideas`}
                  {badge.criteria.type === "total_points" && `Reach ${badge.criteria.value} points`}
                  {badge.criteria.type === "joined" && "Join APC Connect"}
                </p>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{badge.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
