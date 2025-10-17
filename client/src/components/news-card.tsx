import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, ThumbsUp, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NewsCardProps {
  title: string;
  excerpt: string;
  category: string;
  timestamp: Date;
  imageUrl?: string;
  likes: number;
  comments: number;
}

export function NewsCard({
  title,
  excerpt,
  category,
  timestamp,
  imageUrl,
  likes,
  comments,
}: NewsCardProps) {
  return (
    <Card className="hover-elevate transition-all" data-testid="card-news">
      {imageUrl && (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            data-testid="img-news-thumbnail"
          />
        </div>
      )}
      <CardHeader className="gap-2 space-y-0">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" data-testid="badge-category">{category}</Badge>
          <span className="text-xs text-muted-foreground" data-testid="text-timestamp">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
        </div>
        <h3 className="font-display text-lg font-semibold leading-tight" data-testid="text-news-title">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-news-excerpt">{excerpt}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button className="flex items-center gap-1 hover-elevate p-1 rounded" data-testid="button-like">
            <ThumbsUp className="h-4 w-4" />
            <span data-testid="text-likes-count">{likes}</span>
          </button>
          <button className="flex items-center gap-1 hover-elevate p-1 rounded" data-testid="button-comment">
            <MessageCircle className="h-4 w-4" />
            <span data-testid="text-comments-count">{comments}</span>
          </button>
        </div>
        <Button variant="ghost" size="sm" data-testid="button-share">
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </CardFooter>
    </Card>
  );
}
