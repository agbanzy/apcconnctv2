import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThumbsUp, MessageSquare } from "lucide-react";

interface IssueCampaignCardProps {
  title: string;
  description: string;
  author: string;
  category: string;
  votes: number;
  targetVotes: number;
  comments: number;
  status: "active" | "approved" | "completed";
}

export function IssueCampaignCard({
  title,
  description,
  author,
  category,
  votes,
  targetVotes,
  comments,
  status,
}: IssueCampaignCardProps) {
  const progress = (votes / targetVotes) * 100;
  
  const statusColors = {
    active: "bg-chart-2 text-white",
    approved: "bg-chart-1 text-white",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="hover-elevate transition-all" data-testid="card-issue-campaign">
      <CardHeader className="gap-2 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" data-testid="badge-category">{category}</Badge>
          <Badge className={statusColors[status]} data-testid="badge-status">
            {status.toUpperCase()}
          </Badge>
        </div>
        <CardTitle className="mt-2" data-testid="text-campaign-title">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">by {author}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3" data-testid="text-campaign-description">
          {description}
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Support Progress</span>
            <span className="font-mono font-semibold" data-testid="text-vote-progress">
              {votes} / {targetVotes}
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-votes" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1" data-testid="text-votes-count">
            <ThumbsUp className="h-4 w-4" />
            <span>{votes}</span>
          </div>
          <div className="flex items-center gap-1" data-testid="text-comments-count">
            <MessageSquare className="h-4 w-4" />
            <span>{comments}</span>
          </div>
        </div>
        <Button size="sm" data-testid="button-support">
          Support This
        </Button>
      </CardFooter>
    </Card>
  );
}
