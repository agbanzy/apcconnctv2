import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, MapPin, User, Download, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import io from "socket.io-client";

export default function AdminIncidents() {
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data: incidentsData, isLoading } = useQuery({
    queryKey: ["/api/incidents"],
  });

  useEffect(() => {
    const socket = io();
    
    socket.on("incident:new", (incident) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ 
        title: "New Incident Reported", 
        description: incident.title,
        variant: "destructive"
      });
    });

    socket.on("incident:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateIncidentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/incidents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Success", description: "Incident updated" });
      setDetailsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update incident", variant: "destructive" });
    },
  });

  const incidents = incidentsData?.data || [];
  const filteredIncidents = incidents.filter((incident: any) => {
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  const exportReport = () => {
    const csv = [
      ['Title', 'Severity', 'Status', 'Location', 'Reported By', 'Date'],
      ...filteredIncidents.map((i: any) => [
        i.title,
        i.severity,
        i.status,
        i.location,
        i.reportedBy || 'Anonymous',
        new Date(i.createdAt).toLocaleString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents_${new Date().toISOString()}.csv`;
    a.click();
  };

  const updateStatus = (status: string) => {
    if (!selectedIncident) return;
    updateIncidentMutation.mutate({ 
      id: selectedIncident.id, 
      data: { status } 
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading incidents...</div>;
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Incidents' }]} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-incidents-title">Incident Monitoring</h1>
          <p className="text-muted-foreground mt-1">Real-time incident tracking and management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReport} data-testid="button-export-incidents">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Link href="/situation-room">
            <Button data-testid="button-situation-room">
              <LinkIcon className="h-4 w-4 mr-2" />
              Situation Room
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-incidents">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.length}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-high-severity">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents.filter((i: any) => i.severity === 'high').length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents.filter((i: any) => i.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-resolved">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <AlertTriangle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents.filter((i: any) => i.status === 'resolved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-severity-filter">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredIncidents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No incidents found
            </CardContent>
          </Card>
        ) : (
          filteredIncidents.map((incident: any) => (
            <Card 
              key={incident.id} 
              className="cursor-pointer hover-elevate"
              onClick={() => {
                setSelectedIncident(incident);
                setDetailsDialogOpen(true);
              }}
              data-testid={`incident-card-${incident.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{incident.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge 
                        variant={
                          incident.severity === 'high' ? 'destructive' : 
                          incident.severity === 'medium' ? 'secondary' : 'outline'
                        }
                      >
                        {incident.severity}
                      </Badge>
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(incident.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{incident.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {incident.location}
                  </span>
                  {incident.reportedBy && (
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {incident.reportedBy}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-incident-details">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
            <DialogDescription>{selectedIncident?.title}</DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Severity</p>
                  <Badge 
                    variant={
                      selectedIncident.severity === 'high' ? 'destructive' : 
                      selectedIncident.severity === 'medium' ? 'secondary' : 'outline'
                    }
                  >
                    {selectedIncident.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant="outline">{selectedIncident.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground">{selectedIncident.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Location</p>
                <p className="text-sm text-muted-foreground">{selectedIncident.location}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Reported At</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedIncident.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Update Status</p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateStatus('investigating')}
                    data-testid="button-status-investigating"
                  >
                    Investigating
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => updateStatus('resolved')}
                    data-testid="button-status-resolved"
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
