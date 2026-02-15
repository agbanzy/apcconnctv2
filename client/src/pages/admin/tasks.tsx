import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResourceToolbar } from "@/components/admin/ResourceToolbar";
import { ResourceTable, Column } from "@/components/admin/ResourceTable";
import { ResourceDrawer } from "@/components/admin/ResourceDrawer";
import { useResourceController } from "@/hooks/use-resource-controller";
import { useResourceList } from "@/hooks/use-resource-list";
import { useResourceMutations } from "@/hooks/use-resource-mutations";
import { ExportButton } from "@/components/admin/ExportButton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, CheckSquare, Users } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string;
  type: "volunteer" | "micro";
  difficulty: "easy" | "medium" | "hard";
  status: "open" | "in_progress" | "completed" | "cancelled";
  points: number;
  deadline: string | null;
  maxAssignees: number | null;
  assigneeCount?: number;
  createdAt: string;
  taskCategory?: string;
  taskScope?: string;
  stateId?: string | null;
  lgaId?: string | null;
  wardId?: string | null;
  cooldownHours?: number;
  maxCompletionsTotal?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

const taskSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  type: z.enum(["volunteer", "micro"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
  points: z.coerce.number().min(0, "Points must be at least 0"),
  deadline: z.string().optional(),
  maxAssignees: z.coerce.number().nullable().optional(),
  taskCategory: z.enum(["outreach", "canvassing", "social_media", "community_service", "data_collection", "education", "event_support", "fundraising", "monitoring", "content_creation", "membership_drive", "general"]).optional().default("general"),
  taskScope: z.enum(["national", "state", "lga", "ward"]).optional().default("national"),
  stateId: z.string().nullable().optional(),
  lgaId: z.string().nullable().optional(),
  wardId: z.string().nullable().optional(),
  cooldownHours: z.coerce.number().min(0).optional().default(0),
  maxCompletionsTotal: z.coerce.number().min(0).nullable().optional(),
  expiresAt: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

const categoryLabels: Record<string, string> = {
  outreach: "Outreach",
  canvassing: "Canvassing",
  social_media: "Social Media",
  community_service: "Community Service",
  data_collection: "Data Collection",
  education: "Education",
  event_support: "Event Support",
  fundraising: "Fundraising",
  monitoring: "Monitoring",
  content_creation: "Content Creation",
  membership_drive: "Membership Drive",
  general: "General",
};

const scopeLabels: Record<string, string> = {
  national: "National",
  state: "State",
  lga: "LGA",
  ward: "Ward",
};

export default function AdminTasks() {
  const { toast } = useToast();
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<string>("");
  const [selectedLgaId, setSelectedLgaId] = useState<string>("");

  const { data, isLoading } = useResourceList<Task>("/api/admin/tasks", filters);
  const { create, update, remove } = useResourceMutations<Task>("/api/admin/tasks");

  const { data: statesData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/locations/states"],
  });

  const { data: lgasData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/locations/lgas", selectedStateId],
    enabled: !!selectedStateId,
  });

  const { data: wardsData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/locations/wards", selectedLgaId],
    enabled: !!selectedLgaId,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "volunteer",
      difficulty: "medium",
      status: "open",
      points: 50,
      deadline: "",
      maxAssignees: null,
      taskCategory: "general",
      taskScope: "national",
      stateId: null,
      lgaId: null,
      wardId: null,
      cooldownHours: 0,
      maxCompletionsTotal: null,
      expiresAt: "",
    },
  });

  const watchedScope = form.watch("taskScope");

  const columns: Column<Task>[] = [
    {
      key: "title",
      header: "Task",
      render: (task) => (
        <div className="max-w-md" data-testid={`text-title-${task.id}`}>
          <p className="font-medium">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {task.type}
            </Badge>
            <span className="text-xs text-muted-foreground">{task.difficulty}</span>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (task) => (
        <span className="text-sm" data-testid={`text-category-${task.id}`}>
          {categoryLabels[task.taskCategory || "general"] || task.taskCategory}
        </span>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (task) => (
        <Badge variant="outline" data-testid={`badge-scope-${task.id}`}>
          {scopeLabels[task.taskScope || "national"] || task.taskScope}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (task) => (
        <Badge
          variant={
            task.status === "completed"
              ? "default"
              : task.status === "in_progress"
              ? "outline"
              : task.status === "cancelled"
              ? "destructive"
              : "outline"
          }
          data-testid={`badge-status-${task.id}`}
        >
          {task.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "points",
      header: "Points",
      sortable: true,
      render: (task) => (
        <span className="text-sm font-mono" data-testid={`text-points-${task.id}`}>
          {task.points}
        </span>
      ),
    },
    {
      key: "assignees",
      header: "Assignees",
      render: (task) => (
        <div className="flex items-center gap-2" data-testid={`text-assignees-${task.id}`}>
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-mono">
            {task.assigneeCount || 0}
            {task.maxAssignees ? ` / ${task.maxAssignees}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "deadline",
      header: "Deadline",
      sortable: true,
      render: (task) => (
        <span className="text-sm" data-testid={`text-deadline-${task.id}`}>
          {task.deadline ? format(new Date(task.deadline), "MMM d, yyyy") : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (task) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingTask(task);
              form.reset({
                title: task.title,
                description: task.description,
                type: task.type,
                difficulty: task.difficulty,
                status: task.status,
                points: task.points,
                deadline: task.deadline
                  ? format(new Date(task.deadline), "yyyy-MM-dd")
                  : "",
                maxAssignees: task.maxAssignees,
                taskCategory: (task.taskCategory as any) || "general",
                taskScope: (task.taskScope as any) || "national",
                stateId: task.stateId || null,
                lgaId: task.lgaId || null,
                wardId: task.wardId || null,
                cooldownHours: task.cooldownHours || 0,
                maxCompletionsTotal: task.maxCompletionsTotal ?? null,
                expiresAt: task.expiresAt
                  ? format(new Date(task.expiresAt), "yyyy-MM-dd'T'HH:mm")
                  : "",
              });
              if (task.stateId) setSelectedStateId(task.stateId);
              if (task.lgaId) setSelectedLgaId(task.lgaId);
              setDrawerOpen(true);
            }}
            data-testid={`button-edit-${task.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTaskId(task.id)}
            data-testid={`button-delete-${task.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = async (data: TaskFormData) => {
    try {
      const taskData = {
        title: data.title,
        description: data.description,
        type: data.type,
        difficulty: data.difficulty,
        status: data.status,
        points: data.points,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
        maxAssignees: data.maxAssignees || null,
        taskCategory: data.taskCategory || "general",
        taskScope: data.taskScope || "national",
        stateId: data.taskScope !== "national" ? data.stateId : null,
        lgaId: data.taskScope === "lga" || data.taskScope === "ward" ? data.lgaId : null,
        wardId: data.taskScope === "ward" ? data.wardId : null,
        cooldownHours: data.cooldownHours || 0,
        maxCompletionsTotal: data.maxCompletionsTotal || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      };

      if (editingTask) {
        await update.mutateAsync({ id: editingTask.id, data: taskData });
        toast({ title: "Success", description: "Task updated successfully" });
      } else {
        await create.mutateAsync(taskData);
        toast({ title: "Success", description: "Task created successfully" });
      }

      setDrawerOpen(false);
      setEditingTask(null);
      form.reset();
      setSelectedStateId("");
      setSelectedLgaId("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save task",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;

    try {
      await remove.mutateAsync(deleteTaskId);
      toast({ title: "Success", description: "Task deleted successfully" });
      setDeleteTaskId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleSort = (column: string) => {
    const newSortOrder =
      filters.sortBy === column && filters.sortOrder === "desc" ? "asc" : "desc";
    setFilters({ ...filters, sortBy: column, sortOrder: newSortOrder });
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Task Management" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Task Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage volunteer and micro-tasks
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            form.reset();
            setSelectedStateId("");
            setSelectedLgaId("");
            setDrawerOpen(true);
          }}
          data-testid="button-create-task"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      <Card className="p-6">
        <ResourceToolbar
          searchValue={filters.search || ""}
          onSearchChange={(value) => updateFilter("search", value)}
          filterSlot={
            <div className="flex gap-2">
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  updateFilter("type", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[150px]" data-testid="select-filter-type">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="micro">Micro</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  updateFilter("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.difficulty || "all"}
                onValueChange={(value) =>
                  updateFilter("difficulty", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[150px]" data-testid="select-filter-difficulty">
                  <SelectValue placeholder="Filter by difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        <div className="mt-6">
          <ResourceTable
            columns={columns}
            data={data?.data || []}
            isLoading={isLoading}
            currentPage={filters.page}
            totalPages={data?.totalPages || 1}
            onPageChange={(page) => updateFilter("page", page)}
            onSort={handleSort}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder as "asc" | "desc"}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <ExportButton
            endpoint="/api/admin/tasks/export"
            filters={filters}
            filename={`tasks_${Date.now()}.csv`}
            label="Export to CSV"
          />
        </div>
      </Card>

      <ResourceDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingTask(null);
          form.reset();
          setSelectedStateId("");
          setSelectedLgaId("");
        }}
        title={editingTask ? "Edit Task" : "Create Task"}
        description={editingTask ? "Update task details" : "Add a new task"}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Task title"
                      {...field}
                      data-testid="input-title"
                    />
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
                      placeholder="Task description..."
                      rows={5}
                      {...field}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="micro">Micro</SelectItem>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Points reward"
                        {...field}
                        data-testid="input-points"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-deadline"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxAssignees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Assignees (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-max-assignees"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taskCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Category</FormLabel>
                    <Select value={field.value || "general"} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
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
                    <Select
                      value={field.value || "national"}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "national") {
                          form.setValue("stateId", null);
                          form.setValue("lgaId", null);
                          form.setValue("wardId", null);
                          setSelectedStateId("");
                          setSelectedLgaId("");
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-task-scope">
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(scopeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {watchedScope && watchedScope !== "national" && (
              <div className="grid grid-cols-2 gap-4">
                {(watchedScope === "state" || watchedScope === "lga" || watchedScope === "ward") && (
                  <FormField
                    control={form.control}
                    name="stateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedStateId(value);
                            form.setValue("lgaId", null);
                            form.setValue("wardId", null);
                            setSelectedLgaId("");
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(statesData?.data || []).map((state: any) => (
                              <SelectItem key={state.id} value={String(state.id)}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(watchedScope === "lga" || watchedScope === "ward") && (
                  <FormField
                    control={form.control}
                    name="lgaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LGA</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedLgaId(value);
                            form.setValue("wardId", null);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-lga">
                              <SelectValue placeholder="Select LGA" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(lgasData?.data || []).map((lga: any) => (
                              <SelectItem key={lga.id} value={String(lga.id)}>
                                {lga.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedScope === "ward" && (
                  <FormField
                    control={form.control}
                    name="wardId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ward</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-ward">
                              <SelectValue placeholder="Select ward" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(wardsData?.data || []).map((ward: any) => (
                              <SelectItem key={ward.id} value={String(ward.id)}>
                                {ward.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
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
                        placeholder="0"
                        {...field}
                        value={field.value ?? 0}
                        data-testid="input-cooldown-hours"
                      />
                    </FormControl>
                    <FormDescription>Hours between task completions (0 = no cooldown)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxCompletionsTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Total Completions</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-max-completions"
                      />
                    </FormControl>
                    <FormDescription>Maximum times this task can be completed (empty = unlimited)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      data-testid="input-expires-at"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDrawerOpen(false);
                  setEditingTask(null);
                  form.reset();
                  setSelectedStateId("");
                  setSelectedLgaId("");
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || update.isPending}
                data-testid="button-save"
              >
                {create.isPending || update.isPending
                  ? "Saving..."
                  : editingTask
                  ? "Update Task"
                  : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </ResourceDrawer>

      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
