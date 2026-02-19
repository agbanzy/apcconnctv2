import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Users,
  FileCheck,
  Activity,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  LogIn,
  Send,
  ArrowLeft,
  RefreshCw,
  Vote,
  AlertTriangle,
  Map,
  X,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { NIGERIA_STATE_PATHS, NIGERIA_MAP_VIEWBOX, STATE_NAME_ALIASES } from "@/lib/nigeria-svg-paths";
import { io } from "socket.io-client";

interface StateResult {
  state_id: string;
  state_name: string;
  total_votes: number;
  total_pus: number;
  reported_pus: number;
  leading_party?: string;
  leading_party_color?: string;
  leading_party_abbreviation?: string;
  leading_candidate?: string;
  leading_votes?: number;
  candidates?: Array<{
    candidate_name: string;
    party_abbreviation: string;
    party_color: string;
    total_votes: number;
  }>;
}

function findStateResult(states: StateResult[] | undefined, svgName: string): StateResult | undefined {
  if (!states) return undefined;
  const aliases = STATE_NAME_ALIASES[svgName] || [svgName];
  return states.find(s => aliases.some(a => a.toLowerCase() === s.state_name.toLowerCase()));
}

function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    login: { label: "Login", variant: "outline" },
    check_in: { label: "Check-in", variant: "secondary" },
    submit_results: { label: "Results", variant: "default" },
    submit_results_batch: { label: "Batch Results", variant: "default" },
    upload_result_sheet: { label: "Sheet Upload", variant: "secondary" },
  };
  const c = config[action] || { label: action, variant: "outline" };
  return <Badge variant={c.variant} data-testid={`badge-action-${action}`}>{c.label}</Badge>;
}

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case "login":
    case "check_in":
      return <LogIn className="w-4 h-4" />;
    case "submit_results":
    case "submit_results_batch":
      return <Send className="w-4 h-4" />;
    case "upload_result_sheet":
      return <Upload className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ElectionResultsMap({
  stateData,
  isLoading,
  electionSelected,
}: {
  stateData: StateResult[] | undefined;
  isLoading: boolean;
  electionSelected: boolean;
}) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<StateResult | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{
    x: number; y: number; name: string; data: StateResult | undefined;
  } | null>(null);

  const maxVotes = useMemo(() => {
    if (!stateData?.length) return 1;
    return Math.max(1, ...stateData.map(s => s.total_votes));
  }, [stateData]);

  const getColor = useCallback((svgName: string): string => {
    if (!electionSelected) return "hsl(var(--muted))";
    const result = findStateResult(stateData, svgName);
    if (!result || result.total_votes === 0) return "hsl(220, 13%, 88%)";
    if (result.leading_party_color) {
      const intensity = Math.min(result.total_votes / maxVotes, 1);
      const lightness = 70 - (intensity * 30);
      const hex = result.leading_party_color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const blended_r = Math.round(r + (255 - r) * (1 - intensity) * 0.6);
      const blended_g = Math.round(g + (255 - g) * (1 - intensity) * 0.6);
      const blended_b = Math.round(b + (255 - b) * (1 - intensity) * 0.6);
      return `rgb(${blended_r}, ${blended_g}, ${blended_b})`;
    }
    const intensity = Math.min(result.total_votes / maxVotes, 1);
    const lightness = 70 - (intensity * 30);
    return `hsl(142, 50%, ${lightness}%)`;
  }, [stateData, maxVotes, electionSelected]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>, svgName: string) => {
    const svg = e.currentTarget.closest("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltipInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      name: svgName,
      data: findStateResult(stateData, svgName),
    });
  }, [stateData]);

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 relative">
        <svg
          viewBox={NIGERIA_MAP_VIEWBOX}
          className="w-full h-auto"
          style={{ maxHeight: "60vh" }}
          data-testid="svg-election-results-map"
        >
          {Object.entries(NIGERIA_STATE_PATHS).map(([svgName, pathData]) => {
            const fillColor = getColor(svgName);
            const isHovered = hoveredState === svgName;
            const result = findStateResult(stateData, svgName);
            const isSelected = selectedState?.state_name.toLowerCase() === result?.state_name.toLowerCase();

            return (
              <path
                key={pathData.id}
                d={pathData.d}
                fill={fillColor}
                stroke={
                  isSelected ? "hsl(var(--primary))" :
                  isHovered ? "hsl(220, 50%, 40%)" :
                  "hsl(220, 10%, 40%)"
                }
                strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 0.5}
                className="cursor-pointer outline-none"
                style={{
                  transition: "fill 0.2s, stroke 0.2s, stroke-width 0.2s",
                }}
                onMouseEnter={() => setHoveredState(svgName)}
                onMouseMove={(e) => handleMouseMove(e, svgName)}
                onMouseLeave={() => {
                  setHoveredState(null);
                  setTooltipInfo(null);
                }}
                onClick={() => setSelectedState(result || null)}
                data-testid={`election-state-${svgName.toLowerCase().replace(/\s+/g, "-")}`}
                role="button"
                tabIndex={0}
                aria-label={`${svgName}: ${result?.total_votes || 0} votes`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedState(result || null);
                  }
                }}
              />
            );
          })}

          {Object.entries(NIGERIA_STATE_PATHS).map(([svgName, pathData]) => {
            const abbrev = svgName === "Federal Capital Territory" ? "FCT" :
                           svgName === "Cross River" ? "C.River" :
                           svgName === "Akwa Ibom" ? "A.Ibom" :
                           svgName === "Nassarawa" ? "Nasar." :
                           svgName;
            const fontSize = ["Lagos", "Federal Capital Territory", "Ebonyi", "Anambra", "Imo", "Abia", "Bayelsa", "Ekiti"].includes(svgName) ? 6 : 8;
            return (
              <text
                key={`label-${pathData.id}`}
                x={pathData.labelX}
                y={pathData.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none"
                fill="hsl(220, 15%, 12%)"
                fontSize={fontSize}
                fontWeight={600}
                paintOrder="stroke"
                stroke="hsla(0, 0%, 100%, 0.7)"
                strokeWidth={2}
              >
                {abbrev}
              </text>
            );
          })}
        </svg>

        {tooltipInfo && hoveredState && (
          <div
            className="absolute z-50 pointer-events-none bg-popover border border-border rounded-md shadow-lg p-3 min-w-[200px]"
            style={{
              left: Math.min(tooltipInfo.x, (typeof window !== "undefined" ? window.innerWidth * 0.5 : 300)),
              top: tooltipInfo.y,
              transform: "translate(-50%, -100%)",
            }}
            data-testid="tooltip-election-state"
          >
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-2">
              <MapPin className="h-4 w-4" />
              <span className="font-bold text-sm">{tooltipInfo.name}</span>
            </div>
            {tooltipInfo.data && tooltipInfo.data.total_votes > 0 ? (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Total Votes</span>
                  <span className="font-bold">{tooltipInfo.data.total_votes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">PUs Reporting</span>
                  <span className="font-medium">{tooltipInfo.data.reported_pus} / {tooltipInfo.data.total_pus}</span>
                </div>
                {tooltipInfo.data.leading_candidate && (
                  <div className="border-t border-border pt-1 mt-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltipInfo.data.leading_party_color || "#888" }} />
                      <span className="font-medium">{tooltipInfo.data.leading_candidate}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {tooltipInfo.data.leading_party_abbreviation} - {(tooltipInfo.data.leading_votes || 0).toLocaleString()} votes
                    </span>
                  </div>
                )}
                <div className="text-muted-foreground pt-1">Click for details</div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No results reported</p>
            )}
          </div>
        )}

        {!electionSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
            <div className="text-center">
              <Map className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Select an election to see results on the map</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {selectedState ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {selectedState.state_name}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedState(null)} data-testid="button-close-state-detail">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Total Votes</div>
                  <div className="text-xl font-bold">{selectedState.total_votes.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">PUs Reporting</div>
                  <div className="text-xl font-bold">{selectedState.reported_pus} <span className="text-sm font-normal text-muted-foreground">/ {selectedState.total_pus}</span></div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Reporting Rate</div>
                <Progress value={selectedState.total_pus > 0 ? (selectedState.reported_pus / selectedState.total_pus) * 100 : 0} className="h-2" />
                <div className="text-xs text-muted-foreground text-right mt-0.5">
                  {selectedState.total_pus > 0 ? Math.round((selectedState.reported_pus / selectedState.total_pus) * 100) : 0}%
                </div>
              </div>
              {selectedState.candidates && selectedState.candidates.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <div className="text-xs text-muted-foreground font-medium">Candidate Results</div>
                  {selectedState.candidates.map((c, i) => {
                    const pct = selectedState.total_votes > 0 ? Math.round((c.total_votes / selectedState.total_votes) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.party_color || "#888" }} />
                            <span className="truncate">{c.candidate_name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{c.party_abbreviation}</Badge>
                          </div>
                          <span className="font-bold shrink-0">{c.total_votes.toLocaleString()}</span>
                        </div>
                        <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: c.party_color || "#888" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {electionSelected ? "Click on a state to see detailed results" : "Select an election first"}
              </p>
            </CardContent>
          </Card>
        )}

        {stateData && stateData.filter(s => s.total_votes > 0).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top States by Votes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stateData
                .filter(s => s.total_votes > 0)
                .sort((a, b) => b.total_votes - a.total_votes)
                .slice(0, 8)
                .map((state) => (
                  <div
                    key={state.state_id}
                    className="flex items-center justify-between gap-2 py-1 cursor-pointer hover-elevate rounded-md px-2"
                    onClick={() => setSelectedState(state)}
                    data-testid={`topstate-${state.state_id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {state.leading_party_color && (
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: state.leading_party_color }} />
                      )}
                      <span className="text-sm truncate">{state.state_name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {state.leading_party_abbreviation && (
                        <Badge variant="outline" className="text-xs">{state.leading_party_abbreviation}</Badge>
                      )}
                      <span className="text-sm font-bold">{state.total_votes.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ElectionAnalytics() {
  const [, navigate] = useLocation();
  const [selectedElection, setSelectedElection] = useState<string>("");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [sheetFilter, setSheetFilter] = useState<string>("all");
  const [isLive, setIsLive] = useState(false);
  const [liveEvents, setLiveEvents] = useState<Array<{ type: string; time: Date; data?: any }>>([]);

  const { data: dashboardData, isLoading: dashLoading } = useQuery<any>({
    queryKey: ["/api/analytics/election-dashboard"],
  });

  const { data: electionsData } = useQuery<any>({
    queryKey: ["/api/general-elections"],
  });

  const { data: electionAnalytics, isLoading: electionLoading } = useQuery<any>({
    queryKey: ["/api/analytics/elections", selectedElection],
    enabled: !!selectedElection && selectedElection !== "__all__",
  });

  const { data: stateBreakdown, isLoading: stateLoading } = useQuery<any>({
    queryKey: ["/api/analytics/elections", selectedElection, "by-state"],
    enabled: !!selectedElection && selectedElection !== "__all__",
  });

  const buildActivityUrl = () => {
    const params = new URLSearchParams();
    if (selectedElection && selectedElection !== "__all__") params.set("electionId", selectedElection);
    if (activityFilter !== "all") params.set("action", activityFilter);
    params.set("limit", "30");
    return `/api/analytics/agent-activity?${params}`;
  };

  const { data: activityData, isLoading: activityLoading } = useQuery<any>({
    queryKey: [buildActivityUrl()],
  });

  const buildSheetsUrl = () => {
    const params = new URLSearchParams();
    if (selectedElection && selectedElection !== "__all__") params.set("electionId", selectedElection);
    if (sheetFilter !== "all") params.set("verificationStatus", sheetFilter);
    params.set("limit", "30");
    return `/api/analytics/result-sheets?${params}`;
  };

  const { data: sheetsData, isLoading: sheetsLoading } = useQuery<any>({
    queryKey: [buildSheetsUrl()],
  });

  const dashboard = dashboardData?.data;
  const analytics = electionAnalytics?.data;
  const elections = electionsData?.data || [];
  const stateResults: StateResult[] | undefined = stateBreakdown?.data;

  useEffect(() => {
    const socket = io(window.location.origin, { transports: ["websocket", "polling"] });

    socket.on("connect", () => setIsLive(true));
    socket.on("disconnect", () => setIsLive(false));

    const handleResultUpdate = (data: any) => {
      setLiveEvents(prev => [{
        type: "result",
        time: new Date(),
        data,
      }, ...prev].slice(0, 20));

      queryClient.invalidateQueries({ queryKey: ["/api/analytics/election-dashboard"] });
      if (selectedElection && selectedElection !== "__all__") {
        queryClient.invalidateQueries({ queryKey: ["/api/analytics/elections", selectedElection] });
        queryClient.invalidateQueries({ queryKey: ["/api/analytics/elections", selectedElection, "by-state"] });
      }
    };

    const handleAgentActivity = (data: any) => {
      setLiveEvents(prev => [{
        type: "agent",
        time: new Date(),
        data,
      }, ...prev].slice(0, 20));
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/agent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/election-dashboard"] });
    };

    const handleSheetUpload = (data: any) => {
      setLiveEvents(prev => [{
        type: "sheet",
        time: new Date(),
        data,
      }, ...prev].slice(0, 20));
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/result-sheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/election-dashboard"] });
    };

    socket.on("general-election:result-updated", handleResultUpdate);
    socket.on("agent-activity:updated", handleAgentActivity);
    socket.on("result-sheet:uploaded", handleSheetUpload);

    return () => {
      socket.off("general-election:result-updated", handleResultUpdate);
      socket.off("agent-activity:updated", handleAgentActivity);
      socket.off("result-sheet:uploaded", handleSheetUpload);
      socket.disconnect();
    };
  }, [selectedElection]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/election-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/elections"] });
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/agent-activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/result-sheets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate("/admin/general-elections")} data-testid="button-back">
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Election Analytics</h1>
            <p className="text-sm text-muted-foreground">Monitor election results, agent activity, and result uploads</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            {isLive ? (
              <Badge variant="default" className="gap-1" data-testid="badge-live-status">
                <Radio className="w-3 h-3 animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1" data-testid="badge-offline-status">
                <WifiOff className="w-3 h-3" />
                Offline
              </Badge>
            )}
          </div>
          <Select value={selectedElection} onValueChange={setSelectedElection}>
            <SelectTrigger className="w-[280px]" data-testid="select-election">
              <SelectValue placeholder="Select an election" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Elections</SelectItem>
              {elections.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title} ({e.electionYear})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="outline" onClick={refreshAll} data-testid="button-refresh">
            <RefreshCw />
          </Button>
        </div>
      </div>

      {dashLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card data-testid="card-active-elections">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Vote className="w-4 h-4" />
                <span className="text-sm">Active Elections</span>
              </div>
              <p className="text-2xl font-bold" data-testid="text-active-elections-count">{dashboard.activeElections}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-total-agents">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm">Agents</span>
              </div>
              <p className="text-2xl font-bold">{dashboard.agents?.active || 0} <span className="text-sm font-normal text-muted-foreground">/ {dashboard.agents?.total || 0}</span></p>
              <p className="text-xs text-muted-foreground">active / total</p>
            </CardContent>
          </Card>
          <Card data-testid="card-recent-activity">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm">24h Activity</span>
              </div>
              <p className="text-2xl font-bold">{dashboard.recentActivity?.total || 0}</p>
              <p className="text-xs text-muted-foreground">{dashboard.recentActivity?.submissions || 0} submissions, {dashboard.recentActivity?.uploads || 0} uploads</p>
            </CardContent>
          </Card>
          <Card data-testid="card-result-sheets">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <FileCheck className="w-4 h-4" />
                <span className="text-sm">Result Sheets</span>
              </div>
              <p className="text-2xl font-bold">{dashboard.resultSheets?.total || 0}</p>
              <p className="text-xs text-muted-foreground">{dashboard.resultSheets?.verified || 0} verified, {dashboard.resultSheets?.pending || 0} pending</p>
            </CardContent>
          </Card>
        </div>
      )}

      {liveEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className="w-4 h-4 animate-pulse text-green-500" />
                Live Feed
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setLiveEvents([])} data-testid="button-clear-feed">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {liveEvents.slice(0, 8).map((evt, i) => (
                <Badge key={i} variant={evt.type === "result" ? "default" : evt.type === "agent" ? "secondary" : "outline"} className="shrink-0">
                  {evt.type === "result" && <Send className="w-3 h-3 mr-1" />}
                  {evt.type === "agent" && <Users className="w-3 h-3 mr-1" />}
                  {evt.type === "sheet" && <Upload className="w-3 h-3 mr-1" />}
                  {evt.type === "result" ? "Result update" : evt.type === "agent" ? "Agent activity" : "Sheet upload"}
                  <span className="text-xs ml-1 opacity-70">{formatTime(evt.time.toISOString())}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList data-testid="tabs-analytics">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="map" data-testid="tab-map">
            <Map className="w-4 h-4 mr-1" />
            Results Map
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
          <TabsTrigger value="agents" data-testid="tab-agents">Agent Activity</TabsTrigger>
          <TabsTrigger value="sheets" data-testid="tab-sheets">Result Sheets</TabsTrigger>
          <TabsTrigger value="states" data-testid="tab-states">By State</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {!selectedElection || selectedElection === "__all__" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Top Elections by Vote Count</h3>
              {dashboard?.topElections?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.topElections.map((el: any) => (
                    <Card key={el.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedElection(el.id)} data-testid={`card-election-${el.id}`}>
                      <CardContent className="p-4 flex flex-row flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{el.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {el.position_type} &middot; {el.election_year}
                            {el.state_name && ` &middot; ${el.state_name}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {el.candidates_count || 0} candidates
                            {el.registered_voters > 0 && ` &middot; ${Number(el.registered_voters).toLocaleString()} registered voters`}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">{Number(el.total_votes || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {el.total_votes > 0 ? "total votes" : "no votes yet"}
                              {el.reporting_pus > 0 && ` &middot; ${el.reporting_pus} PUs`}
                            </p>
                          </div>
                          <Badge variant={el.status === "ongoing" ? "default" : el.status === "completed" ? "secondary" : "outline"}>
                            {el.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No election data yet. Create elections and submit results to see analytics.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : electionLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : analytics ? (
            <div className="space-y-4">
              <Card data-testid="card-election-overview">
                <CardHeader>
                  <CardTitle className="flex flex-row flex-wrap items-center justify-between gap-2">
                    <span>{analytics.election.title}</span>
                    <Badge variant={analytics.election.status === "ongoing" ? "default" : "secondary"}>
                      {analytics.election.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Reporting Rate</p>
                      <p className="text-xl font-bold" data-testid="text-reporting-rate">{analytics.reporting.reportingRate}%</p>
                      <Progress value={analytics.reporting.reportingRate} className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">{analytics.reporting.reportedPollingUnits} / {analytics.reporting.totalPollingUnits} PUs</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Votes</p>
                      <p className="text-xl font-bold" data-testid="text-total-votes">{(analytics.votes.totalVotesCast || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Turnout: {analytics.votes.turnoutRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Agents</p>
                      <p className="text-xl font-bold">{analytics.agents?.active_agents || 0}</p>
                      <p className="text-xs text-muted-foreground">{analytics.agents?.result_submissions || 0} submissions</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Verification</p>
                      <p className="text-xl font-bold">{analytics.verification?.verified_results || 0} / {analytics.verification?.total_results || 0}</p>
                      <p className="text-xs text-muted-foreground">results verified</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-candidate-results">
                <CardHeader>
                  <CardTitle className="text-base">Candidate Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.candidates?.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.candidates.map((c: any, i: number) => {
                        const maxVotes = analytics.candidates[0]?.total_votes || 1;
                        const percentage = maxVotes > 0 ? Math.round((c.total_votes / (analytics.votes.totalVotesCast || 1)) * 100) : 0;
                        return (
                          <div key={c.candidate_id} className="flex items-center gap-3" data-testid={`row-candidate-${c.candidate_id}`}>
                            <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                            <div
                              className="w-3 h-8 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: c.party_color || "#888" }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-row flex-wrap items-center justify-between gap-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{c.candidate_name}</p>
                                  <Badge variant="outline" className="text-xs">{c.party_abbreviation}</Badge>
                                </div>
                                <p className="font-bold">{(c.total_votes || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">({percentage}%)</span></p>
                              </div>
                              <Progress value={(c.total_votes / maxVotes) * 100} className="h-2 mt-1" style={{ "--progress-color": c.party_color } as any} />
                              <p className="text-xs text-muted-foreground mt-0.5">{c.pus_reported} PUs reported</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No candidates or results yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Map className="h-4 w-4" />
                Election Results Map
                {isLive && <Badge variant="default" className="ml-auto gap-1"><Radio className="w-3 h-3 animate-pulse" /> Live</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ElectionResultsMap
                stateData={stateResults}
                isLoading={stateLoading}
                electionSelected={!!selectedElection && selectedElection !== "__all__"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {analytics?.candidates?.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Vote Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.candidates.map((c: any) => {
                    const percentage = analytics.votes.totalVotesCast > 0
                      ? Math.round((c.total_votes / analytics.votes.totalVotesCast) * 1000) / 10
                      : 0;
                    return (
                      <Card key={c.candidate_id} data-testid={`card-vote-dist-${c.candidate_id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.party_color || "#888" }} />
                            <span className="font-medium text-sm truncate">{c.candidate_name}</span>
                          </div>
                          <p className="text-2xl font-bold">{(c.total_votes || 0).toLocaleString()}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{c.party_abbreviation}</Badge>
                            <span className="text-sm text-muted-foreground">{percentage}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Registered Voters</p>
                      <p className="text-xl font-bold">{(analytics.votes.totalRegisteredVoters || 0).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Accredited Voters</p>
                      <p className="text-xl font-bold">{(analytics.votes.totalAccreditedVoters || 0).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Voter Turnout</p>
                      <p className="text-xl font-bold">{analytics.votes.turnoutRate}%</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {selectedElection && selectedElection !== "__all__" ? (
                  <>
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No results submitted for this election yet</p>
                  </>
                ) : (
                  <>
                    <Vote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select an election to view detailed results</p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="flex flex-row flex-wrap items-center justify-between gap-3 mb-2">
            <h3 className="text-lg font-semibold">Agent Activity Feed</h3>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-activity-filter">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Logins</SelectItem>
                <SelectItem value="check_in">Check-ins</SelectItem>
                <SelectItem value="submit_results">Result Submissions</SelectItem>
                <SelectItem value="submit_results_batch">Batch Submissions</SelectItem>
                <SelectItem value="upload_result_sheet">Sheet Uploads</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activityLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : activityData?.data?.length > 0 ? (
            <div className="space-y-2">
              {activityData.data.map((log: any) => (
                <Card key={log.id} data-testid={`card-activity-${log.id}`}>
                  <CardContent className="p-3 flex flex-row flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <ActionIcon action={log.action} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{log.agent_name || "Unknown Agent"}</span>
                          <ActionBadge action={log.action} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {log.polling_unit_name || log.polling_unit_code || "Unknown PU"}
                          {log.election_title && ` · ${log.election_title}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{formatTime(log.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {activityData.pagination?.totalPages > 1 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  Showing {activityData.data.length} of {activityData.pagination.total} activities
                </p>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No agent activity recorded yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sheets" className="space-y-4">
          <div className="flex flex-row flex-wrap items-center justify-between gap-3 mb-2">
            <h3 className="text-lg font-semibold">Result Sheets</h3>
            <Select value={sheetFilter} onValueChange={setSheetFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-sheet-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sheets</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sheetsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : sheetsData?.data?.length > 0 ? (
            <div className="space-y-2">
              {sheetsData.data.map((sheet: any) => (
                <Card key={sheet.id} data-testid={`card-sheet-${sheet.id}`}>
                  <CardContent className="p-3 flex flex-row flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{sheet.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded by {sheet.uploader_name || "Unknown"} · {sheet.polling_unit_name || sheet.polling_unit_code || "Unknown PU"}
                        </p>
                        {sheet.election_title && (
                          <p className="text-xs text-muted-foreground">{sheet.election_title}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sheet.is_verified === true ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{formatTime(sheet.uploaded_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No result sheets uploaded yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="states" className="space-y-4">
          {selectedElection && selectedElection !== "__all__" && stateResults && stateResults.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">State-Level Breakdown</h3>
              <div className="grid gap-3">
                {stateResults.map((s: any) => (
                  <Card key={s.state_id} data-testid={`card-state-${s.state_id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{s.state_name}</span>
                          {s.leading_party_abbreviation && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.leading_party_color || "#888" }} />
                              {s.leading_party_abbreviation}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <p className="font-bold">{(s.total_votes || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">votes</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{s.reported_pus} / {s.total_pus}</p>
                            <p className="text-xs text-muted-foreground">PUs</p>
                          </div>
                          <div className="w-16">
                            <Progress value={s.total_pus > 0 ? (s.reported_pus / s.total_pus) * 100 : 0} className="h-2" />
                            <p className="text-xs text-muted-foreground text-center">
                              {s.total_pus > 0 ? Math.round((s.reported_pus / s.total_pus) * 100) : 0}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{selectedElection && selectedElection !== "__all__" ? "No state-level data available" : "Select a specific election to view state breakdown"}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
