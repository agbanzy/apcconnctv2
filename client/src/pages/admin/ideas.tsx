import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Search, Trash2, Eye, Download, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { format } from "date-fns";

type Idea = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "pending" | "under_review" | "approved" | "rejected" | "implemented";
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  member: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  votes?: Array<{ voteType: string }>;
  comments?: Array<{
    content: string;
    createdAt: string;
    member: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
};

export default function AdminIdeas() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");

  const { data: ideas = [], isLoading } = useQuery<Idea[]>({
    queryKey: ["/api/ideas"],
  });

  const { data: selectedIdeaDetails } = useQuery<Idea>({
    queryKey: ["/api/ideas", selectedIdea?.id],
    enabled: !!selectedIdea,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/ideas/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({ title: "Status updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ideas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      setDeleteConfirm(null);
      setSelectedIdea(null);
      toast({ title: "Idea deleted successfully" });
    },
  });

  const categories = ["all", "politics", "infrastructure", "education", "health", "economy", "youth", "security", "other"];
  const statuses = ["all", "pending", "under_review", "approved", "rejected", "implemented"];

  const filteredIdeas = ideas.filter((idea) => {
    if (searchQuery && !idea.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== "all" && idea.category !== categoryFilter) return false;
    if (statusFilter !== "all" && idea.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: ideas.length,
    pending: ideas.filter((i) => i.status === "pending" || i.status === "under_review").length,
    approved: ideas.filter((i) => i.status === "approved").length,
    implemented: ideas.filter((i) => i.status === "implemented").length,
  };

  const handleBulkStatusChange = () => {
    if (!bulkStatus || selectedIds.size === 0) return;

    Promise.all(
      Array.from(selectedIds).map((id) =>
        updateStatusMutation.mutateAsync({ id, status: bulkStatus })
      )
    ).then(() => {
      setSelectedIds(new Set());
      setBulkStatus("");
    });
  };

  const handleExportCSV = () => {
    const csv = [
      ["ID", "Title", "Author", "Category", "Status", "Votes", "Comments", "Created"],
      ...filteredIdeas.map((idea) => [
        idea.id,
        idea.title,
        `${idea.member.user.firstName} ${idea.member.user.lastName}`,
        idea.category,
        idea.status,
        idea.votesCount,
        idea.commentsCount,
        format(new Date(idea.createdAt), "yyyy-MM-dd"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ideas-export.csv";
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "rejected":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "implemented":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "under_review":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ideas Management</h1>
        <p className="text-muted-foreground">Manage and moderate community ideas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-ideas">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-ideas">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-approved-ideas">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Implemented</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-implemented-ideas">{stats.implemented}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Ideas</CardTitle>
          <CardDescription>Review and manage submitted ideas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ideas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-ideas"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[180px]" data-testid="select-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleExportCSV} variant="outline" data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-[180px]" data-testid="select-bulk-status">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="implemented">Implemented</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleBulkStatusChange} disabled={!bulkStatus} data-testid="button-bulk-update">
                  Apply
                </Button>
                <Button variant="outline" onClick={() => setSelectedIds(new Set())} data-testid="button-clear-selection">
                  Clear
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === filteredIdeas.length && filteredIdeas.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(new Set(filteredIdeas.map((i) => i.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Votes</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIdeas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No ideas found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredIdeas.map((idea) => (
                        <TableRow key={idea.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(idea.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedIds);
                                if (checked) {
                                  newSet.add(idea.id);
                                } else {
                                  newSet.delete(idea.id);
                                }
                                setSelectedIds(newSet);
                              }}
                              data-testid={`checkbox-idea-${idea.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{idea.title}</TableCell>
                          <TableCell>
                            {idea.member.user.firstName} {idea.member.user.lastName}
                          </TableCell>
                          <TableCell className="capitalize">{idea.category}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(idea.status)}>{idea.status}</Badge>
                          </TableCell>
                          <TableCell>{idea.votesCount}</TableCell>
                          <TableCell>{idea.commentsCount}</TableCell>
                          <TableCell>{format(new Date(idea.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedIdea(idea)}
                                data-testid={`button-view-${idea.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(idea.id)}
                                data-testid={`button-delete-${idea.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selectedIdea} onOpenChange={() => setSelectedIdea(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto" data-testid="sheet-idea-details">
          <SheetHeader>
            <SheetTitle>{selectedIdeaDetails?.title}</SheetTitle>
            <SheetDescription>
              By {selectedIdeaDetails?.member.user.firstName} {selectedIdeaDetails?.member.user.lastName} •{" "}
              {selectedIdeaDetails && format(new Date(selectedIdeaDetails.createdAt), "MMM d, yyyy")}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 mt-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedIdeaDetails?.description}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Status</h3>
              <Select
                value={selectedIdeaDetails?.status}
                onValueChange={(status) => {
                  if (selectedIdeaDetails) {
                    updateStatusMutation.mutate({ id: selectedIdeaDetails.id, status });
                  }
                }}
              >
                <SelectTrigger data-testid="select-idea-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="implemented">Implemented</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Vote Statistics</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-sm">
                    {selectedIdeaDetails?.votes?.filter((v) => v.voteType === "upvote").length || 0} upvotes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4" />
                  <span className="text-sm">
                    {selectedIdeaDetails?.votes?.filter((v) => v.voteType === "downvote").length || 0} downvotes
                  </span>
                </div>
                <div className="font-medium">Total: {selectedIdeaDetails?.votesCount}</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Comments ({selectedIdeaDetails?.comments?.length || 0})</h3>
              <div className="space-y-3">
                {selectedIdeaDetails?.comments?.map((comment, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="text-sm font-medium">
                      {comment.member.user.firstName} {comment.member.user.lastName}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                ))}
                {selectedIdeaDetails?.comments?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => selectedIdea && setDeleteConfirm(selectedIdea.id)}
                data-testid="button-delete-idea"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Idea
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this idea and all its comments and votes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
