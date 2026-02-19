import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResourceToolbar } from "@/components/admin/ResourceToolbar";
import { ResourceTable, Column } from "@/components/admin/ResourceTable";
import { useResourceController } from "@/hooks/use-resource-controller";
import { useResourceList } from "@/hooks/use-resource-list";
import { useResourceMutations } from "@/hooks/use-resource-mutations";
import { ExportButton } from "@/components/admin/ExportButton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  MapPin,
  Image,
  Eye,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface IncidentMedia {
  id: string;
  mediaUrl: string;
  mediaType: string;
  uploadedAt: string;
}

interface Incident {
  id: string;
  pollingUnitId: string | null;
  reporterId: string | null;
  severity: "low" | "medium" | "high";
  description: string;
  location: string | null;
  coordinates: { lat: number; lng: number } | null;
  status: string;
  createdAt: string;
  reporter?: {
    id: string;
    user: { firstName: string; lastName: string; email: string };
  } | null;
  pollingUnit?: { name: string; unitCode: string } | null;
  media?: IncidentMedia[];
}

export default function AdminIncidents() {
  const { toast } = useToast();
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = useResourceList<Incident>("/api/admin/incidents", filters);
  const { update } = useResourceMutations<Incident>("/api/admin/incidents");

  const handleStatusChange = async (incidentId: string, newStatus: string) => {
    try {
      await update.mutateAsync({ id: incidentId, data: { status: newStatus } });
      toast({ title: "Success", description: `Incident status updated to ${newStatus}` });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update incident status",
        variant: "destructive",
      });
    }
  };

  const columns: Column<Incident>[] = [
    {
      key: "description",
      header: "Description",
      render: (incident) => (
        <div className="max-w-md" data-testid={`text-description-${incident.id}`}>
          <p className="font-medium line-clamp-2">{incident.description}</p>
          {incident.pollingUnit && (
            <p className="text-xs text-muted-foreground mt-1">
              PU: {incident.pollingUnit.name} ({incident.pollingUnit.unitCode})
            </p>
          )}
        </div>
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
      key: "reporter",
      header: "Reporter",
      render: (incident) => (
        <span className="text-sm" data-testid={`text-reporter-${incident.id}`}>
          {incident.reporter?.user
            ? `${incident.reporter.user.firstName} ${incident.reporter.user.lastName}`
            : "Unknown"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (incident) => (
        <div className="text-sm" data-testid={`text-location-${incident.id}`}>
          {incident.location || "N/A"}
          {incident.coordinates && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {incident.coordinates.lat.toFixed(4)}, {incident.coordinates.lng.toFixed(4)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "media",
      header: "Media",
      render: (incident) => (
        <div className="flex items-center gap-1" data-testid={`text-media-${incident.id}`}>
          {incident.media && incident.media.length > 0 ? (
            <Badge variant="outline">
              <Image className="h-3 w-3 mr-1" />
              {incident.media.length}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (incident) => (
        <Select
          value={incident.status}
          onValueChange={(value) => handleStatusChange(incident.id, value)}
        >
          <SelectTrigger className="w-[140px]" data-testid={`select-status-${incident.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "createdAt",
      header: "Reported",
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedIncident(incident);
            setDetailOpen(true);
          }}
          data-testid={`button-view-${incident.id}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

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

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Incident Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage reported incidents from polling unit agents
          </p>
        </div>
      </div>

      <Card className="p-6">
        <ResourceToolbar
          searchValue={filters.search || ""}
          onSearchChange={(value) => updateFilter("search", value)}
          filterSlot={
            <div className="flex gap-2 flex-wrap">
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Details
            </DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <Badge
                    variant={
                      selectedIncident.severity === "high"
                        ? "destructive"
                        : selectedIncident.severity === "medium"
                        ? "outline"
                        : "default"
                    }
                    data-testid="badge-detail-severity"
                  >
                    {selectedIncident.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" data-testid="badge-detail-status">
                    {selectedIncident.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reporter</p>
                  <p className="text-sm" data-testid="text-detail-reporter">
                    {selectedIncident.reporter?.user
                      ? `${selectedIncident.reporter.user.firstName} ${selectedIncident.reporter.user.lastName}`
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reported At</p>
                  <p className="text-sm" data-testid="text-detail-date">
                    {format(new Date(selectedIncident.createdAt), "PPpp")}
                  </p>
                </div>
              </div>

              {selectedIncident.pollingUnit && (
                <div>
                  <p className="text-sm text-muted-foreground">Polling Unit</p>
                  <p className="text-sm" data-testid="text-detail-polling-unit">
                    {selectedIncident.pollingUnit.name} ({selectedIncident.pollingUnit.unitCode})
                  </p>
                </div>
              )}

              {selectedIncident.location && (
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-sm flex items-center gap-1" data-testid="text-detail-location">
                    <MapPin className="h-4 w-4" />
                    {selectedIncident.location}
                    {selectedIncident.coordinates && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({selectedIncident.coordinates.lat.toFixed(4)}, {selectedIncident.coordinates.lng.toFixed(4)})
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm whitespace-pre-wrap" data-testid="text-detail-description">
                  {selectedIncident.description}
                </p>
              </div>

              {selectedIncident.media && selectedIncident.media.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Attached Media ({selectedIncident.media.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedIncident.media.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-md overflow-hidden border"
                        data-testid={`media-item-${m.id}`}
                      >
                        {m.mediaType === "image" ? (
                          <img
                            src={m.mediaUrl}
                            alt="Incident evidence"
                            className="w-full h-32 object-cover"
                          />
                        ) : (
                          <video
                            src={m.mediaUrl}
                            controls
                            className="w-full h-32 object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleStatusChange(selectedIncident.id, "investigating");
                    setDetailOpen(false);
                  }}
                  disabled={selectedIncident.status === "investigating"}
                  data-testid="button-mark-investigating"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Investigating
                </Button>
                <Button
                  onClick={() => {
                    handleStatusChange(selectedIncident.id, "resolved");
                    setDetailOpen(false);
                  }}
                  disabled={selectedIncident.status === "resolved"}
                  data-testid="button-mark-resolved"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
