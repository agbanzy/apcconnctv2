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
import { Plus, Edit, Trash2, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  targetDate: string | null;
  status: "active" | "approved" | "rejected";
  votes: number;
  creator?: { firstName: string; lastName: string };
  createdAt: string;
}

const campaignSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  targetDate: z.string().optional(),
  status: z.enum(["active", "approved", "rejected"]),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function AdminCampaigns() {
  const { toast } = useToast();
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useResourceList<Campaign>("/api/admin/campaigns", filters);
  const { create, update, remove } = useResourceMutations<Campaign>("/api/admin/campaigns");

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest("POST", "/api/admin/campaigns/bulk-approve", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "Success", description: "Campaigns approved successfully" });
      setSelectedIds([]);
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest("POST", "/api/admin/campaigns/bulk-reject", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "Success", description: "Campaigns rejected successfully" });
      setSelectedIds([]);
    },
  });

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      targetDate: "",
      status: "active",
    },
  });

  const columns: Column<Campaign>[] = [
    {
      key: "title",
      header: "Title",
      render: (campaign) => (
        <div className="max-w-md" data-testid={`text-title-${campaign.id}`}>
          <p className="font-medium">{campaign.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{campaign.category}</p>
        </div>
      ),
    },
    {
      key: "creator",
      header: "Creator",
      render: (campaign) => (
        <span className="text-sm" data-testid={`text-creator-${campaign.id}`}>
          {campaign.creator
            ? `${campaign.creator.firstName} ${campaign.creator.lastName}`
            : "System"}
        </span>
      ),
    },
    {
      key: "votes",
      header: "Votes",
      sortable: true,
      render: (campaign) => (
        <span className="text-sm font-mono" data-testid={`text-votes-${campaign.id}`}>
          {campaign.votes || 0}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (campaign) => (
        <Badge
          variant={
            campaign.status === "approved"
              ? "default"
              : campaign.status === "active"
              ? "outline"
              : "destructive"
          }
          data-testid={`badge-status-${campaign.id}`}
        >
          {campaign.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (campaign) => (
        <span className="text-sm" data-testid={`text-created-${campaign.id}`}>
          {format(new Date(campaign.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (campaign) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingCampaign(campaign);
              form.reset({
                title: campaign.title,
                description: campaign.description,
                category: campaign.category,
                targetDate: campaign.targetDate
                  ? format(new Date(campaign.targetDate), "yyyy-MM-dd")
                  : "",
                status: campaign.status,
              });
              setDrawerOpen(true);
            }}
            data-testid={`button-edit-${campaign.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteCampaignId(campaign.id)}
            data-testid={`button-delete-${campaign.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = async (data: CampaignFormData) => {
    try {
      const campaignData = {
        title: data.title,
        description: data.description,
        category: data.category,
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
        status: data.status,
      };

      if (editingCampaign) {
        await update.mutateAsync({ id: editingCampaign.id, data: campaignData });
        toast({ title: "Success", description: "Campaign updated successfully" });
      } else {
        await create.mutateAsync(campaignData);
        toast({ title: "Success", description: "Campaign created successfully" });
      }

      setDrawerOpen(false);
      setEditingCampaign(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save campaign",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteCampaignId) return;

    try {
      await remove.mutateAsync(deleteCampaignId);
      toast({ title: "Success", description: "Campaign deleted successfully" });
      setDeleteCampaignId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete campaign",
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
          { label: "Campaign Management" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Campaign Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage community campaigns and initiatives
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCampaign(null);
            form.reset();
            setDrawerOpen(true);
          }}
          data-testid="button-create-campaign"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <Card className="p-6">
        <ResourceToolbar
          searchValue={filters.search || ""}
          onSearchChange={(value) => updateFilter("search", value)}
          filterSlot={
            <div className="flex gap-2">
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  updateFilter("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

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
                  <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Environment">Environment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {selectedIds.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedIds.length} campaign(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => bulkApproveMutation.mutate(selectedIds)}
                disabled={bulkApproveMutation.isPending}
                data-testid="button-bulk-approve"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => bulkRejectMutation.mutate(selectedIds)}
                disabled={bulkRejectMutation.isPending}
                data-testid="button-bulk-reject"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Selected
              </Button>
            </div>
          </div>
        )}

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
            endpoint="/api/admin/campaigns/export"
            filters={filters}
            filename={`campaigns_${Date.now()}.csv`}
            label="Export to CSV"
          />
        </div>
      </Card>

      <ResourceDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingCampaign(null);
          form.reset();
        }}
        title={editingCampaign ? "Edit Campaign" : "Create Campaign"}
        description={editingCampaign ? "Update campaign details" : "Add a new campaign"}
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
                      placeholder="Campaign title"
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
                      placeholder="Campaign description..."
                      rows={6}
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
                        <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Environment">Environment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-target-date"
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
                  setEditingCampaign(null);
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
                  : editingCampaign
                  ? "Update Campaign"
                  : "Create Campaign"}
              </Button>
            </div>
          </form>
        </Form>
      </ResourceDrawer>

      <AlertDialog open={!!deleteCampaignId} onOpenChange={() => setDeleteCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
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
