import { useState, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  Loader2,
  UserPlus,
  MapPin,
  Hash,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";

interface AgentStats {
  totalAgents: number;
  assigned: number;
  active: number;
  checkedIn: number;
  completed: number;
  revoked: number;
  totalPollingUnits: number;
  coverage: number;
}

interface Agent {
  id: string;
  agentCode: string;
  agentPin: string;
  status: string;
  assignedAt: string;
  checkedInAt: string | null;
  member: {
    id: string;
    memberId: string;
    user: { firstName: string; lastName: string; email: string };
  };
  pollingUnit: { id: string; name: string; unitCode: string };
  election?: { id: string; title: string } | null;
}

export default function AdminAgentManagement() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedLga, setSelectedLga] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [batchPassword, setBatchPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showPins, setShowPins] = useState<Set<string>>(new Set());

  const { data: statesResponse } = useQuery<any>({
    queryKey: ["/api/states"],
  });
  const states = statesResponse?.data || statesResponse || [];

  const { data: lgas } = useQuery<any[]>({
    queryKey: ["/api/lgas", selectedState],
    enabled: !!selectedState,
    queryFn: async () => {
      const res = await fetch(`/api/lgas?stateId=${selectedState}`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const { data: wards } = useQuery<any[]>({
    queryKey: ["/api/wards", selectedLga],
    enabled: !!selectedLga,
    queryFn: async () => {
      const res = await fetch(`/api/wards?lgaId=${selectedLga}`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const statsQueryParams = new URLSearchParams();
  if (selectedState) statsQueryParams.set("stateId", selectedState);
  if (selectedLga) statsQueryParams.set("lgaId", selectedLga);
  if (selectedWard) statsQueryParams.set("wardId", selectedWard);

  const { data: stats, isLoading: statsLoading } = useQuery<AgentStats>({
    queryKey: ["/api/admin/polling-agents/stats", selectedState, selectedLga, selectedWard],
    queryFn: async () => {
      const res = await fetch(`/api/admin/polling-agents/stats?${statsQueryParams.toString()}`);
      const json = await res.json();
      return json.data;
    },
  });

  const agentQueryParams = new URLSearchParams();
  if (filterStatus) agentQueryParams.set("status", filterStatus);

  const { data: agentsRaw, isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/admin/polling-agents", filterStatus],
    queryFn: async () => {
      const res = await fetch(`/api/admin/polling-agents?${agentQueryParams.toString()}`);
      const json = await res.json();
      return json.data;
    },
  });

  const agents = agentsRaw || [];

  const batchMutation = useMutation({
    mutationFn: async (payload: { stateId: string; lgaId?: string; wardId?: string; batchPassword?: string }) => {
      const res = await apiRequest("POST", "/api/admin/polling-agents/batch", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Batch Generation Complete",
          description: `Created ${data.data.created} agents. Skipped ${data.data.skipped} (already assigned or errors).`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents/stats"] });
        setBatchDialogOpen(false);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Batch generation failed", variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/polling-agents/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Import Complete",
          description: `Created ${data.data.created} agents. Skipped ${data.data.skipped}.${data.data.errors.length > 0 ? ` Errors: ${data.data.errors.length}` : ""}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents/stats"] });
      } else {
        toast({ title: "Import Error", description: data.error, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to import agents", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/polling-agents/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling-agents/stats"] });
      toast({ title: "Agent status updated" });
    },
  });

  const handleBatchGenerate = () => {
    if (!selectedState) {
      toast({ title: "Error", description: "Please select a state", variant: "destructive" });
      return;
    }
    batchMutation.mutate({
      stateId: selectedState,
      lgaId: selectedLga || undefined,
      wardId: selectedWard || undefined,
      batchPassword: batchPassword || undefined,
    });
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (selectedState) params.set("stateId", selectedState);
    if (selectedLga) params.set("lgaId", selectedLga);
    if (selectedWard) params.set("wardId", selectedWard);
    if (filterStatus) params.set("status", filterStatus);
    window.open(`/api/admin/polling-agents/export?${params.toString()}`, "_blank");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = "";
    }
  };

  const togglePin = (agentId: string) => {
    setShowPins(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const statesList = Array.isArray(states) ? states : [];
  const stateName = statesList.find((s: any) => s.id === selectedState)?.name || "";

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Agent Management" },
        ]}
      />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Polling Agent Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate, manage, and monitor polling unit agents
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleImport}
            data-testid="input-import-file"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            data-testid="button-import"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importMutation.isPending ? "Importing..." : "Import CSV"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => setBatchDialogOpen(true)}
            data-testid="button-batch-generate"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Batch Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>State</Label>
          <Select
            value={selectedState}
            onValueChange={(val) => {
              setSelectedState(val === "__clear__" ? "" : val);
              setSelectedLga("");
              setSelectedWard("");
            }}
          >
            <SelectTrigger data-testid="select-state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__clear__">All States</SelectItem>
              {statesList.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>LGA</Label>
          <Select
            value={selectedLga}
            onValueChange={(val) => {
              setSelectedLga(val === "__clear__" ? "" : val);
              setSelectedWard("");
            }}
            disabled={!selectedState}
          >
            <SelectTrigger data-testid="select-lga">
              <SelectValue placeholder="Select LGA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__clear__">All LGAs</SelectItem>
              {lgas?.map((l: any) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ward</Label>
          <Select
            value={selectedWard}
            onValueChange={(val) => setSelectedWard(val === "__clear__" ? "" : val)}
            disabled={!selectedLga}
          >
            <SelectTrigger data-testid="select-ward">
              <SelectValue placeholder="Select ward" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__clear__">All Wards</SelectItem>
              {wards?.map((w: any) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-agents">
              {stats?.totalAgents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.coverage || 0}% coverage of {stats?.totalPollingUnits || 0} PUs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-checked-in">
              {stats?.checkedIn || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active: {stats?.active || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-assigned">
              {stats?.assigned || 0}
            </div>
            <p className="text-xs text-muted-foreground">Completed: {stats?.completed || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revoked</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-revoked">
              {stats?.revoked || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold">Agent List</h2>
          <Select
            value={filterStatus || "all"}
            onValueChange={(val) => setFilterStatus(val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {agentsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground" data-testid="text-empty-state">
            No agents found. Use "Batch Generate" to create agents for polling units.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Agent Code</th>
                  <th className="text-left py-3 px-2 font-medium">PIN</th>
                  <th className="text-left py-3 px-2 font-medium">Agent Name</th>
                  <th className="text-left py-3 px-2 font-medium">Polling Unit</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-left py-3 px-2 font-medium">Assigned</th>
                  <th className="text-left py-3 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.slice(0, 50).map((agent) => (
                  <tr key={agent.id} className="border-b" data-testid={`row-agent-${agent.id}`}>
                    <td className="py-2 px-2 font-mono text-xs" data-testid={`text-code-${agent.id}`}>
                      {agent.agentCode}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs" data-testid={`text-pin-${agent.id}`}>
                          {showPins.has(agent.id) ? agent.agentPin : "****"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePin(agent.id)}
                          data-testid={`button-toggle-pin-${agent.id}`}
                        >
                          {showPins.has(agent.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="py-2 px-2" data-testid={`text-name-${agent.id}`}>
                      {agent.member?.user?.firstName} {agent.member?.user?.lastName}
                    </td>
                    <td className="py-2 px-2 text-xs" data-testid={`text-pu-${agent.id}`}>
                      {agent.pollingUnit?.name}
                      <span className="text-muted-foreground ml-1">({agent.pollingUnit?.unitCode})</span>
                    </td>
                    <td className="py-2 px-2">
                      <Badge
                        variant={
                          agent.status === "checked_in" || agent.status === "active"
                            ? "default"
                            : agent.status === "revoked"
                            ? "destructive"
                            : "outline"
                        }
                        data-testid={`badge-status-${agent.id}`}
                      >
                        {agent.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">
                      {agent.assignedAt ? format(new Date(agent.assignedAt), "MMM d, yyyy") : "N/A"}
                    </td>
                    <td className="py-2 px-2">
                      {agent.status !== "revoked" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: agent.id, status: "revoked" })}
                          data-testid={`button-revoke-${agent.id}`}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: agent.id, status: "assigned" })}
                          data-testid={`button-reactivate-${agent.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agents.length > 50 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Showing first 50 of {agents.length} agents. Use Export to view all.
              </p>
            )}
          </div>
        )}
      </Card>

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Generate Agents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create an agent account for every polling unit in the selected area that
              doesn't already have one assigned. Each agent will get a unique code and the shared PIN.
            </p>

            <div>
              <Label>State (Required)</Label>
              <Select
                value={selectedState}
                onValueChange={(val) => {
                  setSelectedState(val);
                  setSelectedLga("");
                  setSelectedWard("");
                }}
              >
                <SelectTrigger data-testid="batch-select-state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {statesList.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>LGA (Optional - narrows scope)</Label>
              <Select
                value={selectedLga}
                onValueChange={(val) => {
                  setSelectedLga(val === "__clear__" ? "" : val);
                  setSelectedWard("");
                }}
                disabled={!selectedState}
              >
                <SelectTrigger data-testid="batch-select-lga">
                  <SelectValue placeholder="All LGAs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__clear__">All LGAs</SelectItem>
                  {lgas?.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ward (Optional - narrows scope further)</Label>
              <Select
                value={selectedWard}
                onValueChange={(val) => setSelectedWard(val === "__clear__" ? "" : val)}
                disabled={!selectedLga}
              >
                <SelectTrigger data-testid="batch-select-ward">
                  <SelectValue placeholder="All Wards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__clear__">All Wards</SelectItem>
                  {wards?.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Batch PIN (shared for all agents in this batch)</Label>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={batchPassword}
                  onChange={(e) => setBatchPassword(e.target.value)}
                  placeholder="Leave empty for auto-generated 4-digit PIN"
                  data-testid="input-batch-password"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-batch-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchDialogOpen(false)}
              data-testid="button-cancel-batch"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchGenerate}
              disabled={!selectedState || batchMutation.isPending}
              data-testid="button-confirm-batch"
            >
              {batchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Generate Agents
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
