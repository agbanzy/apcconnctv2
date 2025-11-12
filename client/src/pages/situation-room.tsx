import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SituationRoomDashboard } from "@/components/situation-room-dashboard";
import { IncidentReportForm } from "@/components/incident-report-form";
import { NigeriaMap } from "@/components/nigeria-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient } from "@/lib/queryClient";
import { AlertTriangle, MapPin, X } from "lucide-react";
import { io, Socket } from "socket.io-client";

export default function SituationRoom() {
  const { member } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery<{
    success: boolean;
    data: {
      totalUnits: number;
      activeUnits: number;
      completedUnits: number;
      incidentUnits: number;
      totalVotes: number;
      recentIncidents: any[];
    };
  }>({
    queryKey: ["/api/situation-room/dashboard"],
  });

  const { data: pollingUnitsData } = useQuery<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      unitCode: string;
      status: "active" | "delayed" | "completed" | "incident";
      votes: number;
      lastUpdate: string;
    }>;
  }>({
    queryKey: ["/api/situation-room/polling-units"],
  });

  const { data: incidentsData } = useQuery<{
    success: boolean;
    data: Array<{
      id: string;
      severity: "low" | "medium" | "high";
      description: string;
      location: string;
      status: string;
      createdAt: string;
    }>;
  }>({
    queryKey: ["/api/incidents"],
  });

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to situation room");
    });

    newSocket.on("incident:new", (incident) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/situation-room/dashboard"] });
    });

    newSocket.on("incident:updated", (incident) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    });

    newSocket.on("polling-unit:updated", (unit) => {
      queryClient.invalidateQueries({ queryKey: ["/api/situation-room/polling-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/situation-room/dashboard"] });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  if (isLoadingDashboard) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const dashboard = dashboardData?.data;
  const pollingUnits = pollingUnitsData?.data || [];
  const incidents = incidentsData?.data || [];

  const pollingUnitsForDashboard = pollingUnits.map((unit) => ({
    id: unit.id,
    name: unit.name,
    status: unit.status,
    votes: unit.votes,
    timestamp: new Date(unit.lastUpdate).toLocaleTimeString(),
  }));

  const filteredIncidents = selectedState
    ? incidents.filter((incident) => 
        incident.location?.toLowerCase().includes(selectedState.toLowerCase())
      )
    : incidents;

  const handleStateClick = (stateId: string, stateName: string) => {
    setSelectedState(stateName);
  };

  const clearStateFilter = () => {
    setSelectedState(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">
          Situation Room
        </h1>
        <p className="text-muted-foreground">
          Real-time election monitoring and incident reporting
        </p>
      </div>

      {dashboard && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-total-units">{dashboard.totalUnits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600" data-testid="text-active-units">{dashboard.activeUnits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600" data-testid="text-completed-units">{dashboard.completedUnits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600" data-testid="text-incident-units">{dashboard.incidentUnits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-total-votes">{dashboard.totalVotes}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Incident Map */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Real-Time Incident Distribution</CardTitle>
              <CardDescription>Click on a state to filter incidents by location</CardDescription>
            </div>
            {selectedState && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearStateFilter}
                data-testid="button-clear-filter"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filter: {selectedState}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <NigeriaMap 
            mode="activity" 
            showLegend={true}
            onStateClick={handleStateClick}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList data-testid="tabs-situation-room">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="incidents" data-testid="tab-incidents">
            Incidents ({selectedState ? filteredIncidents.length : incidents.length})
          </TabsTrigger>
          <TabsTrigger value="report" data-testid="tab-report">Report Incident</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <SituationRoomDashboard
            pollingUnits={pollingUnitsForDashboard}
            totalUnits={dashboard?.totalUnits || 0}
          />
        </TabsContent>

        <TabsContent value="incidents" className="mt-6">
          <div className="space-y-4">
            {selectedState && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Showing incidents in {selectedState}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearStateFilter}
                  className="h-auto p-1"
                  data-testid="button-clear-incident-filter"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {filteredIncidents.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">
                {selectedState ? `No incidents reported in ${selectedState}` : "No incidents reported"}
              </p>
            ) : (
              filteredIncidents.map((incident) => (
                <Card key={incident.id} className={
                  incident.severity === "high"
                    ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                    : incident.severity === "medium"
                    ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
                    : ""
                }>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`h-5 w-5 ${
                            incident.severity === "high"
                              ? "text-red-600"
                              : incident.severity === "medium"
                              ? "text-yellow-600"
                              : "text-blue-600"
                          }`}
                        />
                        <CardTitle className="text-base">{incident.description}</CardTitle>
                      </div>
                      <Badge
                        variant={
                          incident.severity === "high"
                            ? "destructive"
                            : incident.severity === "medium"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {incident.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {incident.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{incident.location}</span>
                        </div>
                      )}
                      <span>{new Date(incident.createdAt).toLocaleString()}</span>
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <IncidentReportForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
