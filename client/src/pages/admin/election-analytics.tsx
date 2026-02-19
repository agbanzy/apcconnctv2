import { useState } from "react";
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
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

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

export default function ElectionAnalytics() {
  const [, navigate] = useLocation();
  const [selectedElection, setSelectedElection] = useState<string>("");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [sheetFilter, setSheetFilter] = useState<string>("all");

  const { data: dashboardData, isLoading: dashLoading } = useQuery<any>({
    queryKey: ["/api/analytics/dashboard"],
  });

  const { data: electionsData } = useQuery<any>({
    queryKey: ["/api/general-elections"],
  });

  const { data: electionAnalytics, isLoading: electionLoading } = useQuery<any>({
    queryKey: ["/api/analytics/elections", selectedElection],
    enabled: !!selectedElection,
  });

  const { data: stateBreakdown } = useQuery<any>({
    queryKey: ["/api/analytics/elections", selectedElection, "by-state"],
    enabled: !!selectedElection,
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

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList data-testid="tabs-analytics">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
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
                        <div>
                          <p className="font-medium">{el.title}</p>
                          <p className="text-sm text-muted-foreground">{el.position_type} &middot; {el.election_year}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">{(el.total_votes || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{el.reporting_pus} PUs reporting</p>
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
                <SelectItem value="rejected">Rejected</SelectItem>
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
                      {sheet.verification_status === "verified" && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </Badge>
                      )}
                      {sheet.verification_status === "pending" && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </Badge>
                      )}
                      {sheet.verification_status === "rejected" && (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" /> Rejected
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
          {selectedElection && selectedElection !== "__all__" && stateBreakdown?.data?.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">State-Level Breakdown</h3>
              <div className="grid gap-3">
                {stateBreakdown.data.map((s: any) => (
                  <Card key={s.state_id} data-testid={`card-state-${s.state_id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{s.state_name}</span>
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
