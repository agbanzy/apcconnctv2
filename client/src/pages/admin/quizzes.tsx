import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Plus, Edit, Trash2, Eye } from "lucide-react";

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string | null;
  points: number;
  createdAt: string;
}

const quizSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters"),
  option1: z.string().min(1, "Option 1 is required"),
  option2: z.string().min(1, "Option 2 is required"),
  option3: z.string().min(1, "Option 3 is required"),
  option4: z.string().min(1, "Option 4 is required"),
  correctAnswer: z.coerce.number().min(0).max(3),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  explanation: z.string().optional(),
  points: z.coerce.number().min(1, "Points must be at least 1"),
});

type QuizFormData = z.infer<typeof quizSchema>;

export default function AdminQuizzes() {
  const { toast } = useToast();
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [deleteQuizId, setDeleteQuizId] = useState<string | null>(null);

  const { data, isLoading } = useResourceList<Quiz>("/api/admin/quizzes", filters);
  const { create, update, remove } = useResourceMutations<Quiz>("/api/admin/quizzes");

  const form = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      question: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correctAnswer: 0,
      category: "",
      difficulty: "medium",
      explanation: "",
      points: 10,
    },
  });

  const columns: Column<Quiz>[] = [
    {
      key: "question",
      header: "Question",
      render: (quiz) => (
        <div className="max-w-md" data-testid={`text-question-${quiz.id}`}>
          <p className="font-medium truncate">{quiz.question}</p>
          <p className="text-xs text-muted-foreground mt-1">{quiz.category}</p>
        </div>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      sortable: true,
      render: (quiz) => (
        <Badge
          variant={
            quiz.difficulty === "easy"
              ? "default"
              : quiz.difficulty === "medium"
              ? "outline"
              : "destructive"
          }
          data-testid={`badge-difficulty-${quiz.id}`}
        >
          {quiz.difficulty}
        </Badge>
      ),
    },
    {
      key: "points",
      header: "Points",
      sortable: true,
      render: (quiz) => (
        <span className="font-mono" data-testid={`text-points-${quiz.id}`}>
          {quiz.points}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (quiz) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingQuiz(quiz);
              form.reset({
                question: quiz.question,
                option1: quiz.options[0],
                option2: quiz.options[1],
                option3: quiz.options[2],
                option4: quiz.options[3],
                correctAnswer: quiz.correctAnswer,
                category: quiz.category,
                difficulty: quiz.difficulty,
                explanation: quiz.explanation || "",
                points: quiz.points,
              });
              setDrawerOpen(true);
            }}
            data-testid={`button-edit-${quiz.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteQuizId(quiz.id)}
            data-testid={`button-delete-${quiz.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = async (data: QuizFormData) => {
    try {
      const quizData = {
        question: data.question,
        options: [data.option1, data.option2, data.option3, data.option4],
        correctAnswer: data.correctAnswer,
        category: data.category,
        difficulty: data.difficulty,
        explanation: data.explanation || null,
        points: data.points,
      };

      if (editingQuiz) {
        await update.mutateAsync({ id: editingQuiz.id, data: quizData });
        toast({ title: "Success", description: "Quiz updated successfully" });
      } else {
        await create.mutateAsync(quizData);
        toast({ title: "Success", description: "Quiz created successfully" });
      }

      setDrawerOpen(false);
      setEditingQuiz(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save quiz",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteQuizId) return;

    try {
      await remove.mutateAsync(deleteQuizId);
      toast({ title: "Success", description: "Quiz deleted successfully" });
      setDeleteQuizId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete quiz",
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
          { label: "Quiz Management" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Quiz Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage political literacy quizzes
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingQuiz(null);
            form.reset();
            setDrawerOpen(true);
          }}
          data-testid="button-create-quiz"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Quiz
        </Button>
      </div>

      <Card className="p-6">
        <ResourceToolbar
          searchValue={filters.search || ""}
          onSearchChange={(value) => updateFilter("search", value)}
          filterSlot={
            <div className="flex gap-2">
              <Select
                value={filters.category || "all"}
                onValueChange={(value) =>
                  updateFilter("category", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="History">History</SelectItem>
                  <SelectItem value="Governance">Governance</SelectItem>
                  <SelectItem value="Constitution">Constitution</SelectItem>
                  <SelectItem value="Politics">Politics</SelectItem>
                  <SelectItem value="Economy">Economy</SelectItem>
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
            endpoint="/api/admin/quizzes/export"
            filters={filters}
            filename={`quizzes_${Date.now()}.csv`}
            label="Export to CSV"
          />
        </div>
      </Card>

      <ResourceDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingQuiz(null);
          form.reset();
        }}
        title={editingQuiz ? "Edit Quiz" : "Create Quiz"}
        description={editingQuiz ? "Update quiz details" : "Add a new quiz question"}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter quiz question..."
                      {...field}
                      data-testid="input-question"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Answer Options</FormLabel>
              {["option1", "option2", "option3", "option4"].map((optionName, index) => (
                <FormField
                  key={optionName}
                  control={form.control}
                  name={optionName as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder={`Option ${index + 1}`}
                          {...field}
                          data-testid={`input-${optionName}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormField
              control={form.control}
              name="correctAnswer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correct Answer</FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-correct-answer">
                        <SelectValue placeholder="Select correct answer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Option 1</SelectItem>
                      <SelectItem value="1">Option 2</SelectItem>
                      <SelectItem value="2">Option 3</SelectItem>
                      <SelectItem value="3">Option 4</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="History">History</SelectItem>
                        <SelectItem value="Governance">Governance</SelectItem>
                        <SelectItem value="Constitution">Constitution</SelectItem>
                        <SelectItem value="Politics">Politics</SelectItem>
                        <SelectItem value="Economy">Economy</SelectItem>
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

            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Points awarded for correct answer"
                      {...field}
                      data-testid="input-points"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain the correct answer..."
                      {...field}
                      data-testid="input-explanation"
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
                  setEditingQuiz(null);
                  form.reset();
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
                  : editingQuiz
                  ? "Update Quiz"
                  : "Create Quiz"}
              </Button>
            </div>
          </form>
        </Form>
      </ResourceDrawer>

      <AlertDialog open={!!deleteQuizId} onOpenChange={() => setDeleteQuizId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quiz? This action cannot be undone.
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
