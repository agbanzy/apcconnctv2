import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceToolbar } from "@/components/admin/ResourceToolbar";
import { ResourceTable, Column } from "@/components/admin/ResourceTable";
import { useResourceController } from "@/hooks/use-resource-controller";
import { useResourceList } from "@/hooks/use-resource-list";
import { ExportButton } from "@/components/admin/ExportButton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  MapPin,
  Image,
  Eye,
  CheckCircle,
  Search,
  BarChart3,
  Clock,
  FileWarning,
  ArrowUpRight,
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
  const [activeTab, setActiveTab] = useState("incidents");

  const { data, isLoading } = useResourceList<Incident>("/api/admin/incidents", filters);

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ["/api/admin/incidents/analytics"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/incidents/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/incidents/analytics"] });
      toast({ title: "Success", description: "Incident status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update incident", variant: "destructive" });
    },
  });

  const handleStatusChange = (incidentId: string, newStatus: string) => {
    statusMutation.mutate({ id: incidentId, status: newStatus });
  };

  const analytics = analyticsData?.data;

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="incidents" data-testid="tab-incidents">
            <FileWarning className="w-4 h-4 mr-2" />
            Incidents
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-4 mt-4">
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
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          {analyticsLoading ? (
            <div className="flex justify-center py-10 text-muted-foreground">Loading analytics...</div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                    <FileWarning className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-incidents">{analytics.total}</div>
                    <p className="text-xs text-muted-foreground">{analytics.recent24h} in last 24h</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">High Severity</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive" data-testid="stat-high-severity">{analytics.bySeverity.high}</div>
                    <p className="text-xs text-muted-foreground">Requires immediate action</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Under Investigation</CardTitle>
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-investigating">{analytics.byStatus.investigating}</div>
                    <p className="text-xs text-muted-foreground">{analytics.byStatus.reported} pending</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-resolved">{analytics.byStatus.resolved}</div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.total > 0 ? ((analytics.byStatus.resolved / analytics.total) * 100).toFixed(0) : 0}% resolution rate
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Severity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "High", count: analytics.bySeverity.high, color: "bg-red-500" },
                      { label: "Medium", count: analytics.bySeverity.medium, color: "bg-yellow-500" },
                      { label: "Low", count: analytics.bySeverity.low, color: "bg-green-500" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-sm w-16">{label}</span>
                        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full transition-all`}
                            style={{ width: analytics.total > 0 ? `${(count / analytics.total) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Reported", count: analytics.byStatus.reported, color: "bg-orange-500" },
                      { label: "Investigating", count: analytics.byStatus.investigating, color: "bg-blue-500" },
                      { label: "Resolved", count: analytics.byStatus.resolved, color: "bg-green-500" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-sm w-24">{label}</span>
                        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full transition-all`}
                            style={{ width: analytics.total > 0 ? `${(count / analytics.total) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Regional Breakdown (by State)</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.stateBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No regional data available</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-medium">State</th>
                            <th className="text-right py-2 px-2 font-medium">Total</th>
                            <th className="text-right py-2 px-2 font-medium">High</th>
                            <th className="text-right py-2 px-2 font-medium">Medium</th>
                            <th className="text-right py-2 px-2 font-medium">Low</th>
                            <th className="text-right py-2 px-2 font-medium">Resolved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.stateBreakdown.map((state: any) => (
                            <tr key={state.stateId} className="border-b" data-testid={`row-state-${state.stateId}`}>
                              <td className="py-2 px-2 font-medium">{state.stateName}</td>
                              <td className="py-2 px-2 text-right">{state.total}</td>
                              <td className="py-2 px-2 text-right text-red-600">{state.high}</td>
                              <td className="py-2 px-2 text-right text-yellow-600">{state.medium}</td>
                              <td className="py-2 px-2 text-right text-green-600">{state.low}</td>
                              <td className="py-2 px-2 text-right">
                                <Badge variant="outline">{state.resolved}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top LGAs by Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.lgaBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No LGA data available</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.lgaBreakdown.map((lga: any) => (
                        <div key={lga.lgaId} className="flex items-center justify-between gap-2 py-1" data-testid={`row-lga-${lga.lgaId}`}>
                          <div>
                            <span className="text-sm font-medium">{lga.lgaName}</span>
                            <span className="text-xs text-muted-foreground ml-2">{lga.stateName}</span>
                          </div>
                          <Badge variant="outline">{lga.total}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.recentIncidents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No recent incidents</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.recentIncidents.map((inc: any) => (
                        <div key={inc.id} className="flex items-start gap-3 py-2 border-b last:border-0" data-testid={`recent-incident-${inc.id}`}>
                          <Badge
                            variant={inc.severity === "high" ? "destructive" : inc.severity === "medium" ? "outline" : "default"}
                          >
                            {inc.severity}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm line-clamp-2">{inc.description}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                              <span>{inc.reporter}</span>
                              {inc.state !== "Unknown" && <span>{inc.lga}, {inc.state}</span>}
                              <span>{new Date(inc.createdAt).toLocaleString()}</span>
                              {inc.mediaCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Image className="w-3 h-3" /> {inc.mediaCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary">{inc.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground">No analytics data available</div>
          )}
        </TabsContent>
      </Tabs>

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
                  <Select
                    value={selectedIncident.status}
                    onValueChange={(value) => {
                      handleStatusChange(selectedIncident.id, value);
                      setSelectedIncident({ ...selectedIncident, status: value });
                    }}
                  >
                    <SelectTrigger className="w-[140px]" data-testid="select-detail-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
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
                    setSelectedIncident({ ...selectedIncident, status: "investigating" });
                  }}
                  disabled={selectedIncident.status === "investigating"}
                  data-testid="button-mark-investigating"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Investigate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleStatusChange(selectedIncident.id, "reported");
                    setSelectedIncident({ ...selectedIncident, status: "reported" });
                  }}
                  disabled={selectedIncident.status === "reported"}
                  data-testid="button-mark-reported"
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Escalate
                </Button>
                <Button
                  onClick={() => {
                    handleStatusChange(selectedIncident.id, "resolved");
                    setSelectedIncident({ ...selectedIncident, status: "resolved" });
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
