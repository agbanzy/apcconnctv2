import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload, Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface State {
  id: string;
  name: string;
}

interface LGA {
  id: string;
  name: string;
}

interface Ward {
  id: string;
  name: string;
}

interface Election {
  id: string;
  name: string;
}

interface PollingAgent {
  id: string;
  agentCode: string;
  agentPin: string;
  name: string;
  pollingUnitName: string;
  wardName: string;
  lgaName: string;
  stateName: string;
  status: string;
  assignedAt: string;
}

interface BatchGenerationResult {
  success: boolean;
  data: {
    generatedCount: number;
    agents: PollingAgent[];
  };
}

const statusColorMap: { [key: string]: any } = {
  active: "default",
  pending: "secondary",
  inactive: "outline",
  assigned: "default",
  unassigned: "secondary",
  suspended: "destructive",
};

export default function AdminAgentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Batch generation state
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedLga, setSelectedLga] = useState<string>("all");
  const [selectedWard, setSelectedWard] = useState<string>("all");
  const [selectedElection, setSelectedElection] = useState<string>("all");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [showBatchResults, setShowBatchResults] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchGenerationResult | null>(null);

  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch all data
  const { data: statesData } = useQuery<{ success: boolean; data: State[] }>({
    queryKey: ["/api/states"],
  });

  const { data: lgasData } = useQuery<{ success: boolean; data: LGA[] }>({
    queryKey: ["/api/lgas", selectedState],
    enabled: selectedState !== "all",
  });

  const { data: wardsData } = useQuery<{ success: boolean; data: Ward[] }>({
    queryKey: ["/api/wards", selectedLga],
    enabled: selectedLga !== "all",
  });

  const { data: electionsData } = useQuery<{ success: boolean; data: Election[] }>({
    queryKey: ["/api/general-elections"],
  });

  const { data: agentsData, isLoading: agentsLoading, refetch: refetchAgents } = useQuery<{
    success: boolean;
    data: PollingAgent[];
  }>({
    queryKey: ["/api/admin/polling-agents", statusFilter],
  });

  const { data: statsData } = useQuery<{
    success: boolean;
    data: {
      total: number;
      checkedIn: number;
      active: number;
      completed: number;
    };
  }>({
    queryKey: ["/api/admin/polling-agents/stats"],
  });

  // Mutations
  const batchGenerateMutation = useMutation({
    mutationFn: async () => {
      if (selectedState === "all") {
        throw new Error("State is required");
      }
      if (!defaultPassword) {
        throw new Error("Default password is required");
      }

      const body: any = {
        stateId: selectedState,
        defaultPassword,
      };

      if (selectedLga && selectedLga !== "all") body.lgaId = selectedLga;
      if (selectedWard && selectedWard !== "all") body.wardId = selectedWard;
      if (selectedElection && selectedElection !== "all") body.electionId = selectedElection;

      const response = await apiRequest("POST", "/api/admin/polling-agents/batch", body);
      if (!response.ok) throw new Error("Failed to generate agents");
      return response.json();
    },
    onSuccess: (data) => {
      setBatchResults(data);
      setShowBatchResults(true);
      toast({
        title: "Success",
        description: `Generated ${data.data.generatedCount} polling agents successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents/stats"] });
      // Reset form
      setSelectedState("");
      setSelectedLga("");
      setSelectedWard("");
      setSelectedElection("");
      setDefaultPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate agents",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      if (!importPassword) throw new Error("Default password is required");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("defaultPassword", importPassword);

      const response = await fetch("/api/admin/polling-agents/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to import agents");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Imported ${data.data.importedCount} polling agents successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents/stats"] });
      setShowImportDialog(false);
      setSelectedFile(null);
      setImportPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import agents",
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedState && selectedState !== "all") params.append("stateId", selectedState);
      if (selectedLga && selectedLga !== "all") params.append("lgaId", selectedLga);
      if (selectedWard && selectedWard !== "all") params.append("wardId", selectedWard);
      if (selectedElection && selectedElection !== "all") params.append("electionId", selectedElection);

      const response = await fetch(
        `/api/admin/polling-agents/export?${params.toString()}`
      );

      if (!response.ok) throw new Error("Failed to export agents");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `polling-agents_${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Agents exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export agents",
        variant: "destructive",
      });
    }
  };

  const agents = agentsData?.data || [];
  const filteredAgents = agents.filter((agent: PollingAgent) => {
    const matchesSearch =
      agent.agentCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.agentPin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.pollingUnitName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginatedAgents = filteredAgents.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const totalPages = Math.ceil(filteredAgents.length / pageSize);

  const stats = statsData?.data || {
    total: 0,
    checkedIn: 0,
    active: 0,
    completed: 0,
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Agent Management" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Polling Unit Agent Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage polling unit agents, batch generation, and imports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All registered agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Checked In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checkedIn}</div>
            <p className="text-xs text-muted-foreground mt-1">Agents checked in today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Agents with completed tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Batch Generate Agents
          </CardTitle>
          <CardDescription>
            Generate multiple polling unit agents for a specific location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger>
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {statesData?.data?.map((state) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedLga}
              onValueChange={setSelectedLga}
              disabled={!selectedState || selectedState === "all"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select LGA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All LGAs</SelectItem>
                {lgasData?.data?.map((lga) => (
                  <SelectItem key={lga.id} value={lga.id}>
                    {lga.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedWard}
              onValueChange={setSelectedWard}
              disabled={!selectedLga || selectedLga === "all"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Ward" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {wardsData?.data?.map((ward) => (
                  <SelectItem key={ward.id} value={ward.id}>
                    {ward.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedElection} onValueChange={setSelectedElection}>
              <SelectTrigger>
                <SelectValue placeholder="Election (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Elections</SelectItem>
                {electionsData?.data?.map((election) => (
                  <SelectItem key={election.id} value={election.id}>
                    {election.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Default Password"
              type="password"
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => batchGenerateMutation.mutate()}
              disabled={
                batchGenerateMutation.isPending || !selectedState || !defaultPassword
              }
            >
              {batchGenerateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Generate Agents
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedState("");
                setSelectedLga("");
                setSelectedWard("");
                setSelectedElection("");
                setDefaultPassword("");
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          {showBatchResults && batchResults && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-900">
                Successfully generated {batchResults.data.generatedCount} agents
              </p>
              <p className="text-sm text-green-700 mt-1">
                The agents have been created and are ready for assignment
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowBatchResults(false)}
              >
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agents List Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by agent code, PIN, name, or polling unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent Code</TableHead>
                  <TableHead>Agent PIN</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Polling Unit</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>LGA</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">Loading agents...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No agents found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAgents.map((agent: PollingAgent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-mono font-semibold">
                        {agent.agentCode}
                      </TableCell>
                      <TableCell className="font-mono">{agent.agentPin}</TableCell>
                      <TableCell>{agent.name || "N/A"}</TableCell>
                      <TableCell className="text-sm">{agent.pollingUnitName || "N/A"}</TableCell>
                      <TableCell className="text-sm">{agent.wardName || "N/A"}</TableCell>
                      <TableCell className="text-sm">{agent.lgaName || "N/A"}</TableCell>
                      <TableCell className="text-sm">{agent.stateName || "N/A"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={statusColorMap[agent.status] || "outline"}
                        >
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {agent.assignedAt
                          ? new Date(agent.assignedAt).toLocaleDateString()
                          : "Not assigned"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredAgents.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, filteredAgents.length)} of {filteredAgents.length} agents
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Polling Agents</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple polling agents at once
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                CSV File
              </label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                File should contain columns: agentCode, name, pollingUnit, wardId, lgaId, stateId
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Default Password
              </label>
              <Input
                type="password"
                placeholder="Enter default password for agents"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setSelectedFile(null);
                setImportPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={
                importMutation.isPending || !selectedFile || !importPassword
              }
            >
              {importMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
