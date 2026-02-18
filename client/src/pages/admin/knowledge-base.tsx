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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Edit, Trash2, BookOpen, Eye } from "lucide-react";
import { format } from "date-fns";

interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  category: { name: string; slug: string } | null;
  categoryId?: string;
  type: "article" | "faq";
  tags: string[];
  published: boolean;
  viewsCount: number;
  helpfulCount?: number;
  createdAt: string;
  author?: { firstName: string; lastName: string; email: string } | null;
}

const knowledgeBaseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  content: z.string().min(20, "Content must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  type: z.enum(["article", "faq"]),
  tags: z.string().optional(),
  published: z.boolean(),
});

type KnowledgeBaseFormData = z.infer<typeof knowledgeBaseSchema>;

export default function AdminKnowledgeBase() {
  const { toast } = useToast();
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingKB, setEditingKB] = useState<KnowledgeBase | null>(null);
  const [deleteKBId, setDeleteKBId] = useState<string | null>(null);

  const { data, isLoading } = useResourceList<KnowledgeBase>("/api/admin/knowledge-base", filters);
  const { create, update, remove } = useResourceMutations<KnowledgeBase>("/api/admin/knowledge-base");

  const form = useForm<KnowledgeBaseFormData>({
    resolver: zodResolver(knowledgeBaseSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "",
      type: "article",
      tags: "",
      published: false,
    },
  });

  const columns: Column<KnowledgeBase>[] = [
    {
      key: "title",
      header: "Title",
      render: (kb) => (
        <div className="max-w-md" data-testid={`text-title-${kb.id}`}>
          <p className="font-medium">{kb.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{kb.category?.name || "Uncategorized"}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (kb) => (
        <Badge
          variant={kb.type === "article" ? "default" : "outline"}
          data-testid={`badge-type-${kb.id}`}
        >
          {kb.type}
        </Badge>
      ),
    },
    {
      key: "published",
      header: "Status",
      sortable: true,
      render: (kb) => (
        <Badge
          variant={kb.published ? "default" : "outline"}
          data-testid={`badge-published-${kb.id}`}
        >
          {kb.published ? "Published" : "Draft"}
        </Badge>
      ),
    },
    {
      key: "views",
      header: "Views",
      sortable: true,
      render: (kb) => (
        <div className="flex items-center gap-2" data-testid={`text-views-${kb.id}`}>
          <Eye className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-mono">{kb.viewsCount || 0}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (kb) => (
        <span className="text-sm" data-testid={`text-created-${kb.id}`}>
          {format(new Date(kb.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (kb) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingKB(kb);
              form.reset({
                title: kb.title,
                content: kb.content,
                category: kb.categoryId || kb.category?.slug || "",
                type: kb.type,
                tags: kb.tags?.join(", ") || "",
                published: kb.published,
              });
              setDrawerOpen(true);
            }}
            data-testid={`button-edit-${kb.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteKBId(kb.id)}
            data-testid={`button-delete-${kb.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = async (data: KnowledgeBaseFormData) => {
    try {
      const kbData = {
        title: data.title,
        content: data.content,
        category: data.category,
        type: data.type,
        tags: data.tags ? data.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
        published: data.published,
      };

      if (editingKB) {
        await update.mutateAsync({ id: editingKB.id, data: kbData });
        toast({ title: "Success", description: "Knowledge base article updated successfully" });
      } else {
        await create.mutateAsync(kbData);
        toast({ title: "Success", description: "Knowledge base article created successfully" });
      }

      setDrawerOpen(false);
      setEditingKB(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save knowledge base article",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteKBId) return;

    try {
      await remove.mutateAsync(deleteKBId);
      toast({ title: "Success", description: "Knowledge base article deleted successfully" });
      setDeleteKBId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete knowledge base article",
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
          { label: "Knowledge Base" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage articles and FAQs for the community
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingKB(null);
            form.reset();
            setDrawerOpen(true);
          }}
          data-testid="button-create-article"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Article
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
                  <SelectItem value="Getting Started">Getting Started</SelectItem>
                  <SelectItem value="Voting">Voting</SelectItem>
                  <SelectItem value="Events">Events</SelectItem>
                  <SelectItem value="Rewards">Rewards</SelectItem>
                </SelectContent>
              </Select>

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
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.published !== undefined ? String(filters.published) : "all"}
                onValueChange={(value) =>
                  updateFilter("published", value === "all" ? undefined : value === "true")
                }
              >
                <SelectTrigger className="w-[150px]" data-testid="select-filter-published">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Published</SelectItem>
                  <SelectItem value="false">Draft</SelectItem>
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
            endpoint="/api/admin/knowledge-base/export"
            filters={filters}
            filename={`knowledge_base_${Date.now()}.csv`}
            label="Export to CSV"
          />
        </div>
      </Card>

      <ResourceDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingKB(null);
          form.reset();
        }}
        title={editingKB ? "Edit Article" : "Create Article"}
        description={editingKB ? "Update article details" : "Add a new knowledge base article"}
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
                      placeholder="Article title"
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Article content..."
                      rows={10}
                      {...field}
                      data-testid="input-content"
                    />
                  </FormControl>
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
                        <SelectItem value="Getting Started">Getting Started</SelectItem>
                        <SelectItem value="Voting">Voting</SelectItem>
                        <SelectItem value="Events">Events</SelectItem>
                        <SelectItem value="Rewards">Rewards</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="faq">FAQ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="voting, rewards, events (comma-separated)"
                      {...field}
                      data-testid="input-tags"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter tags separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Published</FormLabel>
                    <FormDescription>
                      Make this article visible to users
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-published"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDrawerOpen(false);
                  setEditingKB(null);
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
                  : editingKB
                  ? "Update Article"
                  : "Create Article"}
              </Button>
            </div>
          </form>
        </Form>
      </ResourceDrawer>

      <AlertDialog open={!!deleteKBId} onOpenChange={() => setDeleteKBId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this knowledge base article? This action cannot be undone.
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
