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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import {
  AlertTriangle,
  MapPin,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle,
  Clock,
  Shield,
  Eye,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

type PollingUnitEnhanced = {
  id: string;
  name: string;
  unitCode: string;
  status: string;
  votes: number;
  lastUpdate: string;
  wardId: string;
  wardName: string;
  lgaId: string;
  lgaName: string;
  stateId: string;
  stateName: string;
  resultsCount: number;
  verifiedResults: number;
  agents: Array<{
    agentId: string;
    agentCode: string;
    status: string;
    memberName: string;
    checkedInAt: string | null;
  }> | null;
};

type TraceabilityData = {
  results: Array<{
    id: string;
    votes: number;
    registeredVoters: number;
    accreditedVoters: number;
    isVerified: boolean;
    verifiedAt: string | null;
    verificationNotes: string | null;
    reportedAt: string;
    updatedAt: string;
    deviceInfo: any;
    partyName: string;
    partyAbbreviation: string;
    partyColor: string;
    candidateName: string;
    electionTitle: string;
    reporter: {
      memberId: string;
      memberCode: string;
      name: string;
      email: string;
      phone: string;
    } | null;
    verifier: {
      userId: string;
      name: string;
      email: string;
    } | null;
  }>;
  agents: Array<{
    id: string;
    agentCode: string;
    status: string;
    checkedInAt: string | null;
    completedAt: string | null;
    assignedAt: string;
    notes: string | null;
    agentName: string;
    agentEmail: string;
    agentPhone: string;
    memberCode: string;
    electionTitle: string | null;
  }>;
  incidents: any[];
};

export default function SituationRoom() {
  const { member, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [puSearch, setPuSearch] = useState("");
  const [puStateFilter, setPuStateFilter] = useState("all");
  const [puStatusFilter, setPuStatusFilter] = useState("all");
  const [puPage, setPuPage] = useState(1);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

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

  const { data: statesData } = useQuery<{ success: boolean; data: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/states"],
  });

  const puQueryParams = new URLSearchParams({
    page: puPage.toString(),
    limit: "20",
    ...(puSearch && { search: puSearch }),
    ...(puStateFilter !== "all" && { stateId: puStateFilter }),
    ...(puStatusFilter !== "all" && { status: puStatusFilter }),
  });

  const { data: enhancedPuData, isLoading: puLoading } = useQuery<{
    success: boolean;
    data: PollingUnitEnhanced[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["/api/situation-room/polling-units-enhanced", puSearch, puStateFilter, puStatusFilter, puPage],
    queryFn: async () => {
      const res = await fetch(`/api/situation-room/polling-units-enhanced?${puQueryParams.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch polling units");
      return res.json();
    },
    enabled: activeTab === "polling-units",
  });

  const { data: traceData, isLoading: traceLoading, error: traceError } = useQuery<{
    success: boolean;
    data: TraceabilityData;
  }>({
    queryKey: ["/api/situation-room/polling-units", selectedUnitId, "traceability"],
    queryFn: async () => {
      const res = await fetch(`/api/situation-room/polling-units/${selectedUnitId}/traceability`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unauthorized" }));
        throw new Error(err.error || "Failed to fetch traceability data");
      }
      return res.json();
    },
    enabled: !!selectedUnitId && (user?.role === "admin" || user?.role === "coordinator"),
  });

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to situation room");
    });

    newSocket.on("incident:new", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/situation-room/dashboard"] });
    });

    newSocket.on("incident:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    });

    newSocket.on("polling-unit:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/situation-room/polling-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/situation-room/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/situation-room/polling-units-enhanced"] });
    });

    newSocket.on("general-election:result-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/situation-room/polling-units-enhanced"] });
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
  const states = statesData?.data || [];

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

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-600";
      case "completed": return "text-blue-600";
      case "delayed": return "text-yellow-600";
      case "incident": return "text-red-600";
      default: return "text-muted-foreground";
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return "default" as const;
      case "completed": return "secondary" as const;
      case "delayed": return "secondary" as const;
      case "incident": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  const traceability = traceData?.data;
  const enhancedUnits = enhancedPuData?.data || [];
  const puPagination = enhancedPuData?.pagination;

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
              <p className="text-2xl font-bold" data-testid="text-total-units">{dashboard.totalUnits.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600" data-testid="text-active-units">{dashboard.activeUnits.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600" data-testid="text-completed-units">{dashboard.completedUnits.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600" data-testid="text-incident-units">{dashboard.incidentUnits.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-total-votes">{(dashboard.totalVotes || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList data-testid="tabs-situation-room">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="polling-units" data-testid="tab-polling-units">
            Polling Units
          </TabsTrigger>
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

        <TabsContent value="polling-units" className="mt-6">
          {selectedUnitId ? (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setSelectedUnitId(null)} data-testid="button-back-to-list">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Polling Units
              </Button>

              {traceLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-48" />
                  <Skeleton className="h-32" />
                </div>
              ) : traceability ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" /> Data Traceability
                      </CardTitle>
                      <CardDescription>Full audit trail for this polling unit</CardDescription>
                    </CardHeader>
                  </Card>

                  {traceability.agents.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="w-4 h-4" /> Assigned Agents ({traceability.agents.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {traceability.agents.map((agent) => (
                          <div key={agent.id} className="flex items-start justify-between gap-4 text-sm border-b pb-2 last:border-0" data-testid={`trace-agent-${agent.id}`}>
                            <div>
                              <p className="font-medium">{agent.agentName}</p>
                              <p className="text-muted-foreground text-xs">{agent.agentCode} | {agent.memberCode}</p>
                              <p className="text-muted-foreground text-xs">{agent.agentEmail} | {agent.agentPhone || "No phone"}</p>
                              {agent.electionTitle && <p className="text-xs text-muted-foreground mt-1">{agent.electionTitle}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <Badge variant={agent.status === "checked_in" || agent.status === "active" ? "default" : agent.status === "revoked" ? "destructive" : "secondary"}>
                                {agent.status}
                              </Badge>
                              {agent.checkedInAt && <p className="text-xs text-muted-foreground mt-1">Checked in: {new Date(agent.checkedInAt).toLocaleString()}</p>}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {traceability.results.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Submitted Results ({traceability.results.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {traceability.results.map((result) => (
                          <div key={result.id} className="border-b pb-3 last:border-0" data-testid={`trace-result-${result.id}`}>
                            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: result.partyColor }}>
                                  {result.partyAbbreviation?.slice(0, 2)}
                                </div>
                                <span className="font-medium text-sm">{result.candidateName}</span>
                                <Badge variant="outline">{result.partyAbbreviation}</Badge>
                              </div>
                              <span className="font-bold">{result.votes?.toLocaleString()} votes</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>
                                <span className="font-medium">Reporter: </span>
                                {result.reporter ? (
                                  <span>{result.reporter.name} ({result.reporter.memberCode})</span>
                                ) : (
                                  <span className="text-yellow-600">Unattributed</span>
                                )}
                              </div>
                              <div>
                                <span className="font-medium">Reported: </span>
                                {new Date(result.reportedAt).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Verified: </span>
                                {result.isVerified ? (
                                  <span className="text-green-600">
                                    Yes{result.verifier ? ` by ${result.verifier.name}` : ""}
                                    {result.verifiedAt ? ` at ${new Date(result.verifiedAt).toLocaleString()}` : ""}
                                  </span>
                                ) : (
                                  <span className="text-yellow-600">Pending</span>
                                )}
                              </div>
                              {result.deviceInfo && (
                                <div>
                                  <span className="font-medium">Device: </span>
                                  <span className="truncate">{result.deviceInfo.timestamp || "N/A"}</span>
                                </div>
                              )}
                            </div>
                            {result.verificationNotes && (
                              <p className="text-xs mt-1 bg-muted p-2 rounded-md">{result.verificationNotes}</p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {traceability.incidents.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Incidents ({traceability.incidents.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {traceability.incidents.map((incident: any) => (
                          <div key={incident.id} className="border-b pb-2 last:border-0 text-sm" data-testid={`trace-incident-${incident.id}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span>{incident.description}</span>
                              <Badge variant={incident.severity === "high" ? "destructive" : "secondary"}>{incident.severity}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {incident.reporter ? `Reported by: ${incident.reporter.user?.firstName} ${incident.reporter.user?.lastName}` : "Anonymous"}
                              {" | "}{new Date(incident.createdAt).toLocaleString()}
                              {" | "}{incident.status}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {user?.role !== "admin" && user?.role !== "coordinator"
                      ? "Only admins and coordinators can view traceability data"
                      : traceError
                      ? `Error: ${(traceError as Error).message}`
                      : "No traceability data available"}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or code..."
                    className="pl-9"
                    value={puSearch}
                    onChange={(e) => { setPuSearch(e.target.value); setPuPage(1); }}
                    data-testid="input-pu-search"
                  />
                </div>
                <Select value={puStateFilter} onValueChange={(v) => { setPuStateFilter(v); setPuPage(1); }}>
                  <SelectTrigger className="w-[180px]" data-testid="select-pu-state">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {states.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={puStatusFilter} onValueChange={(v) => { setPuStatusFilter(v); setPuPage(1); }}>
                  <SelectTrigger className="w-[150px]" data-testid="select-pu-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {puLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : enhancedUnits.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No polling units match your search criteria
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    Showing {enhancedUnits.length} of {puPagination?.total.toLocaleString()} polling units
                  </div>
                  <div className="space-y-2">
                    {enhancedUnits.map((unit) => (
                      <Card
                        key={unit.id}
                        className="hover-elevate cursor-pointer"
                        onClick={() => setSelectedUnitId(unit.id)}
                        data-testid={`card-pu-${unit.id}`}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-medium text-sm truncate">{unit.name}</p>
                                <Badge variant={statusBadge(unit.status)} className="text-xs">{unit.status}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {unit.unitCode} | {unit.wardName}, {unit.lgaName}, {unit.stateName}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                {Number(unit.resultsCount) > 0 && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    {unit.resultsCount} results ({unit.verifiedResults} verified)
                                  </span>
                                )}
                                {unit.agents && unit.agents.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {unit.agents.length} agent{unit.agents.length > 1 ? "s" : ""}
                                  </span>
                                )}
                                {unit.lastUpdate && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(unit.lastUpdate).toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <Button variant="ghost" size="icon" data-testid={`button-view-trace-${unit.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {puPagination && puPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={puPage <= 1}
                        onClick={() => setPuPage(p => p - 1)}
                        data-testid="button-pu-prev"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {puPage} of {puPagination.totalPages.toLocaleString()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={puPage >= puPagination.totalPages}
                        onClick={() => setPuPage(p => p + 1)}
                        data-testid="button-pu-next"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
