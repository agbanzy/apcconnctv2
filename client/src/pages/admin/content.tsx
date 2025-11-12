import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Eye, Edit, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const newsSchema = z.object({
  title: z.string().min(3, "Title required"),
  content: z.string().min(10, "Content required"),
  category: z.string().min(3, "Category required"),
});

const quizSchema = z.object({
  question: z.string().min(10, "Question required"),
  category: z.string().min(3, "Category required"),
  points: z.string().min(1, "Points required"),
});

const taskSchema = z.object({
  title: z.string().min(3, "Title required"),
  description: z.string().min(10, "Description required"),
  location: z.string().min(3, "Location required"),
  difficulty: z.string().min(1, "Difficulty required"),
  points: z.string().min(1, "Points required"),
});

export default function AdminContent() {
  const { toast } = useToast();
  const [newsDialogOpen, setNewsDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const { data: newsData } = useQuery<{ data: any[] }>({ queryKey: ["/api/news"] });
  const { data: quizzesData } = useQuery<{ data: any[] }>({ queryKey: ["/api/quizzes"] });
  const { data: tasksData } = useQuery<{ data: any[] }>({ queryKey: ["/api/tasks"] });
  const { data: microTasksData } = useQuery<{ data: any[] }>({ queryKey: ["/api/tasks/micro"] });

  const newsForm = useForm({
    resolver: zodResolver(newsSchema),
    defaultValues: { title: "", content: "", category: "" },
  });

  const quizForm = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: { question: "", category: "", points: "" },
  });

  const taskForm = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", location: "", difficulty: "", points: "" },
  });

  const createNewsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/news", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({ title: "Success", description: "News post created" });
      setNewsDialogOpen(false);
      newsForm.reset();
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/quizzes", {
      ...data,
      points: parseInt(data.points),
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      correctAnswer: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      toast({ title: "Success", description: "Quiz created" });
      setQuizDialogOpen(false);
      quizForm.reset();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tasks", {
      ...data,
      points: parseInt(data.points),
      skills: [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task created" });
      setTaskDialogOpen(false);
      taskForm.reset();
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => 
      apiRequest("DELETE", `/api/${type}/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/${variables.type}`] });
      toast({ title: "Success", description: "Content deleted" });
    },
  });

  const news = newsData?.data || [];
  const quizzes = quizzesData?.data || [];
  const tasks = tasksData?.data || [];
  const microTasks = microTasksData?.data || [];

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Content' }]} />
      
      <div>
        <h1 className="font-display text-3xl font-bold" data-testid="text-content-title">Content Management</h1>
        <p className="text-muted-foreground mt-1">Manage news, quizzes, tasks, and micro-tasks</p>
      </div>

      <Tabs defaultValue="news" className="space-y-4">
        <TabsList>
          <TabsTrigger value="news" data-testid="tab-news">News Posts</TabsTrigger>
          <TabsTrigger value="quizzes" data-testid="tab-quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">Volunteer Tasks</TabsTrigger>
          <TabsTrigger value="micro-tasks" data-testid="tab-micro-tasks">Micro-tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setNewsDialogOpen(true)} data-testid="button-create-news">
              <Plus className="h-4 w-4 mr-2" />
              Create News Post
            </Button>
          </div>
          <div className="grid gap-4">
            {news.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No news posts
                </CardContent>
              </Card>
            ) : (
              news.map((item: any) => (
                <Card key={item.id} data-testid={`news-card-${item.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{item.title}</CardTitle>
                        <Badge variant="secondary" className="mt-2">{item.category}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" data-testid={`button-edit-news-${item.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteContentMutation.mutate({ type: 'news', id: item.id })}
                          data-testid={`button-delete-news-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setQuizDialogOpen(true)} data-testid="button-create-quiz">
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </div>
          <div className="grid gap-4">
            {quizzes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No quizzes
                </CardContent>
              </Card>
            ) : (
              quizzes.map((quiz: any) => (
                <Card key={quiz.id} data-testid={`quiz-card-${quiz.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{quiz.question}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{quiz.category}</Badge>
                          <Badge variant="outline">{quiz.points} points</Badge>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteContentMutation.mutate({ type: 'quizzes', id: quiz.id })}
                        data-testid={`button-delete-quiz-${quiz.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setTaskDialogOpen(true)} data-testid="button-create-task">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </div>
          <div className="grid gap-4">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No volunteer tasks
                </CardContent>
              </Card>
            ) : (
              tasks.map((task: any) => (
                <Card key={task.id} data-testid={`task-card-${task.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{task.title}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{task.difficulty}</Badge>
                          <Badge variant="outline">{task.points} points</Badge>
                          <Badge>{task.status}</Badge>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteContentMutation.mutate({ type: 'tasks', id: task.id })}
                        data-testid={`button-delete-task-${task.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    <p className="text-sm text-muted-foreground mt-2">📍 {task.location}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="micro-tasks" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="button-create-micro-task">
              <Plus className="h-4 w-4 mr-2" />
              Create Micro-task
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {microTasks.length === 0 ? "No micro-tasks" : `${microTasks.length} micro-tasks`}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={newsDialogOpen} onOpenChange={setNewsDialogOpen}>
        <DialogContent data-testid="dialog-create-news">
          <DialogHeader>
            <DialogTitle>Create News Post</DialogTitle>
          </DialogHeader>
          <Form {...newsForm}>
            <form onSubmit={newsForm.handleSubmit((data) => createNewsMutation.mutate(data))} className="space-y-4">
              <FormField
                control={newsForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-news-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newsForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-news-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newsForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} data-testid="input-news-content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="button-submit-news">Create</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent data-testid="dialog-create-quiz">
          <DialogHeader>
            <DialogTitle>Create Quiz</DialogTitle>
          </DialogHeader>
          <Form {...quizForm}>
            <form onSubmit={quizForm.handleSubmit((data) => createQuizMutation.mutate(data))} className="space-y-4">
              <FormField
                control={quizForm.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="input-quiz-question" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={quizForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-quiz-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={quizForm.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-quiz-points" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setQuizDialogOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="button-submit-quiz">Create</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent data-testid="dialog-create-task">
          <DialogHeader>
            <DialogTitle>Create Volunteer Task</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit((data) => createTaskMutation.mutate(data))} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-task-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="input-task-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-task-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-difficulty">
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
                  control={taskForm.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" data-testid="input-task-points" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="button-submit-task">Create</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
