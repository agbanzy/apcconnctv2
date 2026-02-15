import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Clock, MapPin, Users } from "lucide-react";

interface MicroTaskCardProps {
  id: string;
  title: string;
  description: string;
  points: number;
  timeEstimate: string;
  category: string;
  completed?: boolean;
  onComplete?: () => void;
  taskCategory?: string;
  taskScope?: string;
  stateName?: string;
  lgaName?: string;
  wardName?: string;
  maxCompletionsTotal?: number | null;
  currentCompletions?: number;
  expiresAt?: string | null;
}

function formatTaskCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getScopeBadge(taskScope?: string, stateName?: string, lgaName?: string, wardName?: string) {
  if (!taskScope) return null;
  switch (taskScope) {
    case "national":
      return <Badge variant="default" data-testid="badge-task-scope">National</Badge>;
    case "state":
      return <Badge variant="outline" data-testid="badge-task-scope">{stateName || "State"}</Badge>;
    case "lga":
      return <Badge variant="outline" data-testid="badge-task-scope">{lgaName || "LGA"}</Badge>;
    case "ward":
      return <Badge variant="outline" data-testid="badge-task-scope">{wardName || "Ward"}</Badge>;
    default:
      return null;
  }
}

export function MicroTaskCard({
  id,
  title,
  description,
  points,
  timeEstimate,
  category,
  completed = false,
  onComplete,
  taskCategory,
  taskScope,
  stateName,
  lgaName,
  wardName,
  maxCompletionsTotal,
  currentCompletions = 0,
  expiresAt,
}: MicroTaskCardProps) {
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <Card
      className={`hover-elevate transition-all ${completed ? "opacity-60" : ""}`}
      data-testid="card-micro-task"
    >
      <CardHeader className="gap-2 space-y-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" data-testid="badge-category">{category}</Badge>
            {taskCategory && (
              <Badge variant="outline" data-testid="badge-task-category">
                {formatTaskCategory(taskCategory)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-primary">
            <Award className="h-4 w-4" />
            <span className="font-mono font-semibold" data-testid="text-points">+{points} pts</span>
          </div>
        </div>
        {taskScope && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {getScopeBadge(taskScope, stateName, lgaName, wardName)}
          </div>
        )}
        <CardTitle className="mt-2" data-testid="text-task-title">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground" data-testid="text-task-description">
          {description}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span data-testid="text-time-estimate">{timeEstimate}</span>
        </div>
        {maxCompletionsTotal != null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-completions">
            <Users className="h-4 w-4" />
            <span>{currentCompletions}/{maxCompletionsTotal} completed</span>
          </div>
        )}
        {expiresAt && (
          <div className="text-sm" data-testid="text-expires">
            {isExpired ? (
              <span className="text-destructive font-medium">Expired</span>
            ) : (
              <span className="text-muted-foreground">
                Expires: {new Date(expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {completed ? (
          <Button variant="secondary" className="w-full" disabled data-testid="button-completed">
            Completed
          </Button>
        ) : (
          <Button className="w-full" data-testid="button-start-task" onClick={onComplete}>
            Start Task
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
