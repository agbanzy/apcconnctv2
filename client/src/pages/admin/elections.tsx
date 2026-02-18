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
import { Plus, Edit, Trash2, Vote } from "lucide-react";
import { format } from "date-fns";

interface Election {
  id: string;
  title: string;
  description?: string;
  position: string;
  stateId?: string;
  lgaId?: string;
  wardId?: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "ongoing" | "completed";
  totalVotes: number;
  candidates?: any[];
  createdAt: string;
}

const electionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  position: z.string().min(2, "Position is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.enum(["upcoming", "ongoing", "completed"]).default("upcoming"),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

type ElectionFormData = z.infer<typeof electionSchema>;

export default function AdminElections() {
  const { toast } = useToast();
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [deleteElectionId, setDeleteElectionId] = useState<string | null>(null);

  const { data, isLoading } = useResourceList<Election>("/api/admin/elections", filters);
  const { create, update, remove } = useResourceMutations<Election>("/api/admin/elections");

  const form = useForm<ElectionFormData>({
    resolver: zodResolver(electionSchema),
    defaultValues: {
      title: "",
      description: "",
      position: "",
      startDate: "",
      endDate: "",
      status: "upcoming",
    },
  });

  const columns: Column<Election>[] = [
    {
      key: "title",
      header: "Election",
      render: (election) => (
        <div className="max-w-md" data-testid={`text-title-${election.id}`}>
          <p className="font-medium">{election.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{election.position}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (election) => (
        <Badge
          variant={
            election.status === "ongoing"
              ? "default"
              : election.status === "completed"
              ? "secondary"
              : "outline"
          }
          data-testid={`badge-status-${election.id}`}
        >
          {election.status}
        </Badge>
      ),
    },
    {
      key: "startDate",
      header: "Dates",
      sortable: true,
      render: (election) => (
        <div className="text-sm" data-testid={`text-dates-${election.id}`}>
          <p>{format(new Date(election.startDate), "MMM d, yyyy")}</p>
          <p className="text-muted-foreground">to {format(new Date(election.endDate), "MMM d, yyyy")}</p>
        </div>
      ),
    },
    {
      key: "totalVotes",
      header: "Total Votes",
      sortable: true,
      render: (election) => (
        <div className="flex items-center gap-2" data-testid={`text-votes-${election.id}`}>
          <Vote className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{election.totalVotes || 0}</span>
        </div>
      ),
    },
    {
      key: "candidates",
      header: "Candidates",
      render: (election) => (
        <span className="font-mono" data-testid={`text-candidates-${election.id}`}>
          {election.candidates?.length || 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (election) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingElection(election);
              form.reset({
                title: election.title,
                description: election.description || "",
                position: election.position,
                startDate: election.startDate?.split('T')[0] || "",
                endDate: election.endDate?.split('T')[0] || "",
                status: election.status as "upcoming" | "ongoing" | "completed",
              });
              setDrawerOpen(true);
            }}
            data-testid={`button-edit-${election.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteElectionId(election.id)}
            data-testid={`button-delete-${election.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = async (data: ElectionFormData) => {
    try {
      if (editingElection) {
        await update.mutateAsync({ id: editingElection.id, data });
        toast({ title: "Success", description: "Election updated successfully" });
      } else {
        await create.mutateAsync(data);
        toast({ title: "Success", description: "Election created successfully" });
      }

      setDrawerOpen(false);
      setEditingElection(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save election",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteElectionId) return;

    try {
      await remove.mutateAsync(deleteElectionId);
      toast({ title: "Success", description: "Election deleted successfully" });
      setDeleteElectionId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete election",
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
          { label: "Elections" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Elections Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage voting elections and monitor results
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingElection(null);
            form.reset();
            setDrawerOpen(true);
          }}
          data-testid="button-create-election">
          <Plus className="h-4 w-4 mr-2" />
          Create Election
        </Button>
      </div>

      <Card className="p-6">
        <ResourceToolbar
          searchValue={filters.search || ""}
          onSearchChange={(value) => updateFilter("search", value)}
          filterSlot={
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                updateFilter("status", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
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
            endpoint="/api/admin/elections/export"
            filters={filters}
            filename={`elections_${Date.now()}.csv`}
            label="Export to CSV"
          />
        </div>
      </Card>

      <ResourceDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingElection(null);
          form.reset();
        }}
        title={editingElection ? "Edit Election" : "Create Election"}
        description={editingElection ? "Update election details" : "Create a new election"}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Election Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 2024 Presidential Election"
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
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-position">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="President">President</SelectItem>
                      <SelectItem value="Governor">Governor</SelectItem>
                      <SelectItem value="Senator">Senator</SelectItem>
                      <SelectItem value="House of Representatives">House of Representatives</SelectItem>
                      <SelectItem value="State Assembly">State Assembly</SelectItem>
                      <SelectItem value="LGA Chairman">LGA Chairman</SelectItem>
                      <SelectItem value="Councillor">Councillor</SelectItem>
                      <SelectItem value="Party Chairman">Party Chairman</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Election description..."
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
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
                  setEditingElection(null);
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
                  : editingElection
                  ? "Update Election"
                  : "Create Election"}
              </Button>
            </div>
          </form>
        </Form>
      </ResourceDrawer>

      <AlertDialog open={!!deleteElectionId} onOpenChange={() => setDeleteElectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Election</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this election? This action cannot be undone.
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
