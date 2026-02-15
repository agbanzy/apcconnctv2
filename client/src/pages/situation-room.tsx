import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  Radio,
  Power,
  UserPlus,
  Copy,
  Trash2,
  Loader2,
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

type PollingAgent = {
  id: string;
  memberId: string;
  pollingUnitId: string;
  electionId: string | null;
  agentCode: string;
  agentPin: string;
  status: string;
  assignedAt: string;
  checkedInAt: string | null;
  completedAt: string | null;
  notes: string | null;
  member: {
    id: string;
    memberId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
  };
  pollingUnit: {
    id: string;
    name: string;
    unitCode: string;
  };
  election: {
    id: string;
    title: string;
    position: string;
  } | null;
};

type MemberSearchResult = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
};

type ElectionDayMode = {
  active: boolean;
  electionId: string | null;
  activatedAt: string | null;
  message: string | null;
  election?: {
    id: string;
    title: string;
    position: string;
    status: string;
    electionDate: string;
  } | null;
};

export default function SituationRoom() {
  const { member, user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [edmElectionId, setEdmElectionId] = useState("");
  const [edmMessage, setEdmMessage] = useState("");

  const [puSearch, setPuSearch] = useState("");
  const [puStateFilter, setPuStateFilter] = useState("all");
  const [puStatusFilter, setPuStatusFilter] = useState("all");
  const [puPage, setPuPage] = useState(1);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const [agentSearch, setAgentSearch] = useState("");
  const [agentStatusFilter, setAgentStatusFilter] = useState("all");
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [assignPollingUnitId, setAssignPollingUnitId] = useState("");
  const [assignElectionId, setAssignElectionId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [createdAgent, setCreatedAgent] = useState<{ agentCode: string; agentPin: string } | null>(null);

  const { data: edmData } = useQuery<{ success: boolean; data: ElectionDayMode }>({
    queryKey: ["/api/election-day-mode"],
  });

  const { data: electionsData } = useQuery<{ success: boolean; data: Array<{ id: string; title: string; position: string; status: string }> }>({
    queryKey: ["/api/general-elections"],
  });

  const edmMutation = useMutation({
    mutationFn: async (payload: { active: boolean; electionId?: string; message?: string }) => {
      const res = await apiRequest("PUT", "/api/election-day-mode", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/election-day-mode"] });
      toast({ title: "Election Day Mode updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isAdmin = user?.role === "admin";
  const edm = edmData?.data;
  const elections = electionsData?.data || [];

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

  const { data: agentsData, isLoading: agentsLoading } = useQuery<{
    success: boolean;
    data: PollingAgent[];
  }>({
    queryKey: ["/api/admin/polling-agents", agentStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (agentStatusFilter !== "all") params.set("status", agentStatusFilter);
      const res = await fetch(`/api/admin/polling-agents?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
    enabled: activeTab === "agents" && (user?.role === "admin" || user?.role === "coordinator"),
  });

  const { data: memberSearchData, isLoading: memberSearchLoading } = useQuery<{
    success: boolean;
    data: MemberSearchResult[];
  }>({
    queryKey: ["/api/admin/members-search", memberSearchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/admin/members-search?q=${encodeURIComponent(memberSearchQuery)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search members");
      return res.json();
    },
    enabled: memberSearchQuery.length >= 2,
  });

  const { data: puListData } = useQuery<{ success: boolean; data: Array<{ id: string; name: string; unitCode: string }> }>({
    queryKey: ["/api/situation-room/polling-units"],
    enabled: showAssignForm,
  });

  const assignAgentMutation = useMutation({
    mutationFn: async (payload: { memberId: string; pollingUnitId: string; electionId?: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/admin/polling-agents", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents"] });
      setCreatedAgent({ agentCode: data.data.agentCode, agentPin: data.data.agentPin });
      toast({ title: "Agent assigned successfully", description: `Code: ${data.data.agentCode}` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const revokeAgentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/polling-agents/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents"] });
      toast({ title: "Agent status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const allAgents = agentsData?.data || [];
  const filteredAgents = agentSearch
    ? allAgents.filter(a =>
        a.agentCode.toLowerCase().includes(agentSearch.toLowerCase()) ||
        `${a.member.user.firstName} ${a.member.user.lastName}`.toLowerCase().includes(agentSearch.toLowerCase()) ||
        a.pollingUnit.name.toLowerCase().includes(agentSearch.toLowerCase())
      )
    : allAgents;

  const memberSearchResults = memberSearchData?.data || [];
  const pollingUnitOptions = (puListData?.data || []).map(u => ({ id: u.id, label: `${u.name} (${u.unitCode})` }));

  const resetAssignForm = () => {
    setShowAssignForm(false);
    setSelectedMember(null);
    setMemberSearchQuery("");
    setAssignPollingUnitId("");
    setAssignElectionId("");
    setAssignNotes("");
    setCreatedAgent(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

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

      {isAdmin && (
        <Card className={edm?.active ? "border-green-500 dark:border-green-700" : ""}>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${edm?.active ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                <Radio className={`h-5 w-5 ${edm?.active ? "text-green-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <CardTitle className="text-base" data-testid="text-edm-title">Election Day Mode</CardTitle>
                <CardDescription>
                  {edm?.active
                    ? `Active since ${new Date(edm.activatedAt!).toLocaleString()}`
                    : "Activate to enable mobile agent reporting"}
                </CardDescription>
              </div>
            </div>
            {edm?.active ? (
              <Badge variant="default" className="bg-green-600" data-testid="badge-edm-status">LIVE</Badge>
            ) : (
              <Badge variant="outline" data-testid="badge-edm-status">OFF</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {edm?.active ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-md">
                  <div>
                    <p className="font-medium text-sm" data-testid="text-edm-election">{edm.election?.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{edm.election?.position?.replace(/_/g, " ")}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => edmMutation.mutate({ active: false })}
                    disabled={edmMutation.isPending}
                    data-testid="button-deactivate-edm"
                  >
                    <Power className="h-4 w-4 mr-1" />
                    Deactivate
                  </Button>
                </div>
                {edm.message && (
                  <p className="text-sm text-muted-foreground italic">"{edm.message}"</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edm-election">Select Election</Label>
                  <Select value={edmElectionId} onValueChange={setEdmElectionId}>
                    <SelectTrigger data-testid="select-edm-election">
                      <SelectValue placeholder="Choose an election..." />
                    </SelectTrigger>
                    <SelectContent>
                      {elections.filter(e => e.status === "upcoming" || e.status === "ongoing").map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.title} ({e.position.replace(/_/g, " ")})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edm-message">Broadcast Message (optional)</Label>
                  <Textarea
                    id="edm-message"
                    placeholder="Message to display to all agents..."
                    value={edmMessage}
                    onChange={(e) => setEdmMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                    data-testid="input-edm-message"
                  />
                </div>
                <Button
                  onClick={() => edmMutation.mutate({ active: true, electionId: edmElectionId, message: edmMessage || undefined })}
                  disabled={!edmElectionId || edmMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-activate-edm"
                >
                  <Power className="h-4 w-4 mr-1" />
                  {edmMutation.isPending ? "Activating..." : "Activate Election Day Mode"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          {(user?.role === "admin" || user?.role === "coordinator") && (
            <TabsTrigger value="agents" data-testid="tab-agents">
              <Shield className="w-4 h-4 mr-1" />
              Agents
            </TabsTrigger>
          )}
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

        {(user?.role === "admin" || user?.role === "coordinator") && (
          <TabsContent value="agents" className="mt-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-agents-title">
                  <Shield className="w-5 h-5" />
                  Polling Agents ({allAgents.length})
                </h2>
                <Button onClick={() => { setShowAssignForm(true); setCreatedAgent(null); }} data-testid="button-assign-agent">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Assign New Agent
                </Button>
              </div>

              {showAssignForm && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base" data-testid="text-assign-form-title">
                      {createdAgent ? "Agent Credentials" : "Assign Polling Agent"}
                    </CardTitle>
                    <CardDescription>
                      {createdAgent
                        ? "Share these credentials with the agent. The PIN cannot be retrieved later."
                        : "Search for a member and assign them to a polling unit"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {createdAgent ? (
                      <div className="space-y-3">
                        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-md space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Agent Code</p>
                              <p className="font-mono font-bold text-lg" data-testid="text-created-agent-code">{createdAgent.agentCode}</p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(createdAgent.agentCode)} data-testid="button-copy-code">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Agent PIN</p>
                              <p className="font-mono font-bold text-lg" data-testid="text-created-agent-pin">{createdAgent.agentPin}</p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(createdAgent.agentPin)} data-testid="button-copy-pin">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => copyToClipboard(`Agent Code: ${createdAgent.agentCode}\nAgent PIN: ${createdAgent.agentPin}`)}
                          className="w-full"
                          data-testid="button-copy-both"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy Both
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={resetAssignForm} className="flex-1" data-testid="button-close-assign">
                            Close
                          </Button>
                          <Button onClick={() => { setCreatedAgent(null); setSelectedMember(null); setMemberSearchQuery(""); setAssignPollingUnitId(""); setAssignElectionId(""); setAssignNotes(""); }} className="flex-1" data-testid="button-assign-another">
                            Assign Another
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Search Member</Label>
                          {selectedMember ? (
                            <div className="flex items-center justify-between gap-2 p-2 border rounded-md">
                              <div>
                                <p className="font-medium text-sm">{selectedMember.firstName} {selectedMember.lastName}</p>
                                <p className="text-xs text-muted-foreground">{selectedMember.memberId} | {selectedMember.email}</p>
                              </div>
                              <Button size="icon" variant="ghost" onClick={() => { setSelectedMember(null); setMemberSearchQuery(""); }} data-testid="button-clear-member">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="Search by name, email, or member ID..."
                                className="pl-9"
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                data-testid="input-member-search"
                              />
                              {memberSearchQuery.length >= 2 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
                                  {memberSearchLoading ? (
                                    <div className="p-3 text-center text-sm text-muted-foreground">
                                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                    </div>
                                  ) : memberSearchResults.length === 0 ? (
                                    <p className="p-3 text-center text-sm text-muted-foreground">No members found</p>
                                  ) : (
                                    memberSearchResults.map((m) => (
                                      <button
                                        key={m.id}
                                        className="w-full text-left px-3 py-2 hover-elevate text-sm"
                                        onClick={() => { setSelectedMember(m); setMemberSearchQuery(""); }}
                                        data-testid={`button-select-member-${m.id}`}
                                      >
                                        <p className="font-medium">{m.firstName} {m.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{m.memberId} | {m.email}</p>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Polling Unit</Label>
                          <Select value={assignPollingUnitId} onValueChange={setAssignPollingUnitId}>
                            <SelectTrigger data-testid="select-polling-unit">
                              <SelectValue placeholder="Select polling unit..." />
                            </SelectTrigger>
                            <SelectContent>
                              {pollingUnitOptions.map((u) => (
                                <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Election (optional)</Label>
                          <Select value={assignElectionId} onValueChange={setAssignElectionId}>
                            <SelectTrigger data-testid="select-assign-election">
                              <SelectValue placeholder="Select election..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No specific election</SelectItem>
                              {elections.map((e) => (
                                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Notes (optional)</Label>
                          <Textarea
                            placeholder="Optional notes about this assignment..."
                            value={assignNotes}
                            onChange={(e) => setAssignNotes(e.target.value)}
                            className="resize-none"
                            rows={2}
                            data-testid="input-assign-notes"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" onClick={resetAssignForm} className="flex-1" data-testid="button-cancel-assign">
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              if (!selectedMember || !assignPollingUnitId) {
                                toast({ title: "Please select a member and polling unit", variant: "destructive" });
                                return;
                              }
                              assignAgentMutation.mutate({
                                memberId: selectedMember.id,
                                pollingUnitId: assignPollingUnitId,
                                electionId: assignElectionId && assignElectionId !== "none" ? assignElectionId : undefined,
                                notes: assignNotes || undefined,
                              });
                            }}
                            disabled={!selectedMember || !assignPollingUnitId || assignAgentMutation.isPending}
                            className="flex-1"
                            data-testid="button-submit-assign"
                          >
                            {assignAgentMutation.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Assigning...</>
                            ) : (
                              <><UserPlus className="w-4 h-4 mr-1" /> Assign Agent</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search agents..."
                    className="pl-9"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    data-testid="input-agent-search"
                  />
                </div>
                <Select value={agentStatusFilter} onValueChange={setAgentStatusFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-agent-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {agentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : filteredAgents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {allAgents.length === 0
                      ? "No polling agents assigned yet. Click 'Assign New Agent' to get started."
                      : "No agents match your search criteria"}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredAgents.map((agent) => (
                    <Card key={agent.id} data-testid={`card-agent-${agent.id}`}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium text-sm">
                                {agent.member.user.firstName} {agent.member.user.lastName}
                              </p>
                              <Badge
                                variant={
                                  agent.status === "checked_in" || agent.status === "active"
                                    ? "default"
                                    : agent.status === "revoked"
                                    ? "destructive"
                                    : "secondary"
                                }
                                data-testid={`badge-agent-status-${agent.id}`}
                              >
                                {agent.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>
                                <span className="font-medium">Code:</span>{" "}
                                <span className="font-mono">{agent.agentCode}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5 ml-1 inline-flex"
                                  onClick={() => copyToClipboard(agent.agentCode)}
                                  data-testid={`button-copy-agent-code-${agent.id}`}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </p>
                              <p>
                                <span className="font-medium">Unit:</span> {agent.pollingUnit.name} ({agent.pollingUnit.unitCode})
                              </p>
                              {agent.election && (
                                <p><span className="font-medium">Election:</span> {agent.election.title}</p>
                              )}
                              <p className="flex items-center gap-3 flex-wrap">
                                <span><span className="font-medium">Assigned:</span> {new Date(agent.assignedAt).toLocaleDateString()}</span>
                                {agent.checkedInAt && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    Checked in: {new Date(agent.checkedInAt).toLocaleString()}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {agent.status !== "revoked" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => revokeAgentMutation.mutate({ id: agent.id, status: "revoked" })}
                                disabled={revokeAgentMutation.isPending}
                                data-testid={`button-revoke-agent-${agent.id}`}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Revoke
                              </Button>
                            )}
                            {agent.status === "revoked" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => revokeAgentMutation.mutate({ id: agent.id, status: "assigned" })}
                                disabled={revokeAgentMutation.isPending}
                                data-testid={`button-restore-agent-${agent.id}`}
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
