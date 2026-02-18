import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
} from "@/components/ui/dialog";
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
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Zap,
  Search,
  Building2,
  MapPin,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Activity,
  Filter,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  UserPlus,
} from "lucide-react";

type GeneralElection = {
  id: string;
  title: string;
  position: string;
  electionYear: number;
  electionDate: string;
  status: string;
  stateId?: string | null;
  senatorialDistrictId?: string | null;
  federalConstituencyId?: string | null;
  lgaId?: string | null;
  wardId?: string | null;
  constituency?: string | null;
  state?: { id: string; name: string } | null;
  senatorialDistrict?: { id: string; districtName: string } | null;
  federalConstituency?: { id: string; name: string } | null;
  lga?: { id: string; name: string } | null;
  candidates?: any[];
  createdAt: string;
};

type StateOption = { id: string; name: string };

const POSITIONS = [
  { value: "presidential", label: "Presidential" },
  { value: "governorship", label: "Governorship" },
  { value: "senatorial", label: "Senatorial" },
  { value: "house_of_reps", label: "House of Representatives" },
  { value: "state_assembly", label: "State House of Assembly" },
  { value: "lga_chairman", label: "LGA Chairmanship" },
  { value: "councillorship", label: "Councillorship" },
];

const STATUS_CONFIG: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  upcoming: { variant: "secondary", icon: Clock },
  ongoing: { variant: "default", icon: Activity },
  completed: { variant: "outline", icon: CheckCircle },
  cancelled: { variant: "destructive", icon: XCircle },
};

export default function AdminGeneralElections() {
  const { toast } = useToast();
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterPosition, setFilterPosition] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);
  const [candidateElection, setCandidateElection] = useState<GeneralElection | null>(null);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newCandidateParty, setNewCandidateParty] = useState("");
  const [newCandidateRunningMate, setNewCandidateRunningMate] = useState("");

  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [bulkDate, setBulkDate] = useState("");
  const [bulkPositions, setBulkPositions] = useState<string[]>([]);
  const [bulkStates, setBulkStates] = useState<string[]>([]);
  const [bulkAllStates, setBulkAllStates] = useState(true);
  const [bulkStatus, setBulkStatus] = useState("upcoming");
  const [newStatus, setNewStatus] = useState("upcoming");

  const { data: electionsResp, isLoading } = useQuery<{ success: boolean; data: GeneralElection[] }>({
    queryKey: ["/api/general-elections"],
  });

  const { data: statesResp } = useQuery<{ success: boolean; data: StateOption[] }>({
    queryKey: ["/api/states"],
  });

  const { data: partiesResp } = useQuery<{ success: boolean; data: Array<{ id: string; name: string; abbreviation: string; color: string; logoUrl?: string }> }>({
    queryKey: ["/api/parties"],
  });

  const elections = electionsResp?.data || [];
  const states = statesResp?.data || [];
  const parties = partiesResp?.data || [];

  const addCandidateMutation = useMutation({
    mutationFn: async ({ electionId, name, partyId, runningMate }: { electionId: string; name: string; partyId: string; runningMate?: string }) => {
      const res = await apiRequest("POST", `/api/general-elections/${electionId}/candidates`, { name, partyId, runningMate: runningMate || undefined });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add candidate");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Candidate Added", description: "Candidate added successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
      setNewCandidateName("");
      setNewCandidateParty("");
      setNewCandidateRunningMate("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async ({ electionId, candidateId }: { electionId: string; candidateId: string }) => {
      const res = await apiRequest("DELETE", `/api/general-elections/${electionId}/candidates/${candidateId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete candidate");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Candidate Removed", description: "Candidate removed successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/general-elections/bulk-create", data);
      return res.json();
    },
    onSuccess: (resp) => {
      toast({ title: "Elections Created", description: `${resp.data.created} elections created successfully.${resp.data.errors > 0 ? ` ${resp.data.errors} errors occurred.` : ""}` });
      queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
      setBulkCreateOpen(false);
      resetBulkForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async (data: { electionIds: string[]; status: string }) => {
      const res = await apiRequest("PATCH", "/api/general-elections/bulk-status", data);
      return res.json();
    },
    onSuccess: (resp) => {
      toast({ title: "Status Updated", description: `${resp.data.updated} elections updated.` });
      queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
      setSelectedIds(new Set());
      setStatusChangeOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/general-elections/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Election deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
      setDeleteConfirmId(null);
    },
  });

  function resetBulkForm() {
    setBulkYear(new Date().getFullYear());
    setBulkDate("");
    setBulkPositions([]);
    setBulkStates([]);
    setBulkAllStates(true);
    setBulkStatus("upcoming");
  }

  const filteredElections = elections.filter((e) => {
    if (filterPosition !== "all" && e.position !== filterPosition) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (filterState !== "all" && e.stateId !== filterState) return false;
    if (filterYear !== "all" && e.electionYear !== parseInt(filterYear)) return false;
    if (searchTerm && !e.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const positionGroups = filteredElections.reduce((acc, e) => {
    const key = e.position;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, GeneralElection[]>);

  const years = Array.from(new Set(elections.map((e) => e.electionYear))).sort((a, b) => b - a);
  const positionCounts = elections.reduce((acc, e) => {
    acc[e.position] = (acc[e.position] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusCounts = elections.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const allFilteredSelected = filteredElections.length > 0 && filteredElections.every((e) => selectedIds.has(e.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredElections.map((e) => e.id)));
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function getLocationLabel(e: GeneralElection): string {
    const parts: string[] = [];
    if (e.state?.name) parts.push(e.state.name);
    if (e.senatorialDistrict?.districtName) parts.push(e.senatorialDistrict.districtName);
    if (e.federalConstituency?.name) parts.push(e.federalConstituency.name);
    if (e.lga?.name) parts.push(e.lga.name);
    if (e.constituency && !e.federalConstituency) parts.push(e.constituency);
    return parts.join(" / ") || "National";
  }

  const positionLabel = (pos: string) => POSITIONS.find((p) => p.value === pos)?.label || pos;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <BreadcrumbNav
        items={[
          { label: "Admin", href: "/admin" },
          { label: "General Elections" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">General Election Management</h1>
          <p className="text-sm text-muted-foreground">{elections.length} elections total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={() => setStatusChangeOpen(true)} data-testid="button-bulk-status">
              <Zap className="w-4 h-4 mr-1" />
              Update Status ({selectedIds.size})
            </Button>
          )}
          <Button onClick={() => setBulkCreateOpen(true)} data-testid="button-bulk-create">
            <Plus className="w-4 h-4 mr-1" />
            Bulk Create Elections
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
          const Icon = cfg.icon;
          return (
            <Card key={status} className="cursor-pointer hover-elevate" onClick={() => setFilterStatus(filterStatus === status ? "all" : status)} data-testid={`card-status-${status}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{status}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search elections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={filterPosition} onValueChange={setFilterPosition}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-position">
                <Filter className="w-4 h-4 mr-1" />
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label} ({positionCounts[p.value] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-state">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {years.length > 0 && (
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[120px]" data-testid="select-filter-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filteredElections.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No Elections Found</p>
            <p className="text-sm text-muted-foreground mb-4">Create elections using the bulk create button above.</p>
            <Button onClick={() => setBulkCreateOpen(true)} data-testid="button-create-first">
              <Plus className="w-4 h-4 mr-1" /> Create Elections
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Checkbox
              checked={allFilteredSelected}
              onCheckedChange={toggleSelectAll}
              data-testid="checkbox-select-all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all ${filteredElections.length} shown`}
            </span>
          </div>

          {Object.entries(positionGroups).sort(([a], [b]) => {
            const order = ["presidential", "governorship", "senatorial", "house_of_reps", "state_assembly", "lga_chairman", "councillorship"];
            return order.indexOf(a) - order.indexOf(b);
          }).map(([position, posElections]) => {
            const isExpanded = expandedPosition === position || expandedPosition === null;
            const displayElections = isExpanded ? posElections : posElections.slice(0, 3);
            return (
              <Card key={position}>
                <CardHeader className="p-4 cursor-pointer" onClick={() => setExpandedPosition(expandedPosition === position ? null : position)}>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {positionLabel(position)}
                      <Badge variant="secondary">{posElections.length}</Badge>
                    </CardTitle>
                    {expandedPosition === position ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {displayElections.map((e) => {
                      const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.upcoming;
                      return (
                        <div
                          key={e.id}
                          className="flex items-center gap-3 px-4 py-3 hover-elevate"
                          data-testid={`row-election-${e.id}`}
                        >
                          <Checkbox
                            checked={selectedIds.has(e.id)}
                            onCheckedChange={() => toggleSelect(e.id)}
                            data-testid={`checkbox-election-${e.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" data-testid={`text-election-title-${e.id}`}>{e.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{getLocationLabel(e)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={cfg.variant} data-testid={`badge-status-${e.id}`}>
                              {e.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCandidateElection(e)}
                              data-testid={`button-candidates-${e.id}`}
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              <span className="hidden md:inline">{e.candidates?.length || 0}</span>
                              <span className="md:hidden">{e.candidates?.length || 0}</span>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(e.id)}
                              data-testid={`button-delete-${e.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {!isExpanded && posElections.length > 3 && (
                      <div className="px-4 py-2 text-center">
                        <Button variant="ghost" size="sm" onClick={() => setExpandedPosition(position)} data-testid={`button-expand-${position}`}>
                          Show {posElections.length - 3} more
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={bulkCreateOpen} onOpenChange={setBulkCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Create Elections</DialogTitle>
            <DialogDescription>Create elections for multiple positions and states at once.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Election Year</Label>
                <Input
                  type="number"
                  value={bulkYear}
                  onChange={(e) => setBulkYear(parseInt(e.target.value) || new Date().getFullYear())}
                  data-testid="input-bulk-year"
                />
              </div>
              <div>
                <Label>Election Date</Label>
                <Input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  data-testid="input-bulk-date"
                />
              </div>
            </div>

            <div>
              <Label>Initial Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger data-testid="select-bulk-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Election Positions</Label>
              <div className="space-y-2">
                {POSITIONS.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={bulkPositions.includes(p.value)}
                      onCheckedChange={(checked) => {
                        if (checked) setBulkPositions([...bulkPositions, p.value]);
                        else setBulkPositions(bulkPositions.filter((v) => v !== p.value));
                      }}
                      data-testid={`checkbox-position-${p.value}`}
                    />
                    <span className="text-sm">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <Checkbox
                  checked={bulkAllStates}
                  onCheckedChange={(checked) => setBulkAllStates(!!checked)}
                  data-testid="checkbox-all-states"
                />
                <span className="text-sm font-medium">All States</span>
              </label>
              {!bulkAllStates && (
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto border rounded-md p-2">
                  {states.map((s) => (
                    <label key={s.id} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                      <Checkbox
                        checked={bulkStates.includes(s.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setBulkStates([...bulkStates, s.id]);
                          else setBulkStates(bulkStates.filter((v) => v !== s.id));
                        }}
                        data-testid={`checkbox-state-${s.id}`}
                      />
                      <span className="text-xs">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {bulkPositions.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm font-medium mb-1">Preview:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {bulkPositions.includes("presidential") && <li>1 Presidential election</li>}
                    {bulkPositions.includes("governorship") && (
                      <li>{bulkAllStates ? "36" : bulkStates.length} Governorship elections</li>
                    )}
                    {bulkPositions.includes("senatorial") && (
                      <li>~{bulkAllStates ? "109" : "varies"} Senatorial elections</li>
                    )}
                    {bulkPositions.includes("house_of_reps") && (
                      <li>~{bulkAllStates ? "348" : "varies"} House of Reps elections</li>
                    )}
                    {bulkPositions.includes("state_assembly") && (
                      <li>{bulkAllStates ? "37" : bulkStates.length} State Assembly elections</li>
                    )}
                    {bulkPositions.includes("lga_chairman") && (
                      <li>~{bulkAllStates ? "774" : "varies"} LGA Chairmanship elections</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCreateOpen(false)} data-testid="button-cancel-bulk">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!bulkDate || bulkPositions.length === 0) {
                  toast({ title: "Missing Fields", description: "Select date and at least one position.", variant: "destructive" });
                  return;
                }
                bulkCreateMutation.mutate({
                  electionYear: bulkYear,
                  electionDate: bulkDate,
                  positions: bulkPositions,
                  stateIds: bulkAllStates ? undefined : bulkStates,
                  status: bulkStatus,
                });
              }}
              disabled={bulkCreateMutation.isPending}
              data-testid="button-submit-bulk"
            >
              {bulkCreateMutation.isPending ? "Creating..." : "Create Elections"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Election Status</DialogTitle>
            <DialogDescription>Change the status of {selectedIds.size} selected elections.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger data-testid="select-new-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeOpen(false)} data-testid="button-cancel-status">
              Cancel
            </Button>
            <Button
              onClick={() => bulkStatusMutation.mutate({ electionIds: Array.from(selectedIds), status: newStatus })}
              disabled={bulkStatusMutation.isPending}
              data-testid="button-submit-status"
            >
              {bulkStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Election</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this election and its data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!candidateElection} onOpenChange={(open) => { if (!open) setCandidateElection(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Candidates</DialogTitle>
            <DialogDescription>{candidateElection?.title}</DialogDescription>
          </DialogHeader>

          {candidateElection && (
            <div className="space-y-4" data-testid="candidate-management-panel">
              {(() => {
                const currentElection = elections.find(e => e.id === candidateElection.id);
                const currentCandidates = currentElection?.candidates || [];
                return (
                  <>
                    {currentCandidates.length > 0 ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Current Candidates ({currentCandidates.length})</Label>
                        {currentCandidates.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between gap-2 p-2 border border-border rounded-md" data-testid={`candidate-row-${c.id}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: c.party?.color || '#888' }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground">{c.party?.abbreviation || 'Unknown Party'}{c.runningMate ? ` / ${c.runningMate}` : ''}</p>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteCandidateMutation.mutate({ electionId: candidateElection.id, candidateId: c.id })}
                              disabled={deleteCandidateMutation.isPending}
                              data-testid={`button-remove-candidate-${c.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No candidates added yet.</p>
                    )}

                    <div className="border-t border-border pt-4 space-y-3">
                      <Label className="text-sm font-medium">Add New Candidate</Label>
                      <div>
                        <Label className="text-xs text-muted-foreground">Candidate Name</Label>
                        <Input
                          value={newCandidateName}
                          onChange={(e) => setNewCandidateName(e.target.value)}
                          placeholder="Full name of candidate"
                          data-testid="input-candidate-name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Party</Label>
                        <Select value={newCandidateParty} onValueChange={setNewCandidateParty}>
                          <SelectTrigger data-testid="select-candidate-party">
                            <SelectValue placeholder="Select party" />
                          </SelectTrigger>
                          <SelectContent>
                            {parties.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                                  {p.name} ({p.abbreviation})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(candidateElection.position === "presidential" || candidateElection.position === "governorship") && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Running Mate (optional)</Label>
                          <Input
                            value={newCandidateRunningMate}
                            onChange={(e) => setNewCandidateRunningMate(e.target.value)}
                            placeholder="Running mate name"
                            data-testid="input-running-mate"
                          />
                        </div>
                      )}
                      <Button
                        onClick={() => {
                          if (!newCandidateName.trim() || !newCandidateParty) {
                            toast({ title: "Validation Error", description: "Name and party are required.", variant: "destructive" });
                            return;
                          }
                          addCandidateMutation.mutate({
                            electionId: candidateElection.id,
                            name: newCandidateName.trim(),
                            partyId: newCandidateParty,
                            runningMate: newCandidateRunningMate.trim() || undefined,
                          });
                        }}
                        disabled={addCandidateMutation.isPending || !newCandidateName.trim() || !newCandidateParty}
                        data-testid="button-add-candidate"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {addCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
