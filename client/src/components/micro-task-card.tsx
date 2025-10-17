import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Clock } from "lucide-react";

interface MicroTaskCardProps {
  title: string;
  description: string;
  points: number;
  timeEstimate: string;
  category: string;
  completed?: boolean;
}

export function MicroTaskCard({
  title,
  description,
  points,
  timeEstimate,
  category,
  completed = false,
}: MicroTaskCardProps) {
  return (
    <Card
      className={`hover-elevate transition-all ${completed ? "opacity-60" : ""}`}
      data-testid="card-micro-task"
    >
      <CardHeader className="gap-2 space-y-0">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" data-testid="badge-category">{category}</Badge>
          <div className="flex items-center gap-1 text-primary">
            <Award className="h-4 w-4" />
            <span className="font-mono font-semibold" data-testid="text-points">+{points} pts</span>
          </div>
        </div>
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
      </CardContent>
      <CardFooter>
        {completed ? (
          <Button variant="secondary" className="w-full" disabled data-testid="button-completed">
            Completed ✓
          </Button>
        ) : (
          <Button className="w-full" data-testid="button-start-task">
            Start Task
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
