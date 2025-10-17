import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { MicroTask, VolunteerTask, TaskCompletion } from "@shared/schema";

const microTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  points: z.number().min(1, "Points must be at least 1"),
  timeEstimate: z.string().min(1, "Time estimate is required"),
  options: z.array(z.string()).min(2, "At least 2 options required"),
  correctAnswers: z.array(z.number()).min(1, "Select at least one correct answer"),
});

const volunteerTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  location: z.string().min(1, "Location is required"),
  points: z.number().min(1, "Points must be at least 1"),
  skills: z.array(z.string()).min(1, "At least one skill required"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  maxVolunteers: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export default function AdminTasksPage() {
  const [microDialogOpen, setMicroDialogOpen] = useState(false);
  const [volunteerDialogOpen, setVolunteerDialogOpen] = useState(false);
  const [optionInput, setOptionInput] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch all micro-tasks
  const { data: microTasks } = useQuery<{ data: MicroTask[] }>({
    queryKey: ["/api/tasks/micro"],
  });

  // Fetch all volunteer tasks
  const { data: volunteerTasks } = useQuery<{ data: VolunteerTask[] }>({
    queryKey: ["/api/tasks/volunteer"],
  });

  // Fetch pending completions
  const { data: pendingCompletions } = useQuery<{ data: TaskCompletion[] }>({
    queryKey: ["/api/tasks/pending-completions"],
    enabled: false, // We'll implement this later if needed
  });

  const microForm = useForm({
    resolver: zodResolver(microTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "politics",
      points: 50,
      timeEstimate: "5 minutes",
      options: [],
      correctAnswers: [],
    },
  });

  const volunteerForm = useForm({
    resolver: zodResolver(volunteerTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "campaign",
      location: "",
      points: 100,
      skills: [],
      difficulty: "Medium" as const,
      maxVolunteers: undefined,
    },
  });

  // Create micro-task mutation
  const createMicroTask = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/tasks/micro", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/micro"] });
      setMicroDialogOpen(false);
      microForm.reset();
      setOptions([]);
      toast({
        title: "Success!",
        description: "Micro-task created successfully",
      });
    },
  });

  // Create volunteer task mutation
  const createVolunteerTask = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/tasks/volunteer", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/volunteer"] });
      setVolunteerDialogOpen(false);
      volunteerForm.reset();
      setSkills([]);
      toast({
        title: "Success!",
        description: "Volunteer task created successfully",
      });
    },
  });

  // Delete micro-task mutation
  const deleteMicroTask = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/tasks/micro/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/micro"] });
      toast({
        title: "Deleted",
        description: "Micro-task deleted successfully",
      });
    },
  });

  // Delete volunteer task mutation
  const deleteVolunteerTask = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/tasks/volunteer/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/volunteer"] });
      toast({
        title: "Deleted",
        description: "Volunteer task deleted successfully",
      });
    },
  });

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setOptions([...options, optionInput.trim()]);
      setOptionInput("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const onSubmitMicroTask = (data: any) => {
    createMicroTask.mutate({ ...data, options });
  };

  const onSubmitVolunteerTask = (data: any) => {
    createVolunteerTask.mutate({ ...data, skills });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold" data-testid="text-admin-tasks-title">Tasks Management</h1>
        <p className="text-muted-foreground">Create and manage micro-tasks and volunteer opportunities</p>
      </div>

      <Tabs defaultValue="micro" className="space-y-6">
        <TabsList>
          <TabsTrigger value="micro" data-testid="tab-micro-tasks-admin">Micro-Tasks</TabsTrigger>
          <TabsTrigger value="volunteer" data-testid="tab-volunteer-tasks-admin">Volunteer Tasks</TabsTrigger>
        </TabsList>

        {/* Micro-Tasks Management */}
        <TabsContent value="micro" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Micro-Tasks</h2>
            <Dialog open={microDialogOpen} onOpenChange={setMicroDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-micro-task">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Micro-Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Micro-Task</DialogTitle>
                  <DialogDescription>Create a quiz-style political literacy task</DialogDescription>
                </DialogHeader>
                <Form {...microForm}>
                  <form onSubmit={microForm.handleSubmit(onSubmitMicroTask)} className="space-y-4">
                    <FormField
                      control={microForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-micro-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={microForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-micro-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={microForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-micro-category">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="politics">Politics</SelectItem>
                                <SelectItem value="policy">Policy</SelectItem>
                                <SelectItem value="history">History</SelectItem>
                                <SelectItem value="governance">Governance</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={microForm.control}
                        name="points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Points</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-micro-points"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={microForm.control}
                        name="timeEstimate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Estimate</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="5 minutes" data-testid="input-micro-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Options</Label>
                      <div className="flex gap-2">
                        <Input
                          value={optionInput}
                          onChange={(e) => setOptionInput(e.target.value)}
                          placeholder="Enter an option"
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOption())}
                          data-testid="input-option"
                        />
                        <Button type="button" onClick={handleAddOption} data-testid="button-add-option">
                          Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {options.map((option, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span>{option}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOption(index)}
                              data-testid={`button-remove-option-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <FormField
                      control={microForm.control}
                      name="correctAnswers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correct Answer(s)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange([parseInt(value)])}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-correct-answer">
                                <SelectValue placeholder="Select correct answer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {options.map((option, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createMicroTask.isPending} data-testid="button-submit-micro-task">
                      {createMicroTask.isPending ? "Creating..." : "Create Micro-Task"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Micro-Tasks</CardTitle>
              <CardDescription>Manage quiz-style political literacy tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {microTasks?.data.map((task) => (
                    <TableRow key={task.id} data-testid={`row-micro-task-${task.id}`}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.category}</Badge>
                      </TableCell>
                      <TableCell>{task.points} pts</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMicroTask.mutate(task.id)}
                          data-testid={`button-delete-micro-${task.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Volunteer Tasks Management */}
        <TabsContent value="volunteer" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Volunteer Tasks</h2>
            <Dialog open={volunteerDialogOpen} onOpenChange={setVolunteerDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-volunteer-task">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Volunteer Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Volunteer Task</DialogTitle>
                  <DialogDescription>Create a campaign or event volunteer opportunity</DialogDescription>
                </DialogHeader>
                <Form {...volunteerForm}>
                  <form onSubmit={volunteerForm.handleSubmit(onSubmitVolunteerTask)} className="space-y-4">
                    <FormField
                      control={volunteerForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-volunteer-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={volunteerForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-volunteer-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={volunteerForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-volunteer-category">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="campaign">Campaign</SelectItem>
                                <SelectItem value="event">Event</SelectItem>
                                <SelectItem value="outreach">Outreach</SelectItem>
                                <SelectItem value="social_media">Social Media</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={volunteerForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-volunteer-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={volunteerForm.control}
                        name="points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Points</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-volunteer-points"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={volunteerForm.control}
                        name="difficulty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-volunteer-difficulty">
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
                      <FormField
                        control={volunteerForm.control}
                        name="maxVolunteers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Volunteers</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                data-testid="input-volunteer-max"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Required Skills</Label>
                      <div className="flex gap-2">
                        <Input
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          placeholder="Enter a skill"
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                          data-testid="input-skill"
                        />
                        <Button type="button" onClick={handleAddSkill} data-testid="button-add-skill">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="gap-2">
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(index)}
                              className="text-muted-foreground hover:text-foreground"
                              data-testid={`button-remove-skill-${index}`}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createVolunteerTask.isPending} data-testid="button-submit-volunteer-task">
                      {createVolunteerTask.isPending ? "Creating..." : "Create Volunteer Task"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Volunteer Tasks</CardTitle>
              <CardDescription>Manage volunteer opportunities and campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Volunteers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteerTasks?.data.map((task) => (
                    <TableRow key={task.id} data-testid={`row-volunteer-task-${task.id}`}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{task.location}</TableCell>
                      <TableCell>{task.points} pts</TableCell>
                      <TableCell>
                        {task.currentVolunteers || 0} / {task.maxVolunteers || "∞"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={task.status === "open" ? "default" : "secondary"}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteVolunteerTask.mutate(task.id)}
                          data-testid={`button-delete-volunteer-${task.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
