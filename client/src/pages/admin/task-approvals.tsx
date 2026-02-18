import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, Image as ImageIcon } from "lucide-react";

interface PendingCompletion {
  id: string;
  taskId: string;
  memberId: string;
  proofUrl: string | null;
  status: string;
  completedAt: Date;
  member: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  task: {
    id: string;
    title: string;
    description: string;
    points: number;
    category: string;
    completionRequirement: string;
  };
}

export default function TaskApprovals() {
  const { toast } = useToast();
  const [selectedCompletion, setSelectedCompletion] = useState<PendingCompletion | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: completionsData, isLoading } = useQuery<{ success: boolean; data: PendingCompletion[] }>({
    queryKey: ["/api/admin/task-completions/pending"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: async (completionId: string) => {
      const res = await apiRequest("POST", `/api/admin/task-completions/${completionId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/task-completions/pending"] });
      setSelectedCompletion(null);
      toast({
        title: "Task approved",
        description: "Task completion has been approved and points awarded",
      });
    },
    onError: () => {
      toast({
        title: "Approval failed",
        description: "Failed to approve task completion",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ completionId, reason }: { completionId: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/task-completions/${completionId}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/task-completions/pending"] });
      setSelectedCompletion(null);
      setRejectionReason("");
      toast({
        title: "Task rejected",
        description: "Task completion has been rejected",
      });
    },
    onError: () => {
      toast({
        title: "Rejection failed",
        description: "Failed to reject task completion",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const completions = completionsData?.data || [];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">
            Task Approvals
          </h1>
          <p className="text-muted-foreground">
            Review and approve member task submissions
          </p>
        </div>

        {completions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No pending task submissions</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {completions.map((completion) => (
              <Card key={completion.id} className="hover-elevate" data-testid="card-pending-completion">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid="text-task-title">
                        {completion.task.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submitted by: {completion.member?.user?.firstName || "Unknown"} {completion.member?.user?.lastName || ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(completion.completedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" data-testid="badge-category">
                        {completion.task.category}
                      </Badge>
                      <Badge variant="secondary">
                        +{completion.task.points} pts
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{completion.task.description}</p>
                  
                  {completion.proofUrl && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <ImageIcon className="h-4 w-4" />
                      <span>Proof image attached</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCompletion(completion)}
                      data-testid="button-review"
                    >
                      Review Submission
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => approveMutation.mutate(completion.id)}
                      disabled={approveMutation.isPending}
                      data-testid="button-quick-approve"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedCompletion} onOpenChange={(open) => !open && setSelectedCompletion(null)}>
        <DialogContent className="max-w-3xl" data-testid="dialog-review">
          <DialogHeader>
            <DialogTitle>{selectedCompletion?.task.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Task Details</h4>
              <p className="text-sm text-muted-foreground">{selectedCompletion?.task.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Submitted by:</span>
                <p className="font-medium">
                  {selectedCompletion?.member?.user?.firstName || "Unknown"} {selectedCompletion?.member?.user?.lastName || ""}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Points:</span>
                <p className="font-medium">+{selectedCompletion?.task.points}</p>
              </div>
            </div>

            {selectedCompletion?.proofUrl && (
              <div>
                <h4 className="font-semibold mb-2">Proof Image</h4>
                <img
                  src={selectedCompletion.proofUrl}
                  alt="Task proof"
                  className="max-w-full rounded-lg border"
                  data-testid="img-proof"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason (optional)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this submission is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                data-testid="textarea-rejection-reason"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedCompletion(null)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedCompletion) {
                  rejectMutation.mutate({
                    completionId: selectedCompletion.id,
                    reason: rejectionReason || "Did not meet requirements",
                  });
                }
              }}
              disabled={rejectMutation.isPending}
              data-testid="button-reject"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => {
                if (selectedCompletion) {
                  approveMutation.mutate(selectedCompletion.id);
                }
              }}
              disabled={approveMutation.isPending}
              data-testid="button-approve"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Award Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
