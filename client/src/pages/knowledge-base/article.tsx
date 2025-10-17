import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ChevronLeft, ThumbsUp, ThumbsDown, Eye, BookOpen } from "lucide-react";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  viewsCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
  category: {
    name: string;
  };
}

export default function ArticlePage() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: articleData, isLoading } = useQuery<{ success: boolean; data: Article }>({
    queryKey: ["/api/knowledge/articles", slug],
    enabled: !!slug,
  });

  const { data: relatedData } = useQuery<{ success: boolean; data: Article[] }>({
    queryKey: ["/api/knowledge/articles"],
  });

  const trackViewMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const res = await apiRequest("POST", `/api/knowledge/articles/${articleId}/view`, {});
      return res.json();
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ articleId, helpful }: { articleId: string; helpful: boolean }) => {
      const res = await apiRequest("POST", `/api/knowledge/articles/${articleId}/feedback`, { helpful });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/articles", slug] });
      toast({
        title: "Thank you for your feedback!",
        description: "Your feedback helps us improve our content.",
      });
    },
  });

  useEffect(() => {
    if (articleData?.data) {
      trackViewMutation.mutate(articleData.data.id);
    }
  }, [articleData?.data?.id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!articleData?.data) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">Article Not Found</h2>
        <p className="text-muted-foreground mb-4">The article you're looking for doesn't exist.</p>
        <Button onClick={() => setLocation("/knowledge-base")}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Knowledge Base
        </Button>
      </div>
    );
  }

  const article = articleData.data;
  const relatedArticles = (relatedData?.data || [])
    .filter(a => a.category.name === article.category.name && a.id !== article.id)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/knowledge-base")} data-testid="button-back">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back to Knowledge Base
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <Badge variant="secondary">{article.category.name}</Badge>
                <CardTitle className="text-3xl font-display" data-testid="text-article-title">
                  {article.title}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {article.author.firstName[0]}{article.author.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {article.author.firstName} {article.author.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(article.createdAt), "MMMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{article.viewsCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{article.helpfulCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <div 
                dangerouslySetInnerHTML={{ __html: article.content }} 
                data-testid="article-content"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Was this article helpful?</CardTitle>
              <CardDescription>Your feedback helps us create better content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => feedbackMutation.mutate({ articleId: article.id, helpful: true })}
                  disabled={feedbackMutation.isPending}
                  data-testid="button-helpful-yes"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Yes, helpful
                </Button>
                <Button
                  variant="outline"
                  onClick={() => feedbackMutation.mutate({ articleId: article.id, helpful: false })}
                  disabled={feedbackMutation.isPending}
                  data-testid="button-helpful-no"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Not helpful
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {relatedArticles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Articles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {relatedArticles.map((related) => (
                  <div
                    key={related.id}
                    className="p-4 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/knowledge-base/article/${related.slug}`)}
                    data-testid={`related-article-${related.slug}`}
                  >
                    <h4 className="font-semibold mb-2">{related.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {related.summary}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{related.viewsCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        <span>{related.helpfulCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
