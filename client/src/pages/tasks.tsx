import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, Trophy, Target, Filter, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { MicroTask, VolunteerTask, TaskCompletion } from "@shared/schema";

interface MicroTaskWithCompletion extends MicroTask {
  completed?: boolean;
  completion?: TaskCompletion;
}

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState("micro");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<MicroTaskWithCompletion | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const { toast } = useToast();

  // Fetch micro-tasks
  const { data: microTasks, isLoading: loadingMicro } = useQuery<{ data: MicroTaskWithCompletion[] }>({
    queryKey: ["/api/tasks/micro"],
  });

  // Fetch volunteer tasks
  const { data: volunteerTasks, isLoading: loadingVolunteer } = useQuery<{ data: VolunteerTask[] }>({
    queryKey: ["/api/tasks/volunteer"],
  });

  // Fetch my completions
  const { data: myCompletions, isLoading: loadingCompletions } = useQuery<{ 
    data: { 
      completions: TaskCompletion[]; 
      totalPoints: number; 
      totalCompleted: number;
    } 
  }>({
    queryKey: ["/api/tasks/my-completions"],
  });

  // Fetch leaderboard
  const { data: leaderboard } = useQuery<{ data: any[] }>({
    queryKey: ["/api/tasks/leaderboard", "all"],
  });

  // Complete micro-task mutation
  const completeMicroTask = useMutation({
    mutationFn: async ({ id, selectedAnswers }: { id: string; selectedAnswers: number[] }) => {
      const response = await fetch(`/api/tasks/micro/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ selectedAnswers }),
      });
      if (!response.ok) throw new Error("Failed to complete task");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/micro"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-completions"] });
      setSelectedTask(null);
      setSelectedAnswers([]);
      
      if (data.data.isCorrect) {
        toast({
          title: "🎉 Correct!",
          description: `You earned ${data.data.pointsEarned} points!`,
        });
      } else {
        toast({
          title: "Incorrect",
          description: "Better luck next time!",
          variant: "destructive",
        });
      }
    },
  });

  // Sign up for volunteer task mutation
  const signUpForTask = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tasks/volunteer/${id}/assign`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to sign up");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/volunteer"] });
      toast({
        title: "Success!",
        description: "You've been signed up for this task",
      });
    },
  });

  const handleStartMicroTask = (task: MicroTaskWithCompletion) => {
    setSelectedTask(task);
    setSelectedAnswers([]);
  };

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswers(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSubmitAnswer = () => {
    if (selectedTask && selectedAnswers.length > 0) {
      completeMicroTask.mutate({ id: selectedTask.id, selectedAnswers });
    }
  };

  const filteredMicroTasks = microTasks?.data.filter(task => {
    if (categoryFilter !== "all" && task.category !== categoryFilter) return false;
    return true;
  }) || [];

  const filteredVolunteerTasks = volunteerTasks?.data.filter(task => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    return true;
  }) || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">Tasks & Opportunities</h1>
          <p className="text-muted-foreground">Complete tasks to earn points and contribute to APC</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2" data-testid="badge-total-points">
            <Trophy className="h-4 w-4 mr-2" />
            {myCompletions?.data.totalPoints || 0} Points
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="micro" data-testid="tab-micro-tasks">
            <Target className="h-4 w-4 mr-2" />
            Micro-Tasks
          </TabsTrigger>
          <TabsTrigger value="volunteer" data-testid="tab-volunteer-tasks">
            <MapPin className="h-4 w-4 mr-2" />
            Volunteer Tasks
          </TabsTrigger>
          <TabsTrigger value="my-tasks" data-testid="tab-my-tasks">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            My Tasks
          </TabsTrigger>
        </TabsList>

        {/* Micro-Tasks Tab */}
        <TabsContent value="micro" className="space-y-6">
          <div className="flex gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="politics">Politics</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="history">History</SelectItem>
                <SelectItem value="governance">Governance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingMicro ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMicroTasks.map((task) => (
                <Card key={task.id} className="hover-elevate" data-testid={`card-micro-task-${task.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <CardDescription className="mt-2">{task.description}</CardDescription>
                      </div>
                      {task.completed && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" data-testid="icon-completed" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{task.category}</Badge>
                      <Badge className="bg-primary">{task.points} pts</Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {task.timeEstimate}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleStartMicroTask(task)}
                      disabled={task.completed}
                      data-testid={`button-start-task-${task.id}`}
                    >
                      {task.completed ? "Completed" : "Start Task"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Volunteer Tasks Tab */}
        <TabsContent value="volunteer" className="space-y-6">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingVolunteer ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredVolunteerTasks.map((task) => (
                <Card key={task.id} className="hover-elevate" data-testid={`card-volunteer-task-${task.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{task.title}</CardTitle>
                        <CardDescription className="mt-2">{task.description}</CardDescription>
                      </div>
                      <Badge 
                        variant={task.status === "open" ? "default" : "secondary"}
                        data-testid={`badge-status-${task.id}`}
                      >
                        {task.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {task.location}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Trophy className="h-4 w-4 mr-2" />
                        {task.points} points
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Volunteers:</span>
                      <Badge variant="outline">
                        {task.currentVolunteers || 0} / {task.maxVolunteers || "∞"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => signUpForTask.mutate(task.id)}
                        disabled={task.status !== "open"}
                        data-testid={`button-signup-${task.id}`}
                      >
                        {task.status === "open" ? "Sign Up" : "View Details"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Tasks Tab */}
        <TabsContent value="my-tasks" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-points">
                  {myCompletions?.data.totalPoints || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-completed">
                  {myCompletions?.data.totalCompleted || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Leaderboard Rank</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
              </CardContent>
            </Card>
          </div>

          {loadingCompletions ? (
            <Skeleton className="h-64" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Completions</CardTitle>
                <CardDescription>Your recently completed tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myCompletions?.data.completions.slice(0, 10).map((completion) => (
                    <div
                      key={completion.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted"
                      data-testid={`completion-${completion.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{completion.taskType === "micro" ? "Micro Task" : "Volunteer Task"}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(completion.completedAt!).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={completion.status === "approved" ? "default" : "secondary"}>
                        {completion.pointsEarned} pts
                      </Badge>
                    </div>
                  ))}
                  {(!myCompletions?.data.completions || myCompletions.data.completions.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No completed tasks yet. Start completing tasks to earn points!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Micro Task Quiz Dialog */}
      <Dialog open={selectedTask !== null} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-micro-task">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>{selectedTask?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={selectedAnswers[0]?.toString()} onValueChange={(val) => setSelectedAnswers([parseInt(val)])}>
              {selectedTask?.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <div className="flex justify-between items-center pt-4">
              <Badge className="text-lg px-4 py-2">{selectedTask?.points} Points</Badge>
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswers.length === 0 || completeMicroTask.isPending}
                data-testid="button-submit-answer"
              >
                {completeMicroTask.isPending ? "Submitting..." : "Submit Answer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
