import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Award } from "lucide-react";

interface VolunteerTaskCardProps {
  id: string;
  title: string;
  description: string;
  location: string;
  skills: string[];
  points: number;
  deadline?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  onApply?: () => void;
}

export function VolunteerTaskCard({
  id,
  title,
  description,
  location,
  skills,
  points,
  deadline,
  difficulty,
  onApply,
}: VolunteerTaskCardProps) {
  const difficultyColors = {
    Easy: "bg-chart-1 text-white",
    Medium: "bg-chart-4 text-white",
    Hard: "bg-chart-3 text-white",
  };

  return (
    <Card className="hover-elevate transition-all" data-testid="card-volunteer-task">
      <CardHeader className="gap-2 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <Badge className={difficultyColors[difficulty]} data-testid="badge-difficulty">
            {difficulty}
          </Badge>
          <div className="flex items-center gap-1 text-primary">
            <Award className="h-4 w-4" />
            <span className="font-mono font-semibold" data-testid="text-points">{points} pts</span>
          </div>
        </div>
        <CardTitle className="mt-2" data-testid="text-task-title">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-task-description">
          {description}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span data-testid="text-task-location">{location}</span>
        </div>
        {deadline && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span data-testid="text-task-deadline">Due: {deadline}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, idx) => (
            <Badge key={idx} variant="outline" data-testid={`badge-skill-${idx}`}>
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        {onApply && (
          <Button variant="default" className="w-full" onClick={onApply} data-testid="button-apply-task">
            Apply for Task
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
