import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Vote,
  Loader2,
  Trash2,
  Edit,
  Building2,
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Layers,
  UserPlus,
} from "lucide-react";

const POSITION_OPTIONS = [
  { value: "presidential", label: "Presidential", icon: Building2 },
  { value: "governorship", label: "Governorship", icon: MapPin },
  { value: "senatorial", label: "Senatorial", icon: Users },
  { value: "house_of_reps", label: "House of Representatives", icon: Users },
  { value: "state_assembly", label: "State House of Assembly", icon: Building2 },
  { value: "lga_chairman", label: "LGA Chairman", icon: MapPin },
  { value: "councillorship", label: "Councillorship", icon: Users },
];

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "ongoing", label: "Ongoing", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "completed", label: "Completed", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
];

const POSITION_LABELS: Record<string, string> = {
  presidential: "Presidential",
  governorship: "Governorship",
  senatorial: "Senatorial",
  house_of_reps: "House of Reps",
  state_assembly: "State Assembly",
  lga_chairman: "LGA Chairman",
  councillorship: "Councillorship",
};

interface Election {
  id: string;
  title: string;
  description?: string;
  electionYear: number;
  electionDate: string;
  position: string;
  stateId?: string;
  senatorialDistrictId?: string;
  constituency?: string;
  status: string;
  totalRegisteredVoters: number;
  totalAccreditedVoters: number;
  totalVotesCast: number;
  state?: { name: string } | null;
  candidates?: any[];
  createdAt: string;
}

export default function AdminGeneralElections() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [filterPosition, setFilterPosition] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [createPosition, setCreatePosition] = useState("");
  const [createYear, setCreateYear] = useState(new Date().getFullYear().toString());
  const [createDate, setCreateDate] = useState("");
  const [createStatus, setCreateStatus] = useState("upcoming");
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStateId, setCreateStateId] = useState("");

  const [bulkPosition, setBulkPosition] = useState("");
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear().toString());
  const [bulkDate, setBulkDate] = useState("");
  const [bulkStatus, setBulkStatus] = useState("upcoming");
  const [bulkSelectedStates, setBulkSelectedStates] = useState<string[]>([]);
  const [bulkSelectedLgas, setBulkSelectedLgas] = useState<string[]>([]);
  const [bulkSelectedWards, setBulkSelectedWards] = useState<string[]>([]);
  const [bulkSelectedDistricts, setBulkSelectedDistricts] = useState<string[]>([]);
  const [bulkFilterState, setBulkFilterState] = useState("");
  const [bulkFilterLga, setBulkFilterLga] = useState("");

  const [candidateName, setCandidateName] = useState("");
  const [candidateRunningMate, setCandidateRunningMate] = useState("");
  const [candidatePartyId, setCandidatePartyId] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const qp = new URLSearchParams();
  if (filterPosition) qp.set("position", filterPosition);
  if (filterStatus) qp.set("status", filterStatus);
  if (filterYear) qp.set("year", filterYear);

  const { data: electionsRaw, isLoading } = useQuery<{ success: boolean; data: Election[] }>({
    queryKey: ["/api/general-elections", filterPosition, filterStatus, filterYear],
    queryFn: async () => {
      const res = await fetch(`/api/general-elections?${qp.toString()}`);
      return res.json();
    },
  });
  const elections = electionsRaw?.data || [];

  const { data: statesRaw } = useQuery<any[]>({ queryKey: ["/api/states"] });
  const states = statesRaw || [];

  const { data: partiesRaw } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/parties"],
  });
  const parties = (partiesRaw?.data || []).filter((p: any) => p.isActive);

  const { data: districtsRaw } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/electoral/senatorial-districts", bulkFilterState],
    queryFn: async () => {
      const url = bulkFilterState
        ? `/api/electoral/senatorial-districts?stateId=${bulkFilterState}`
        : "/api/electoral/senatorial-districts";
      const res = await fetch(url);
      return res.json();
    },
  });
  const districts = districtsRaw?.data || [];

  const { data: lgasRaw } = useQuery<any>({
    queryKey: ["/api/lgas", bulkFilterState],
    enabled: !!bulkFilterState,
    queryFn: async () => {
      const res = await fetch(`/api/lgas?stateId=${bulkFilterState}`);
      return res.json();
    },
  });
  const lgas = lgasRaw?.success ? lgasRaw.data : lgasRaw || [];

  const { data: wardsRaw } = useQuery<any>({
    queryKey: ["/api/wards", bulkFilterLga],
    enabled: !!bulkFilterLga,
    queryFn: async () => {
      const res = await fetch(`/api/wards?lgaId=${bulkFilterLga}`);
      return res.json();
    },
  });
  const wards = wardsRaw?.success ? wardsRaw.data : wardsRaw || [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/general-elections", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Election Created", description: data.data.title });
        queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
        setCreateDialogOpen(false);
        resetCreateForm();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bulkMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/general-elections/bulk", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Bulk Creation Complete",
          description: `Created ${data.data.created} elections. ${data.data.errors > 0 ? `${data.data.errors} errors.` : ""}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
        setBulkDialogOpen(false);
        resetBulkForm();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiRequest("PATCH", `/api/general-elections/${id}`, payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Updated", description: "Election updated successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
        setEditDialogOpen(false);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/general-elections/${id}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Deleted", description: "Election and related data removed" });
        queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
        setDeleteDialogOpen(false);
        setSelectedElection(null);
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addCandidateMutation = useMutation({
    mutationFn: async ({ electionId, payload }: { electionId: string; payload: any }) => {
      const res = await apiRequest("POST", `/api/general-elections/${electionId}/candidates`, payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Candidate Added" });
        queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
        setCandidateName("");
        setCandidateRunningMate("");
        setCandidatePartyId("");
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function resetCreateForm() {
    setCreatePosition("");
    setCreateTitle("");
    setCreateDescription("");
    setCreateDate("");
    setCreateStateId("");
    setCreateStatus("upcoming");
  }

  function resetBulkForm() {
    setBulkPosition("");
    setBulkDate("");
    setBulkStatus("upcoming");
    setBulkSelectedStates([]);
    setBulkSelectedLgas([]);
    setBulkSelectedWards([]);
    setBulkSelectedDistricts([]);
    setBulkFilterState("");
    setBulkFilterLga("");
  }

  function handleCreate() {
    if (!createPosition || !createDate || !createYear) return;
    createMutation.mutate({
      title: createTitle || `${createYear} ${POSITION_LABELS[createPosition]} Election`,
      description: createDescription || undefined,
      electionYear: parseInt(createYear),
      electionDate: createDate,
      position: createPosition,
      stateId: createStateId || undefined,
      status: createStatus,
    });
  }

  function handleBulkCreate() {
    if (!bulkPosition || !bulkDate || !bulkYear) return;
    const payload: any = {
      position: bulkPosition,
      electionYear: parseInt(bulkYear),
      electionDate: bulkDate,
      status: bulkStatus,
    };
    if (["governorship", "house_of_reps", "state_assembly"].includes(bulkPosition)) {
      payload.stateIds = bulkSelectedStates;
    }
    if (bulkPosition === "senatorial") {
      payload.senatorialDistrictIds = bulkSelectedDistricts;
    }
    if (bulkPosition === "lga_chairman") {
      payload.lgaIds = bulkSelectedLgas;
    }
    if (bulkPosition === "councillorship") {
      payload.wardIds = bulkSelectedWards;
    }
    bulkMutation.mutate(payload);
  }

  function openEdit(election: Election) {
    setSelectedElection(election);
    setEditTitle(election.title);
    setEditStatus(election.status);
    setEditDescription(election.description || "");
    setEditDialogOpen(true);
  }

  function handleUpdate() {
    if (!selectedElection) return;
    updateMutation.mutate({
      id: selectedElection.id,
      payload: { title: editTitle, status: editStatus, description: editDescription },
    });
  }

  function toggleStateSelection(stateId: string) {
    setBulkSelectedStates((prev) =>
      prev.includes(stateId) ? prev.filter((s) => s !== stateId) : [...prev, stateId]
    );
  }

  function toggleDistrictSelection(id: string) {
    setBulkSelectedDistricts((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleLgaSelection(id: string) {
    setBulkSelectedLgas((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleWardSelection(id: string) {
    setBulkSelectedWards((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const electionYears = useMemo(() => {
    const years = new Set(elections.map((e) => e.electionYear));
    return Array.from(years).sort((a, b) => b - a);
  }, [elections]);

  const statusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find((o) => o.value === status);
    return <Badge className={s?.color || ""}>{s?.label || status}</Badge>;
  };

  const scopeNeeded = (pos: string) => {
    if (pos === "presidential") return "none";
    if (["governorship", "house_of_reps", "state_assembly"].includes(pos)) return "states";
    if (pos === "senatorial") return "senatorial_districts";
    if (pos === "lga_chairman") return "lgas";
    if (pos === "councillorship") return "wards";
    return "none";
  };

  return (
    <div className="space-y-6" data-testid="admin-general-elections">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">General Elections</h1>
          <p className="text-muted-foreground">Manage national, state, and local government elections</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-election">
            <Plus className="h-4 w-4 mr-2" />
            Create Election
          </Button>
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)} data-testid="button-bulk-create">
            <Layers className="h-4 w-4 mr-2" />
            Bulk Create
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterPosition} onValueChange={(val) => setFilterPosition(val === "__clear__" ? "" : val)}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-position">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">All Positions</SelectItem>
            {POSITION_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val === "__clear__" ? "" : val)}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={(val) => setFilterYear(val === "__clear__" ? "" : val)}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-year">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">All Years</SelectItem>
            {electionYears.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : elections.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground" data-testid="text-no-elections">
              <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No elections found</p>
              <p>Create a new election or adjust your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Title</th>
                    <th className="text-left p-3 font-medium">Position</th>
                    <th className="text-left p-3 font-medium">Scope</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Candidates</th>
                    <th className="text-left p-3 font-medium">Votes</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {elections.map((election) => (
                    <tr key={election.id} className="border-b hover-elevate" data-testid={`row-election-${election.id}`}>
                      <td className="p-3 font-medium max-w-[250px] truncate">{election.title}</td>
                      <td className="p-3">
                        <Badge variant="outline">{POSITION_LABELS[election.position] || election.position}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {election.state?.name || election.constituency || "National"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {new Date(election.electionDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-3">{statusBadge(election.status)}</td>
                      <td className="p-3">{election.candidates?.length || 0}</td>
                      <td className="p-3">{(election.totalVotesCast || 0).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedElection(election);
                              setCandidateDialogOpen(true);
                            }}
                            data-testid={`button-candidates-${election.id}`}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(election)} data-testid={`button-edit-${election.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedElection(election);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`button-delete-${election.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-create-election">
          <DialogHeader>
            <DialogTitle>Create Election</DialogTitle>
            <DialogDescription>Create a single general election</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Position</Label>
              <Select value={createPosition} onValueChange={setCreatePosition}>
                <SelectTrigger data-testid="create-select-position"><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Auto-generated if empty"
                data-testid="input-create-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Year</Label>
                <Input type="number" value={createYear} onChange={(e) => setCreateYear(e.target.value)} data-testid="input-create-year" />
              </div>
              <div>
                <Label>Election Date</Label>
                <Input type="date" value={createDate} onChange={(e) => setCreateDate(e.target.value)} data-testid="input-create-date" />
              </div>
            </div>
            {createPosition && createPosition !== "presidential" && (
              <div>
                <Label>State (for scoped elections)</Label>
                <Select value={createStateId} onValueChange={setCreateStateId}>
                  <SelectTrigger data-testid="create-select-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {states.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <Select value={createStatus} onValueChange={setCreateStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} data-testid="input-create-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!createPosition || !createDate || createMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-bulk-create">
          <DialogHeader>
            <DialogTitle>Bulk Create Elections</DialogTitle>
            <DialogDescription>Create elections for multiple areas at once</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Position Type</Label>
              <Select value={bulkPosition} onValueChange={(val) => { setBulkPosition(val); setBulkSelectedStates([]); setBulkSelectedDistricts([]); setBulkSelectedLgas([]); setBulkSelectedWards([]); }}>
                <SelectTrigger data-testid="bulk-select-position"><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Election Year</Label>
                <Input type="number" value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} data-testid="bulk-input-year" />
              </div>
              <div>
                <Label>Election Date</Label>
                <Input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} data-testid="bulk-input-date" />
              </div>
            </div>
            <div>
              <Label>Initial Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bulkPosition && scopeNeeded(bulkPosition) === "states" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Select States ({bulkSelectedStates.length} selected)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkSelectedStates(bulkSelectedStates.length === states.length ? [] : states.map((s: any) => s.id))}
                    data-testid="button-select-all-states"
                  >
                    {bulkSelectedStates.length === states.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-1 max-h-[200px] overflow-y-auto border rounded-md p-2">
                  {states.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm p-1 hover-elevate rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkSelectedStates.includes(s.id)}
                        onChange={() => toggleStateSelection(s.id)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {bulkPosition === "senatorial" && (
              <div>
                <div className="mb-2">
                  <Label>Filter by State</Label>
                  <Select value={bulkFilterState} onValueChange={(val) => setBulkFilterState(val === "__clear__" ? "" : val)}>
                    <SelectTrigger><SelectValue placeholder="All States" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">All States</SelectItem>
                      {states.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Select Senatorial Districts ({bulkSelectedDistricts.length} selected)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkSelectedDistricts(bulkSelectedDistricts.length === districts.length ? [] : districts.map((d: any) => d.id))}
                    data-testid="button-select-all-districts"
                  >
                    {bulkSelectedDistricts.length === districts.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto border rounded-md p-2">
                  {districts.map((d: any) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm p-1 hover-elevate rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkSelectedDistricts.includes(d.id)}
                        onChange={() => toggleDistrictSelection(d.id)}
                      />
                      {d.districtName} ({d.code})
                    </label>
                  ))}
                </div>
              </div>
            )}

            {bulkPosition === "lga_chairman" && (
              <div>
                <div className="mb-2">
                  <Label>Filter by State</Label>
                  <Select value={bulkFilterState} onValueChange={(val) => { setBulkFilterState(val === "__clear__" ? "" : val); setBulkFilterLga(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">All States</SelectItem>
                      {states.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {bulkFilterState && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Select LGAs ({bulkSelectedLgas.length} selected)</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBulkSelectedLgas(bulkSelectedLgas.length === lgas.length ? [] : lgas.map((l: any) => l.id))}
                      >
                        {bulkSelectedLgas.length === lgas.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto border rounded-md p-2">
                      {lgas.map((l: any) => (
                        <label key={l.id} className="flex items-center gap-2 text-sm p-1 hover-elevate rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bulkSelectedLgas.includes(l.id)}
                            onChange={() => toggleLgaSelection(l.id)}
                          />
                          {l.name}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {bulkPosition === "councillorship" && (
              <div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <Label>Filter by State</Label>
                    <Select value={bulkFilterState} onValueChange={(val) => { setBulkFilterState(val === "__clear__" ? "" : val); setBulkFilterLga(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__clear__">All States</SelectItem>
                        {states.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {bulkFilterState && (
                    <div>
                      <Label>Filter by LGA</Label>
                      <Select value={bulkFilterLga} onValueChange={(val) => setBulkFilterLga(val === "__clear__" ? "" : val)}>
                        <SelectTrigger><SelectValue placeholder="Select LGA" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__clear__">All LGAs</SelectItem>
                          {lgas.map((l: any) => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {bulkFilterLga && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Select Wards ({bulkSelectedWards.length} selected)</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBulkSelectedWards(bulkSelectedWards.length === wards.length ? [] : wards.map((w: any) => w.id))}
                      >
                        {bulkSelectedWards.length === wards.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto border rounded-md p-2">
                      {wards.map((w: any) => (
                        <label key={w.id} className="flex items-center gap-2 text-sm p-1 hover-elevate rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bulkSelectedWards.includes(w.id)}
                            onChange={() => toggleWardSelection(w.id)}
                          />
                          {w.name}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {bulkPosition === "presidential" && (
              <p className="text-sm text-muted-foreground">Presidential elections are national-level. One election will be created.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBulkCreate}
              disabled={!bulkPosition || !bulkDate || bulkMutation.isPending}
              data-testid="button-confirm-bulk"
            >
              {bulkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
              Create Elections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-election">
          <DialogHeader>
            <DialogTitle>Edit Election</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} data-testid="input-edit-title" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-confirm-edit">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={candidateDialogOpen} onOpenChange={setCandidateDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-candidates">
          <DialogHeader>
            <DialogTitle>Manage Candidates - {selectedElection?.title}</DialogTitle>
            <DialogDescription>Add candidates from registered parties</DialogDescription>
          </DialogHeader>
          {selectedElection && (
            <div className="space-y-4">
              {selectedElection.candidates && selectedElection.candidates.length > 0 && (
                <div className="border rounded-md p-3 space-y-2">
                  <Label className="text-sm font-medium">Current Candidates ({selectedElection.candidates.length})</Label>
                  {selectedElection.candidates.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                      <span>{c.name}</span>
                      <Badge variant="outline" style={{ borderColor: c.party?.color || "#666" }}>
                        {c.party?.abbreviation || "N/A"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-4 space-y-3">
                <Label className="font-medium">Add Candidate</Label>
                <div>
                  <Label>Party</Label>
                  <Select value={candidatePartyId} onValueChange={setCandidatePartyId}>
                    <SelectTrigger data-testid="select-candidate-party"><SelectValue placeholder="Select party" /></SelectTrigger>
                    <SelectContent>
                      {parties.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.abbreviation} - {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Candidate Name</Label>
                  <Input
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Full name"
                    data-testid="input-candidate-name"
                  />
                </div>
                {(selectedElection.position === "presidential" || selectedElection.position === "governorship") && (
                  <div>
                    <Label>Running Mate</Label>
                    <Input
                      value={candidateRunningMate}
                      onChange={(e) => setCandidateRunningMate(e.target.value)}
                      placeholder="Vice/Deputy name"
                      data-testid="input-candidate-running-mate"
                    />
                  </div>
                )}
                <Button
                  onClick={() => {
                    if (!candidateName || !candidatePartyId) return;
                    addCandidateMutation.mutate({
                      electionId: selectedElection.id,
                      payload: {
                        name: candidateName,
                        partyId: candidatePartyId,
                        runningMate: candidateRunningMate || undefined,
                      },
                    });
                  }}
                  disabled={!candidateName || !candidatePartyId || addCandidateMutation.isPending}
                  data-testid="button-add-candidate"
                >
                  {addCandidateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Add Candidate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-election">
          <DialogHeader>
            <DialogTitle>Delete Election</DialogTitle>
            <DialogDescription>
              This will permanently delete "{selectedElection?.title}" and all associated candidates, results, and result sheets. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedElection && deleteMutation.mutate(selectedElection.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
