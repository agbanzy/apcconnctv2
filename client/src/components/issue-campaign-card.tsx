import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SocialShare } from "@/components/social-share";
import { ThumbsUp, MessageSquare } from "lucide-react";

interface IssueCampaignCardProps {
  id?: string;
  title: string;
  description: string;
  author: string;
  category: string;
  currentVotes?: number;
  votes?: number;
  targetVotes: number;
  comments?: number;
  status?: "active" | "approved" | "completed";
  onVote?: () => void;
}

export function IssueCampaignCard({
  id,
  title,
  description,
  author,
  category,
  currentVotes,
  votes,
  targetVotes,
  comments = 0,
  status = "active",
  onVote,
}: IssueCampaignCardProps) {
  const voteCount = currentVotes || votes || 0;
  const progress = (voteCount / targetVotes) * 100;
  
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
              {voteCount} / {targetVotes}
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-votes" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-votes-count">
            <ThumbsUp className="h-4 w-4" />
            <span>{voteCount}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-comments-count">
            <MessageSquare className="h-4 w-4" />
            <span>{comments}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onVote} data-testid="button-support">
            Support This
          </Button>
          {id && (
            <SocialShare
              title={title}
              description={`${description} - Help us reach ${targetVotes} supporters!`}
              url={`/campaigns/${id}`}
              variant="dropdown"
            />
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
