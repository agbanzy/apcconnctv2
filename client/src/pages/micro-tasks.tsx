import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MicroTaskCard } from "@/components/micro-task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Loader2 } from "lucide-react";
import type { MicroTask } from "@shared/schema";

export default function MicroTasks() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<MicroTask | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [proofImage, setProofImage] = useState<File | null>(null);

  const { data: tasksData, isLoading } = useQuery<{ success: boolean; data: (MicroTask & { completed?: boolean })[] }>({
    queryKey: ["/api/tasks/micro"],
    enabled: !!member,
  });

  const completeMutation = useMutation({
    mutationFn: async ({ taskId, formData }: { taskId: string; formData: FormData }) => {
      const res = await fetch(`/api/tasks/micro/${taskId}/complete`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete task");
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/micro"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/my-stats"] });
      setSelectedTask(null);
      setSelectedAnswers([]);
      setProofImage(null);
      
      const message = data?.data?.message || (data?.data?.isCorrect === false 
        ? "Incorrect answer. Try again!" 
        : "Task completed successfully!");
      
      toast({
        title: data?.data?.isCorrect === false ? "Incorrect" : "Success",
        description: message,
        variant: data?.data?.isCorrect === false ? "destructive" : "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Completion failed",
        description: error?.message || "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartTask = (task: MicroTask) => {
    setSelectedTask(task);
    setSelectedAnswers([]);
    setProofImage(null);
  };

  const handleSubmitTask = () => {
    if (!selectedTask) return;

    const completionRequirement = selectedTask.completionRequirement || "quiz";
    const formData = new FormData();

    if (completionRequirement === "quiz") {
      formData.append("selectedAnswers", JSON.stringify(selectedAnswers));
    } else if (completionRequirement === "image") {
      if (!proofImage) {
        toast({
          title: "Image required",
          description: "Please upload a proof image",
          variant: "destructive",
        });
        return;
      }
      formData.append("proofImage", proofImage);
    }

    completeMutation.mutate({ taskId: selectedTask.id, formData });
  };

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
  const completionRequirement = selectedTask?.completionRequirement || "quiz";

  return (
    <>
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
                completed={task.completed}
                onComplete={() => handleStartTask(task)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Completion Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-task-completion">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>{selectedTask?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {completionRequirement === "quiz" && selectedTask?.options && (
              <div className="space-y-3">
                <Label>Select your answer(s):</Label>
                <RadioGroup
                  value={selectedAnswers[0]?.toString()}
                  onValueChange={(value) => setSelectedAnswers([parseInt(value)])}
                >
                  {selectedTask.options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={index.toString()} 
                        id={`option-${index}`}
                        data-testid={`radio-option-${index}`}
                      />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {completionRequirement === "image" && (
              <div className="space-y-3">
                <Label htmlFor="proof-image">Upload Proof Image</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="proof-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                    data-testid="input-proof-image"
                  />
                  {proofImage && (
                    <p className="text-sm text-muted-foreground">{proofImage.name}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setSelectedTask(null)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitTask}
                disabled={
                  completeMutation.isPending || 
                  (completionRequirement === "quiz" && selectedAnswers.length === 0) ||
                  (completionRequirement === "image" && !proofImage)
                }
                data-testid="button-submit-task"
              >
                {completeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
