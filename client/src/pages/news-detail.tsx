import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SocialShare } from "@/components/social-share";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import { ThumbsUp, MessageCircle, Reply, Trash2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { NewsPost, NewsComment } from "@shared/schema";

interface NewsPostWithAuthor extends NewsPost {
  author: { firstName: string; lastName: string };
}

interface CommentWithMember extends NewsComment {
  member: {
    user: { firstName: string; lastName: string };
  };
  replies?: CommentWithMember[];
}

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { member, user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: postData, isLoading: postLoading } = useQuery<{
    success: boolean;
    data: NewsPostWithAuthor;
  }>({
    queryKey: ["/api/news", id],
  });

  const { data: commentsData, isLoading: commentsLoading } = useQuery<{
    success: boolean;
    data: CommentWithMember[];
  }>({
    queryKey: ["/api/news", id, "comments"],
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/news/${id}/like`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news", id] });
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

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/news/${id}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news", id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setCommentText("");
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Comment failed",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/news/comments/${commentId}/reply`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news", id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setReplyingTo(null);
      setReplyText("");
      toast({
        title: "Reply posted",
        description: "Your reply has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Reply failed",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await apiRequest("POST", `/api/news/comments/${commentId}/like`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news", id, "comments"] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await apiRequest("DELETE", `/api/news/comments/${commentId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news", id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Comment deleted",
        description: "The comment has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (commentText.trim()) {
      addCommentMutation.mutate(commentText);
    }
  };

  const handleReply = (commentId: string) => {
    if (replyText.trim()) {
      replyMutation.mutate({ commentId, content: replyText });
    }
  };

  const renderComment = (comment: CommentWithMember, isReply = false) => {
    const initials = `${(comment.member?.user?.firstName || "?")[0]}${(comment.member?.user?.lastName || "?")[0]}`;
    const canDelete = member && (comment.memberId === member.id || user?.role === "admin");

    return (
      <div key={comment.id} className={isReply ? "ml-12 mt-4" : "mt-4"} data-testid={`comment-${comment.id}`}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8" data-testid={`avatar-${comment.id}`}>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm" data-testid={`comment-author-${comment.id}`}>
                  {comment.member?.user?.firstName || "Unknown"} {comment.member?.user?.lastName || ""}
                </span>
                <span className="text-xs text-muted-foreground" data-testid={`comment-time-${comment.id}`}>
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm" data-testid={`comment-content-${comment.id}`}>{comment.content}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => likeCommentMutation.mutate(comment.id)}
                className="gap-1 h-8"
                data-testid={`button-like-comment-${comment.id}`}
              >
                <ThumbsUp className="h-3 w-3" />
                <span className="text-xs" data-testid={`comment-likes-${comment.id}`}>{comment.likes || 0}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="gap-1 h-8"
                data-testid={`button-reply-${comment.id}`}
              >
                <Reply className="h-3 w-3" />
                <span className="text-xs">Reply</span>
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCommentMutation.mutate(comment.id)}
                  className="gap-1 h-8 text-destructive hover:text-destructive"
                  data-testid={`button-delete-comment-${comment.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="text-xs">Delete</span>
                </Button>
              )}
            </div>
            {replyingTo === comment.id && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="resize-none text-sm"
                  rows={2}
                  data-testid={`input-reply-${comment.id}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReply(comment.id)}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    data-testid={`button-submit-reply-${comment.id}`}
                  >
                    Post Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                    data-testid={`button-cancel-reply-${comment.id}`}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {comment.replies && comment.replies.length > 0 && (
              <div className="space-y-2">
                {comment.replies.map((reply) => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (postLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!postData?.data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">News post not found.</p>
        <Button onClick={() => navigate("/news")} className="mt-4" data-testid="button-back-to-news">
          Back to News
        </Button>
      </div>
    );
  }

  const post = postData.data;
  const comments = commentsData?.data || [];

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/news")}
        className="gap-2"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to News
      </Button>

      <Card data-testid="card-news-detail">
        {post.imageUrl && (
          <div className="aspect-video overflow-hidden rounded-t-lg">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
              data-testid="img-news-cover"
            />
          </div>
        )}
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge variant="secondary" data-testid="badge-category">{post.category}</Badge>
            <span className="text-sm text-muted-foreground" data-testid="text-publish-date">
              {format(new Date(post.publishedAt || ""), "MMMM d, yyyy")}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-news-title">{post.title}</h1>
          <p className="text-lg text-muted-foreground" data-testid="text-news-excerpt">{post.excerpt}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {post.content && (
            <div className="prose dark:prose-invert max-w-none" data-testid="text-news-content">
              {post.content.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              className="gap-2"
              data-testid="button-like-post"
            >
              <ThumbsUp className="h-4 w-4" />
              <span data-testid="text-likes-count">{post.likes || 0}</span>
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span data-testid="text-comments-count">{post.comments || 0} comments</span>
            </div>
          </div>
          <SocialShare
            title={post.title}
            description={post.excerpt}
            url={`/news/${post.id}`}
            variant="buttons"
          />
        </CardFooter>
      </Card>

      <Card data-testid="card-comments-section">
        <CardHeader>
          <h2 className="font-display text-2xl font-bold" data-testid="text-comments-title">
            Comments ({comments.length})
          </h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              className="resize-none"
              rows={3}
              data-testid="input-new-comment"
            />
            <Button
              onClick={handleAddComment}
              disabled={!commentText.trim() || addCommentMutation.isPending}
              data-testid="button-post-comment"
            >
              Post Comment
            </Button>
          </div>

          {commentsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground" data-testid="text-no-comments">
                No comments yet. Be the first to comment!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <Separator />
              {comments.map((comment) => renderComment(comment))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
