import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { NewsCard } from "@/components/news-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search } from "lucide-react";
import type { NewsPost } from "@shared/schema";

export default function News() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: newsData, isLoading } = useQuery<{
    success: boolean;
    data: (NewsPost & { author: any })[];
  }>({
    queryKey: ["/api/news"],
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiRequest("POST", `/api/news/${postId}/like`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
    onError: () => {
      toast({
        title: "Like failed",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/news/${postId}/comment`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      });
    },
    onError: () => {
      toast({
        title: "Comment failed",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const news = newsData?.data || [];
  const filteredNews = news.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">News Feed</h1>
        <p className="text-muted-foreground">
          Stay updated with the latest news and announcements from APC
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search news..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-news"
        />
      </div>

      {filteredNews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm ? "No news found matching your search." : "No news available."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredNews.map((post) => (
            <NewsCard
              key={post.id}
              id={post.id}
              title={post.title}
              excerpt={post.excerpt}
              category={post.category}
              timestamp={new Date(post.publishedAt || "")}
              imageUrl={post.imageUrl || undefined}
              likes={post.likes || 0}
              comments={post.comments || 0}
              onLike={() => likeMutation.mutate(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
