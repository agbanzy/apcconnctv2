import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { MicroTaskCard } from "@/components/micro-task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MicroTask } from "@shared/schema";

export default function MicroTasks() {
  const { member } = useAuth();
  const { toast } = useToast();

  const { data: tasksData, isLoading } = useQuery<{ success: boolean; data: MicroTask[] }>({
    queryKey: ["/api/tasks/micro"],
    enabled: !!member,
  });

  const completeMutation = useMutation({
    mutationFn: async ({ taskId, proofUrl }: { taskId: string; proofUrl?: string }) => {
      const res = await apiRequest("POST", `/api/tasks/micro/${taskId}/complete`, { proofUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/micro"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/my-stats"] });
      toast({
        title: "Task completed",
        description: "Your task submission is pending verification.",
      });
    },
    onError: () => {
      toast({
        title: "Completion failed",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const tasks = tasksData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Micro Tasks</h1>
        <p className="text-muted-foreground">
          Complete quick tasks to earn points and support the party
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No micro tasks available at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <MicroTaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              points={task.points}
              timeEstimate={task.timeEstimate}
              category={task.category}
              onComplete={() => completeMutation.mutate({ taskId: task.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
