import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { Lightbulb, ThumbsUp, ThumbsDown, MessageSquare, Search, Filter, Plus } from "lucide-react";

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  member: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

interface IdeaComment {
  id: string;
  content: string;
  createdAt: string;
  member: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

interface UserVote {
  id: string;
  voteType: string;
}

const CATEGORIES = ["politics", "infrastructure", "education", "health", "economy", "youth", "security", "other"];
const STATUSES = ["all", "pending", "under_review", "approved", "rejected", "implemented"];

const ideaSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(1, "Please select a category"),
});

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});

export default function Ideas() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: ideasData, isLoading: ideasLoading } = useQuery<{ success: boolean; data: Idea[] }>({
    queryKey: ["/api/ideas"],
  });

  const { data: ideaDetailsData } = useQuery<{ 
    success: boolean; 
    data: { idea: Idea; comments: IdeaComment[]; userVote: UserVote | null } 
  }>({
    queryKey: ["/api/ideas", selectedIdea?.id],
    enabled: !!selectedIdea,
  });

  const form = useForm<z.infer<typeof ideaSchema>>({
    resolver: zodResolver(ideaSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
    },
  });

  const commentForm = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });

  const createIdeaMutation = useMutation({
    mutationFn: async (data: z.infer<typeof ideaSchema>) => {
      const res = await apiRequest("POST", "/api/ideas", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      form.reset();
      toast({
        title: "Idea submitted",
        description: "Your idea has been submitted for review!",
      });
    },
    onError: () => {
      toast({
        title: "Failed to submit idea",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ ideaId, voteType }: { ideaId: string; voteType: string }) => {
      const res = await apiRequest("POST", `/api/ideas/${ideaId}/vote`, { voteType });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
    },
  });

  const removeVoteMutation = useMutation({
    mutationFn: async (ideaId: string) => {
      const res = await apiRequest("DELETE", `/api/ideas/${ideaId}/vote`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ ideaId, content }: { ideaId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/ideas/${ideaId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas", selectedIdea?.id] });
      commentForm.reset();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ideaId, status }: { ideaId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/ideas/${ideaId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({
        title: "Status updated",
        description: "Idea status has been updated successfully.",
      });
    },
  });

  const handleVote = (ideaId: string, voteType: string, currentVote: UserVote | null) => {
    if (currentVote?.voteType === voteType) {
      removeVoteMutation.mutate(ideaId);
    } else {
      voteMutation.mutate({ ideaId, voteType });
    }
  };

  const onSubmit = (data: z.infer<typeof ideaSchema>) => {
    createIdeaMutation.mutate(data);
  };

  const onCommentSubmit = (data: z.infer<typeof commentSchema>) => {
    if (selectedIdea) {
      commentMutation.mutate({ ideaId: selectedIdea.id, content: data.content });
    }
  };

  const ideas = ideasData?.data || [];
  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || idea.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || idea.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "votes") return b.votesCount - a.votesCount;
    if (sortBy === "comments") return b.commentsCount - a.commentsCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "implemented": return "default";
      case "under_review": return "secondary";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Community Ideas</h1>
        <p className="text-muted-foreground">
          Share your ideas for improving our party and community
        </p>
      </div>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Submit Your Idea
            </CardTitle>
            <CardDescription>Share your innovative ideas with the community</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter idea title..." {...field} data-testid="input-idea-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your idea in detail..." 
                          rows={4}
                          {...field} 
                          data-testid="textarea-idea-description" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-idea-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createIdeaMutation.isPending} data-testid="button-submit-idea">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Idea
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            data-testid="input-search-ideas"
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48" data-testid="select-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="votes">Most Votes</SelectItem>
            <SelectItem value="comments">Most Comments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {ideasLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIdeas.map((idea) => (
            <Card key={idea.id} data-testid={`card-idea-${idea.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {idea.member.user.firstName[0]}{idea.member.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {idea.member.user.firstName} {idea.member.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(idea.createdAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <CardTitle className="text-xl mb-2">{idea.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {idea.description}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {idea.category}
                    </Badge>
                    <Badge variant={getStatusColor(idea.status)} className="capitalize">
                      {idea.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(idea.id, "upvote", null)}
                        data-testid={`button-upvote-${idea.id}`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <span className="font-semibold">{idea.votesCount}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(idea.id, "downvote", null)}
                        data-testid={`button-downvote-${idea.id}`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      <span>{idea.commentsCount}</span>
                    </div>
                  </div>
                  <Sheet open={sheetOpen && selectedIdea?.id === idea.id} onOpenChange={(open) => {
                    setSheetOpen(open);
                    if (!open) setSelectedIdea(null);
                  }}>
                    <SheetTrigger asChild>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedIdea(idea);
                          setSheetOpen(true);
                        }}
                        data-testid={`button-view-details-${idea.id}`}
                      >
                        View Details
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>{selectedIdea?.title}</SheetTitle>
                      </SheetHeader>
                      {ideaDetailsData?.data && (
                        <div className="space-y-6 mt-6">
                          <div>
                            <p className="text-sm text-muted-foreground mb-4">
                              {ideaDetailsData.data.idea.description}
                            </p>
                            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant={ideaDetailsData.data.userVote?.voteType === "upvote" ? "default" : "ghost"}
                                  size="sm"
                                  onClick={() => handleVote(
                                    selectedIdea.id, 
                                    "upvote", 
                                    ideaDetailsData.data.userVote
                                  )}
                                  data-testid="button-upvote-detail"
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <span className="font-bold">{ideaDetailsData.data.idea.votesCount}</span>
                                <Button
                                  variant={ideaDetailsData.data.userVote?.voteType === "downvote" ? "default" : "ghost"}
                                  size="sm"
                                  onClick={() => handleVote(
                                    selectedIdea.id, 
                                    "downvote", 
                                    ideaDetailsData.data.userVote
                                  )}
                                  data-testid="button-downvote-detail"
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {(user?.role === "admin" || user?.role === "coordinator") && (
                            <div>
                              <Label>Change Status</Label>
                              <Select 
                                value={ideaDetailsData.data.idea.status} 
                                onValueChange={(status) => updateStatusMutation.mutate({ 
                                  ideaId: selectedIdea.id, 
                                  status 
                                })}
                              >
                                <SelectTrigger data-testid="select-idea-status">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUSES.filter(s => s !== "all").map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div>
                            <h3 className="font-semibold mb-4">
                              Comments ({ideaDetailsData.data.comments.length})
                            </h3>
                            <div className="space-y-4">
                              {ideaDetailsData.data.comments.map((comment) => (
                                <div key={comment.id} className="p-4 border rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {comment.member.user.firstName[0]}{comment.member.user.lastName[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-medium">
                                      {comment.member.user.firstName} {comment.member.user.lastName}
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(comment.createdAt), "MMM dd, yyyy")}
                                    </span>
                                  </div>
                                  <p className="text-sm">{comment.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {user && (
                            <Form {...commentForm}>
                              <form onSubmit={commentForm.handleSubmit(onCommentSubmit)} className="space-y-4">
                                <FormField
                                  control={commentForm.control}
                                  name="content"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Add Comment</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          placeholder="Share your thoughts..." 
                                          {...field} 
                                          data-testid="textarea-comment" 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button 
                                  type="submit" 
                                  disabled={commentMutation.isPending}
                                  data-testid="button-submit-comment"
                                >
                                  Post Comment
                                </Button>
                              </form>
                            </Form>
                          )}
                        </div>
                      )}
                    </SheetContent>
                  </Sheet>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredIdeas.length === 0 && (
            <Card className="p-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No ideas found matching your criteria</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
