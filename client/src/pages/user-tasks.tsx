import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Coins, Calendar, MapPin, Users, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const TASK_CATEGORIES = [
  { value: "outreach", label: "Outreach" },
  { value: "canvassing", label: "Canvassing" },
  { value: "social_media", label: "Social Media" },
  { value: "community_service", label: "Community Service" },
  { value: "data_collection", label: "Data Collection" },
  { value: "education", label: "Education" },
  { value: "event_support", label: "Event Support" },
  { value: "fundraising", label: "Fundraising" },
  { value: "monitoring", label: "Monitoring" },
  { value: "content_creation", label: "Content Creation" },
  { value: "membership_drive", label: "Membership Drive" },
  { value: "general", label: "General" },
];

const createTaskSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000),
  category: z.string().min(1, "Category is required"),
  taskCategory: z.string().optional().default("general"),
  taskScope: z.enum(["national", "state", "lga", "ward"]).optional().default("national"),
  location: z.string().min(1, "Location is required"),
  skills: z.string().min(1, "At least one skill is required"),
  pointsPerCompletion: z.number().min(10, "Minimum 10 points required").max(1000),
  maxCompletions: z.number().min(1).max(100).optional(),
  deadline: z.string().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  cooldownHours: z.number().min(0).max(720).optional().default(0),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

export default function UserTasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: memberData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/members/me"],
  });

  const memberId = memberData?.data?.id;

  const { data: balanceData } = useQuery<{ success: boolean; balance: number }>({
    queryKey: ["/api/points/balance", memberId],
    enabled: !!memberId,
  });

  const { data: availableTasksData, isLoading: isLoadingAvailable } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ["/api/user-tasks/available"],
  });

  const { data: myCreatedTasksData, isLoading: isLoadingCreated } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ["/api/user-tasks/my-created"],
    enabled: !!memberId,
  });

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      taskCategory: "general",
      taskScope: "national",
      location: "",
      skills: "",
      pointsPerCompletion: 50,
      maxCompletions: 1,
      difficulty: "Medium",
      cooldownHours: 0,
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskFormData) => {
      const response = await apiRequest("POST", "/api/user-tasks/create-and-fund", {
        ...data,
        skills: data.skills.split(",").map((s) => s.trim()),
        fundingPoints: data.pointsPerCompletion * (data.maxCompletions || 1),
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-tasks/my-created"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-tasks/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/balance", memberId] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/transactions", memberId] });
      
      toast({
        title: "Task Created Successfully!",
        description: data.message || "Your task has been created",
      });
      
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Task",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const cancelTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("POST", `/api/user-tasks/${taskId}/cancel`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-tasks/my-created"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/balance", memberId] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/transactions", memberId] });
      
      toast({
        title: "Task Cancelled",
        description: data.message || "Task has been cancelled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Cancel Task",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTaskFormData) => {
    const totalCost = data.pointsPerCompletion * (data.maxCompletions || 1);
    const currentBalance = balanceData?.balance || 0;
    
    if (currentBalance < totalCost) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${totalCost} points but have ${currentBalance} points.`,
        variant: "destructive",
      });
      return;
    }
    
    createTaskMutation.mutate(data);
  };

  const availableTasks = availableTasksData?.data || [];
  const myCreatedTasks = myCreatedTasksData?.data || [];
  const balance = balanceData?.balance || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">User Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Create tasks or browse opportunities created by other members
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-task">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create & Fund a Task</DialogTitle>
              <DialogDescription>
                Create a task and fund it with your points to attract volunteers
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Help organize community event" {...field} data-testid="input-task-title" />
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
                          placeholder="Describe the task in detail..."
                          rows={4}
                          {...field}
                          data-testid="input-task-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="outreach">Outreach</SelectItem>
                            <SelectItem value="mobilization">Mobilization</SelectItem>
                            <SelectItem value="campaign">Campaign</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="admin">Administrative</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-difficulty">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="taskCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "general"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-category">
                              <SelectValue placeholder="Select task category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TASK_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taskScope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Scope</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "national"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-scope">
                              <SelectValue placeholder="Select scope" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="national">National</SelectItem>
                            <SelectItem value="state">State</SelectItem>
                            <SelectItem value="lga">LGA</SelectItem>
                            <SelectItem value="ward">Ward</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Who can see and complete this task</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cooldownHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cooldown Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={720}
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-cooldown-hours"
                        />
                      </FormControl>
                      <FormDescription>Hours between repeat completions (0 = no cooldown)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Lagos, Ikeja" {...field} data-testid="input-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Skills</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Communication, Organization (comma-separated)" {...field} data-testid="input-skills" />
                      </FormControl>
                      <FormDescription>Separate multiple skills with commas</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="pointsPerCompletion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points Reward (per completion)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={10}
                            max={1000}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-points-reward"
                          />
                        </FormControl>
                        <FormDescription>Minimum 10 points</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxCompletions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Volunteers</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-max-volunteers"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-deadline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Funding Summary */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Points per completion:</span>
                        <span className="font-mono">{form.watch("pointsPerCompletion") || 0} pts</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Max volunteers:</span>
                        <span className="font-mono">{form.watch("maxCompletions") || 0}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total Escrow Cost:</span>
                        <span className="text-primary font-mono">
                          {(form.watch("pointsPerCompletion") || 0) * (form.watch("maxCompletions") || 0)} pts
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Your current balance:</span>
                        <span className="font-mono">{balance} pts</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTaskMutation.isPending}
                    data-testid="button-submit-create-task"
                  >
                    {createTaskMutation.isPending ? "Creating..." : "Create & Fund Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Points for Funding</p>
              <p className="font-display text-2xl font-bold text-primary" data-testid="text-available-balance">
                {balance.toLocaleString()} pts
              </p>
            </div>
            <Coins className="h-10 w-10 text-primary/50" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse" data-testid="tab-browse-tasks">
            Browse Tasks ({availableTasks.length})
          </TabsTrigger>
          <TabsTrigger value="created" data-testid="tab-my-created-tasks">
            My Created Tasks ({myCreatedTasks.length})
          </TabsTrigger>
        </TabsList>

        {/* Browse Tasks Tab */}
        <TabsContent value="browse" className="space-y-4">
          {isLoadingAvailable ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          ) : availableTasks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <p>No tasks available at the moment</p>
                <p className="text-sm mt-2">Be the first to create one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableTasks.map((task) => (
                <Card key={task.id} className="hover-elevate" data-testid={`task-card-${task.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                      <Badge variant="secondary">{task.difficulty}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-primary">{task.pointsPerCompletion} points</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{task.location}</span>
                    </div>
                    {task.deadline && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Due {format(new Date(task.deadline), "MMM dd, yyyy")}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <Badge variant="outline" className="text-xs">
                        {task.category}
                      </Badge>
                    </div>
                    <Button className="w-full" size="sm" data-testid={`button-apply-${task.id}`}>
                      Apply to Task
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Created Tasks Tab */}
        <TabsContent value="created" className="space-y-4">
          {isLoadingCreated ? (
            <Skeleton className="h-64" />
          ) : myCreatedTasks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <p>You haven't created any tasks yet</p>
                <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-first-task">
                  Create Your First Task
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myCreatedTasks.map((task) => (
                <Card key={task.id} data-testid={`created-task-${task.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{task.title}</CardTitle>
                        <CardDescription className="mt-2">{task.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            task.fundingStatus === "fully_funded"
                              ? "default"
                              : task.fundingStatus === "partially_funded"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {task.fundingStatus?.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline">{task.status}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Reward</p>
                        <p className="font-semibold text-primary">{task.pointsPerCompletion} pts</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Volunteers</p>
                        <p className="font-semibold">{task.currentVolunteers || 0} / {task.maxVolunteers || 1}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Applications</p>
                        <p className="font-semibold">{task.applicationsCount || 0}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-applicants-${task.id}`}>
                        <Users className="h-4 w-4 mr-2" />
                        View Applicants
                      </Button>
                      {task.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelTaskMutation.mutate(task.id)}
                          disabled={cancelTaskMutation.isPending}
                          data-testid={`button-cancel-${task.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Task
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
