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
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Incident {
  id: string;
  pollingUnitId: string | null;
  reporterId: string | null;
  severity: "low" | "medium" | "high";
  description: string;
  location: string | null;
  coordinates: { lat: number; lng: number } | null;
  status: "reported" | "investigating" | "resolved";
  createdAt: string;
  pollingUnit?: { name: string; unitCode: string };
  reporter?: { user: { firstName: string; lastName: string } };
  media?: Array<{ id: string; mediaUrl: string; mediaType: string }>;
}

const incidentSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  severity: z.enum(["low", "medium", "high"]),
  location: z.string().optional(),
  status: z.enum(["reported", "investigating", "resolved"]),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export default function AdminIncidents() {
  const { toast } = useToast();
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [deleteIncidentId, setDeleteIncidentId] = useState<string | null>(null);

  const { data, isLoading } = useResourceList<Incident>("/api/admin/incidents", filters);
  const { create, update, remove } = useResourceMutations<Incident>("/api/admin/incidents");

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      description: "",
      severity: "medium",
      location: "",
      status: "reported",
    },
  });

  const columns: Column<Incident>[] = [
    {
      key: "description",
      header: "Description",
      render: (incident) => (
        <div className="max-w-md" data-testid={`text-description-${incident.id}`}>
          <p className="text-sm font-medium truncate">{incident.description.substring(0, 50)}...</p>
        </div>
      ),
    },
    {
      key: "pollingUnit",
      header: "Polling Unit",
      render: (incident) => (
        <span className="text-sm" data-testid={`text-polling-unit-${incident.id}`}>
          {incident.pollingUnit ? incident.pollingUnit.name : "—"}
        </span>
      ),
    },
    {
      key: "reporter",
      header: "Reporter",
      render: (incident) => (
        <span className="text-sm" data-testid={`text-reporter-${incident.id}`}>
          {incident.reporter?.user
            ? `${incident.reporter.user.firstName} ${incident.reporter.user.lastName}`
            : "Anonymous"}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      render: (incident) => (
        <Badge
          variant={
            incident.severity === "high"
              ? "destructive"
              : incident.severity === "medium"
              ? "outline"
              : "default"
          }
          data-testid={`badge-severity-${incident.id}`}
        >
          {incident.severity}
        </Badge>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (incident) => (
        <span className="text-sm" data-testid={`text-location-${incident.id}`}>
          {incident.location || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (incident) => (
        <Badge
          variant={
            incident.status === "resolved"
              ? "default"
              : incident.status === "investigating"
              ? "outline"
              : "destructive"
          }
          data-testid={`badge-status-${incident.id}`}
        >
          {incident.status}
        </Badge>
      ),
    },
    {
      key: "media",
      header: "Media",
      render: (incident) => (
        <span className="text-sm" data-testid={`text-media-count-${incident.id}`}>
          {incident.media ? incident.media.length : 0}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created At",
      sortable: true,
      render: (incident) => (
        <span className="text-sm" data-testid={`text-created-${incident.id}`}>
          {format(new Date(incident.createdAt), "MMM d, yyyy h:mm a")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (incident) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingIncident(incident);
              form.reset({
                description: incident.description,
                severity: incident.severity,
                location: incident.location || "",
                status: incident.status,
              });
              setDrawerOpen(true);
            }}
            data-testid={`button-edit-${incident.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteIncidentId(incident.id)}
            data-testid={`button-delete-${incident.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = async (data: IncidentFormData) => {
    try {
      const incidentData = {
        description: data.description,
        severity: data.severity,
        location: data.location || null,
        status: data.status,
      };

      if (editingIncident) {
        await update.mutateAsync({ id: editingIncident.id, data: incidentData });
        toast({ title: "Success", description: "Incident updated successfully" });
      } else {
        await create.mutateAsync(incidentData);
        toast({ title: "Success", description: "Incident created successfully" });
      }

      setDrawerOpen(false);
      setEditingIncident(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save incident",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteIncidentId) return;

    try {
      await remove.mutateAsync(deleteIncidentId);
      toast({ title: "Success", description: "Incident deleted successfully" });
      setDeleteIncidentId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete incident",
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
          { label: "Incident Management" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Incident Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage reported incidents
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingIncident(null);
            form.reset();
            setDrawerOpen(true);
          }}
          data-testid="button-create-incident"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Incident
        </Button>
      </div>

      <Card className="p-6">
        <ResourceToolbar
          searchValue={filters.search || ""}
          onSearchChange={(value) => updateFilter("search", value)}
          filterSlot={
            <div className="flex gap-2">
              <Select
                value={filters.severity || "all"}
                onValueChange={(value) =>
                  updateFilter("severity", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[150px]" data-testid="select-filter-severity">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
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
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
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
            endpoint="/api/admin/incidents/export"
            filters={filters}
            filename={`incidents_${Date.now()}.csv`}
            label="Export to CSV"
          />
        </div>
      </Card>

      <ResourceDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingIncident(null);
          form.reset();
        }}
        title={editingIncident ? "Edit Incident" : "Create Incident"}
        description={editingIncident ? "Update incident details" : "Add a new incident"}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the incident..."
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
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-severity">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
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
                        <SelectItem value="reported">Reported</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Incident location"
                      {...field}
                      data-testid="input-location"
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
                  setEditingIncident(null);
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
                  : editingIncident
                  ? "Update Incident"
                  : "Create Incident"}
              </Button>
            </div>
          </form>
        </Form>
      </ResourceDrawer>

      <AlertDialog open={!!deleteIncidentId} onOpenChange={() => setDeleteIncidentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this incident? This action cannot be undone.
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
